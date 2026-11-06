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

#pragma once

#include <JavaScriptCore/Allocator.h>
#include <JavaScriptCore/BrandedStructure.h>
#include <JavaScriptCore/JSFunction.h>

#if ENABLE(JS_STRUCTS)

namespace JSC {

class JSStructConstructor final : public JSFunction {
public:
    using Base = JSFunction;
    static constexpr unsigned StructureFlags = Base::StructureFlags;

    template<typename CellType, SubspaceAccess mode>
    static GCClient::IsoSubspace* subspaceFor(VM& vm)
    {
        return vm.structConstructorSpace<mode>();
    }

    static JSStructConstructor* create(VM&, JSGlobalObject*, JSFunction* templateFunction, JSStructConstructor* parent, JSFunction* initializer);
    static Structure* createStructure(VM&, JSGlobalObject*, JSValue prototype);

    BrandedStructure* instanceStructure() const { return uncheckedDowncast<BrandedStructure>(m_instanceStructure.get()); }

    JSStructConstructor* parent() const { return m_parent.get(); }

    JSFunction* initializer() const { return m_initializer.get(); }

    void defineInstanceStructure(VM&, BrandedStructure*);

    static bool canAllocateInline(Structure* structure) { return !structure->outOfLineSize() && !hasIndexedProperties(structure->indexingType()); }

    JSObject* createInstance(VM&);

    static constexpr ptrdiff_t offsetOfInstanceAllocator() { return OBJECT_OFFSETOF(JSStructConstructor, m_instanceAllocator); }
    static constexpr ptrdiff_t offsetOfInstanceHeader() { return OBJECT_OFFSETOF(JSStructConstructor, m_instanceHeader); }
    static constexpr ptrdiff_t offsetOfInstanceStructureID() { return offsetOfInstanceHeader() + OBJECT_OFFSETOF(InstanceHeader, structureID); }
    static constexpr ptrdiff_t offsetOfInstanceTypeInfoBlob() { return offsetOfInstanceHeader() + OBJECT_OFFSETOF(InstanceHeader, typeInfoBlob); }
    static constexpr ptrdiff_t offsetOfInstanceInlineFieldCount() { return OBJECT_OFFSETOF(JSStructConstructor, m_instanceInlineFieldCount); }

    DECLARE_EXPORT_INFO;
    DECLARE_VISIT_CHILDREN;

private:
    friend class LLIntOffsetsExtractor;

    JSStructConstructor(VM&, FunctionExecutable*, JSScope*, Structure*, JSStructConstructor* parent, JSFunction* initializer);

    DECLARE_DEFAULT_FINISH_CREATION;

    Allocator m_instanceAllocator;
    struct alignas(8) InstanceHeader {
        uint32_t structureID { 0 };
        uint32_t typeInfoBlob { 0 };
    };
    static_assert(sizeof(InstanceHeader) == sizeof(uint64_t));
    InstanceHeader m_instanceHeader;
    uint32_t m_instanceInlineFieldCount { 0 };
    WriteBarrierStructureID m_instanceStructure;
    WriteBarrier<JSStructConstructor> m_parent;
    WriteBarrier<JSFunction> m_initializer;
};

JSC_DECLARE_HOST_FUNCTION(structCreateConstructor);
JSC_DECLARE_HOST_FUNCTION(structSuperInitializer);
JSC_DECLARE_HOST_FUNCTION(structDefineInstances);
JSC_DECLARE_HOST_FUNCTION(structSeal);

} // namespace JSC

#endif // ENABLE(JS_STRUCTS)
