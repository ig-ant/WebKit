/*
 * Copyright (C) 2026 Anthropic PBC.
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
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS ``AS IS''
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */

#include "config.h"
#include "JSStructConstructor.h"

#if ENABLE(JS_STRUCTS)

#include "AllocatorInlines.h"
#include "BrandedStructure.h"
#include "BuiltinNames.h"
#include "ButterflyInlines.h"
#include "FunctionExecutableInlines.h"
#include "FunctionPrototype.h"
#include "JSCInlines.h"
#include "ObjectConstructor.h"
#include "SparseArrayValueMap.h"
#include "SubspaceInlines.h"
#include <algorithm>

namespace JSC {

const ClassInfo JSStructConstructor::s_info = { "Function"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSStructConstructor) };

JSStructConstructor::JSStructConstructor(VM& vm, FunctionExecutable* executable, JSScope* scope, Structure* structure, JSStructConstructor* parent, JSFunction* initializer)
    : Base(vm, executable, scope, structure)
    , m_parent(parent, WriteBarrierEarlyInit)
    , m_initializer(initializer, WriteBarrierEarlyInit)
{
}

JSStructConstructor* JSStructConstructor::create(VM& vm, JSGlobalObject* globalObject, JSFunction* templateFunction, JSStructConstructor* parent, JSFunction* initializer)
{
    auto scope = DECLARE_THROW_SCOPE(vm);

    FunctionExecutable* executable = templateFunction->jsExecutable();
    Structure* structure = parent ? createStructure(vm, globalObject, parent) : globalObject->structConstructorStructure();
    auto* constructor = new (NotNull, allocateCell<JSStructConstructor>(vm)) JSStructConstructor(vm, executable, templateFunction->scope(), structure, parent, initializer);
    constructor->finishCreation(vm);

    executable->singleton().replaceUnobservedValue(vm, executable, templateFunction, constructor);

    constructor->reifyLazyPropertyIfNeeded(vm, globalObject, vm.propertyNames->length);
    RETURN_IF_EXCEPTION(scope, nullptr);
    constructor->putDirect(vm, vm.propertyNames->length, jsNumber(0), PropertyAttribute::DontEnum | PropertyAttribute::ReadOnly);
    constructor->reifyLazyPropertyIfNeeded(vm, globalObject, vm.propertyNames->name);
    RETURN_IF_EXCEPTION(scope, nullptr);
    return constructor;
}

Structure* JSStructConstructor::createStructure(VM& vm, JSGlobalObject* globalObject, JSValue prototype)
{
    ASSERT(globalObject);
    return Structure::create(vm, globalObject, prototype, TypeInfo(JSFunctionType, StructureFlags), info());
}

template<typename Visitor>
void JSStructConstructor::visitChildrenImpl(JSCell* cell, Visitor& visitor)
{
    auto* thisObject = uncheckedDowncast<JSStructConstructor>(cell);
    ASSERT_GC_OBJECT_INHERITS(thisObject, info());
    Base::visitChildren(thisObject, visitor);
    visitor.append(thisObject->m_instanceStructure);
    visitor.append(thisObject->m_parent);
    visitor.append(thisObject->m_initializer);
}

DEFINE_VISIT_CHILDREN(JSStructConstructor);

void JSStructConstructor::defineInstanceStructure(VM& vm, BrandedStructure* structure)
{
    RELEASE_ASSERT(!m_instanceStructure);
    RELEASE_ASSERT(structure->isStructInstance());

    if (canAllocateInline(structure)) {
        static_assert(!JSCell::structureIDOffset());
        static_assert(JSCell::indexingTypeAndMiscOffset() == sizeof(uint32_t));
        m_instanceInlineFieldCount = structure->inlineSize();
        m_instanceHeader.structureID = structure->id().bits();
        m_instanceHeader.typeInfoBlob = structure->typeInfoBlob();
        if (!Options::forceGCSlowPaths())
            m_instanceAllocator = JSC::subspaceFor<JSFinalObject>(vm)->allocatorFor(JSFinalObject::allocationSize(structure->inlineCapacity()), AllocatorForMode::EnsureAllocator);
    }

    // The compilers read the rest of this cell only once they can see the structure.
    WTF::storeStoreFence();
    m_instanceStructure.set(vm, this, structure);
}

