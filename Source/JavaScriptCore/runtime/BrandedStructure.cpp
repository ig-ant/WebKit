/*
 * Copyright (C) 2021 Apple Inc. All rights reserved.
 * Copyright (C) 2021 Igalia S.A. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */

#include "config.h"
#include "BrandedStructure.h"

#include "JSCInlines.h"

namespace JSC {

BrandedStructure::BrandedStructure(VM& vm, Structure* previous, UniquedStringImpl* brandUid)
    : Structure(vm, StructureVariant::Branded, previous)
    , m_brand(brandUid)
    , m_parentBrand(previous->isBrandedStructure() ? previous : nullptr, WriteBarrierEarlyInit)
{
    ASSERT(isBrandedStructure());
}

BrandedStructure::BrandedStructure(VM& vm, BrandedStructure* previous)
    : Structure(vm, StructureVariant::Branded, previous)
    , m_brand(previous->m_brand)
    , m_parentBrand(previous->m_parentBrand.get(), WriteBarrierEarlyInit)
{
    ASSERT(isBrandedStructure());
}

#if ENABLE(JS_STRUCTS)
BrandedStructure::BrandedStructure(VM& vm, JSGlobalObject* globalObject, JSValue prototype, IndexingType indexingType, unsigned inlineCapacity, UniquedStringImpl* brandUid, BrandedStructure* parent)
    : Structure(vm, globalObject, prototype, JSFinalObject::typeInfo(), JSFinalObject::info(), indexingType, inlineCapacity)
    , m_brand(brandUid)
    , m_parentBrand(parent, WriteBarrierEarlyInit)
{
    m_structureVariant = StructureVariant::Branded;
    ASSERT(isBrandedStructure());
}

BrandedStructure* BrandedStructure::createForStruct(VM& vm, JSGlobalObject* globalObject, JSValue prototype, std::span<const StructField> fields, FixedVector<uint32_t>&& indexedFields, Symbol* brand, BrandedStructure* parent)
{
    ASSERT(vm.structureStructure);
    ASSERT(!parent || parent->isStructInstance());

    if (auto* object = prototype.getObject())
        object->didBecomePrototype(vm);

    // Having a bad time transitions objects with any other kind of indexed storage.
    IndexingType indexingType = indexedFields.isEmpty() ? JSFinalObject::defaultIndexingType : NonArrayWithSlowPutArrayStorage;
    unsigned inlineCapacity = std::min<size_t>(fields.size(), JSFinalObject::maxInlineCapacity);
    auto* structure = new (NotNull, allocateCell<BrandedStructure>(vm)) BrandedStructure(vm, globalObject, prototype, indexingType, inlineCapacity, &brand->uid(), parent);
    structure->finishCreation(vm);
    structure->m_indexedFields = WTF::move(indexedFields);

    // This Structure has no previous one to rebuild the property table from, so the table stays pinned.
    for (auto& field : fields) {
        structure->addPropertyWithoutTransition(vm, PropertyName(field.name), field.attributes, [&](const GCSafeConcurrentJSLocker&, PropertyOffset, PropertyOffset newMaxOffset) {
            structure->setMaxOffset(vm, newMaxOffset);
        });
    }

    structure->setDidPreventExtensions(true);
    structure->setMayBePrototype(true);
    structure->setIsStructInstance(true);
    return structure;
}
#endif

Structure* BrandedStructure::create(VM& vm, Structure* previous, UniquedStringImpl* brandUid, DeferredStructureTransitionWatchpointFire* deferred)
{
    ASSERT(vm.structureStructure);
    BrandedStructure* newStructure = new (NotNull, allocateCell<BrandedStructure>(vm)) BrandedStructure(vm, previous, brandUid);
    newStructure->finishCreation(vm, previous, deferred);
    ASSERT(newStructure->type() == StructureType);
    return newStructure;
}

} // namespace JSC