JSObject* JSStructConstructor::createInstance(VM& vm)
{
    BrandedStructure* structure = instanceStructure();
    RELEASE_ASSERT(structure);

    // DFGStoreBarrierInsertionPhase requires that there is no GC safepoint after the result is allocated, so it comes last.
    JSFinalObject* result;
    if (auto& indexedFields = structure->indexedFields(); !indexedFields.isEmpty()) {
        auto* map = SparseArrayValueMap::create(vm);
        EnsureStillAliveScope keepAlive { map };
        map->setSparseMode();
        for (uint32_t index : indexedFields)
            map->add(map, index).iterator->forceSet(vm, map, jsUndefined(), static_cast<unsigned>(PropertyAttribute::DontDelete));
        Butterfly* butterfly = createArrayStorageButterfly(vm, nullptr, structure, indexedFields.last() + 1, 0);
        result = JSFinalObject::createWithButterfly(vm, structure, butterfly);
        butterfly->arrayStorage()->m_sparseMap.set(vm, result, map);
    } else if (unsigned outOfLineCapacity = structure->outOfLineCapacity()) {
        Butterfly* butterfly = Butterfly::create(vm, nullptr, 0, outOfLineCapacity, false, IndexingHeader(), 0);
        result = JSFinalObject::createWithButterfly(vm, structure, butterfly);
    } else
        result = JSFinalObject::create(vm, structure);

    for (unsigned i = 0; i < structure->inlineSize(); ++i)
        result->putDirectOffset(vm, i, jsUndefined());
    for (unsigned i = 0; i < structure->outOfLineSize(); ++i)
        result->putDirectOffset(vm, firstOutOfLineOffset + i, jsUndefined());
    return result;
}

static BrandedStructure* tryCreateInstanceStructure(JSGlobalObject* globalObject, JSStructConstructor* constructor, JSObject* prototype, Symbol* brand, const ArgList& fieldNames)
{
    VM& vm = globalObject->vm();
    auto scope = DECLARE_THROW_SCOPE(vm);

    Vector<BrandedStructure::StructField, 16> fields;
    Vector<Identifier, 16> identifiers;
    UncheckedKeyHashSet<UniquedStringImpl*> seen;

    auto append = [&](const Identifier& name, unsigned attributes) {
        if (!seen.add(name.impl()).isNewEntry)
            return;
        identifiers.append(name);
        fields.append({ name.impl(), attributes });
    };

    Vector<uint32_t> indexedFields;

    BrandedStructure* parentStructure = nullptr;
    if (auto* parent = constructor->parent()) {
        parentStructure = parent->instanceStructure();
        RELEASE_ASSERT(parentStructure);
        parentStructure->forEachProperty(vm, [&](const PropertyTableEntry& entry) -> bool {
            append(Identifier::fromUid(vm, entry.key()), entry.attributes());
            return true;
        });
        indexedFields.append(parentStructure->indexedFields().span());
    }

    for (size_t i = 0; i < fieldNames.size(); ++i) {
        auto name = fieldNames.at(i).toPropertyKey(globalObject);
        RETURN_IF_EXCEPTION(scope, nullptr);

        if (auto index = parseIndex(name)) [[unlikely]] {
            indexedFields.append(index.value());
            continue;
        }

        unsigned attributes = PropertyName(name).isPrivateName() ? static_cast<unsigned>(PropertyAttribute::None) : static_cast<unsigned>(PropertyAttribute::DontDelete);
        append(name, attributes);
    }

    std::ranges::sort(indexedFields);
    indexedFields.shrink(std::ranges::unique(indexedFields).begin() - indexedFields.begin());

    static constexpr size_t maxFields = 1 << 14;
    if (fields.size() + indexedFields.size() > maxFields) [[unlikely]] {
        throwTypeError(globalObject, scope, "A struct has too many fields"_s);
        return nullptr;
    }

    return BrandedStructure::createForStruct(vm, globalObject, prototype, fields.span(), FixedVector<uint32_t>(WTF::move(indexedFields)), brand, parentStructure);
}

JSC_DEFINE_HOST_FUNCTION(structCreateConstructor, (JSGlobalObject* globalObject, CallFrame* callFrame))
{
    VM& vm = globalObject->vm();
    auto scope = DECLARE_THROW_SCOPE(vm);

    auto* templateFunction = uncheckedDowncast<JSFunction>(callFrame->uncheckedArgument(0));
    auto* initializer = uncheckedDowncast<JSFunction>(callFrame->uncheckedArgument(1));
    bool hasHeritage = callFrame->uncheckedArgument(2).asBoolean();

    JSStructConstructor* parent = nullptr;
    if (hasHeritage) {
        JSValue superclass = callFrame->uncheckedArgument(3);
        if (!superclass.isNull()) {
            parent = superclass.isCell() ? dynamicDowncast<JSStructConstructor>(superclass.asCell()) : nullptr;
            if (!parent) [[unlikely]]
                return throwVMTypeError(globalObject, scope, "A struct can only extend another struct or null"_s);
            if (!parent->instanceStructure()) [[unlikely]]
                return throwVMTypeError(globalObject, scope, "The definition of the extended struct is not complete"_s);
        }
    }

    RELEASE_AND_RETURN(scope, JSValue::encode(JSStructConstructor::create(vm, globalObject, templateFunction, parent, initializer)));
}

JSC_DEFINE_HOST_FUNCTION(structSuperInitializer, (JSGlobalObject*, CallFrame* callFrame))
{
    auto* constructor = uncheckedDowncast<JSStructConstructor>(callFrame->uncheckedArgument(0));
    if (auto* parent = constructor->parent())
        return JSValue::encode(parent->initializer());
    return JSValue::encode(jsNull());
}

JSC_DEFINE_HOST_FUNCTION(structDefineInstances, (JSGlobalObject* globalObject, CallFrame* callFrame))
{
    VM& vm = globalObject->vm();
    auto scope = DECLARE_THROW_SCOPE(vm);

    auto* constructor = uncheckedDowncast<JSStructConstructor>(callFrame->uncheckedArgument(0));
    auto* prototype = asObject(callFrame->uncheckedArgument(1));
    auto* brand = asSymbol(callFrame->uncheckedArgument(2));
    JSValue fieldInitializer = callFrame->uncheckedArgument(3);

    auto* structure = tryCreateInstanceStructure(globalObject, constructor, prototype, brand, ArgList(callFrame, 4));
    RETURN_IF_EXCEPTION(scope, { });

    const auto& name = vm.propertyNames->builtinNames().instanceFieldInitializerPrivateName();
    JSValue parentFieldInitializer = jsUndefined();
    if (auto* parent = constructor->parent())
        parentFieldInitializer = parent->getDirect(vm, name);
    if (fieldInitializer.isUndefined())
        fieldInitializer = parentFieldInitializer;
    else
        asObject(fieldInitializer)->putDirect(vm, name, parentFieldInitializer);
    constructor->putDirect(vm, name, fieldInitializer);

    constructor->defineInstanceStructure(vm, structure);
    return JSValue::encode(jsUndefined());
}

JSC_DEFINE_HOST_FUNCTION(structSeal, (JSGlobalObject* globalObject, CallFrame* callFrame))
{
    VM& vm = globalObject->vm();
    auto scope = DECLARE_THROW_SCOPE(vm);

    objectConstructorSeal(globalObject, asObject(callFrame->uncheckedArgument(1)));
    RETURN_IF_EXCEPTION(scope, { });
    objectConstructorSeal(globalObject, asObject(callFrame->uncheckedArgument(0)));
    RETURN_IF_EXCEPTION(scope, { });
    return JSValue::encode(jsUndefined());
}

} // namespace JSC

#endif // ENABLE(JS_STRUCTS)
