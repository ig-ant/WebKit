//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
// Copyright 2022 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-struct-surface.js in V8.
// The license is in resources/v8-mjsunit.js.

"use strict";

load("./resources/v8-mjsunit.js", "caller relative");

struct S { field; }

function MakeStruct(fieldNames) {
  return eval('struct Made {' + fieldNames.map(name => `[${JSON.stringify(name)}];`).join('') + '} Made');
}

(function TestPrototype() {
  assertSame(S.prototype, Object.getPrototypeOf(new S()));
  assertSame(Object.prototype, Object.getPrototypeOf(S.prototype));
  assertThrows(() => {
    S.prototype = {};
  });
})();

(function TestPrimitives() {
  // All primitives can be stored in fields.
  let s = new S();
  for (let prim of [42, -0, Math.random(),
                    undefined, null, true, false,
                    "foo"]) {
    s.field = prim;
    assertEquals(s.field, prim);
  }
})();

(function TestObjects() {
  let s = new S();
  for (let rhs of [[], {}, new S(), s, function() {}]) {
    s.field = rhs;
    assertSame(s.field, rhs);
  }
})();

(function TestNotExtensible() {
  let s = new S();
  // Structs are non-extensible.
  assertThrows(() => { s.nonExistent = 42; });
  assertThrows(() => { Object.setPrototypeOf(s, {}); });
  assertThrows(() => { Object.defineProperty(s, 'nonExistent', { value: 42 }); });
})();

(function TestTooManyFields() {
  let fieldNames = [];
  for (let i = 0; i < 16385; i++) {
    fieldNames.push('field' + i);
  }
  assertThrows(() => {
    MakeStruct(fieldNames);
  });
})();

(function TestOwnPropertyEnumeration() {
  let s = new S();
  s.field = 42;

  assertArrayEquals(['field'], Reflect.ownKeys(s));

  let propDescs = Object.getOwnPropertyDescriptors(s);
  let desc = propDescs['field'];
  assertEquals(true, desc.writable);
  assertEquals(false, desc.configurable);
  assertEquals(true, desc.enumerable);
  assertEquals(42, desc.value);

  let vals = Object.values(s);
  assertArrayEquals([42], vals);

  let entries = Object.entries(s);
  assertEquals(1, entries.length);
  assertArrayEquals(['field', 42], entries[0]);
})();

(function TestForIn() {
  let fieldNames = [];
  for (let i = 0; i < 512; i++) {
    fieldNames.push('field' + i);
  }
  let S2 = MakeStruct(fieldNames);
  let s = new S2();
  let propNames = [];
  for (let prop in s) propNames.push(prop);
  assertArrayEquals(propNames, fieldNames);
})();

(function TestDuplicateFieldNames() {
  // A struct declaration allows this, like a class.
  struct Same { same = 1; same = 2; }
  let s = new Same();
  assertArrayEquals(['same'], Reflect.ownKeys(s));
  assertEquals(2, s.same);
})();

(function TestNoFields() {
  struct EmptyStruct { }
  let s = new EmptyStruct();
  assertArrayEquals([], Reflect.ownKeys(s));
})();

(function TestSymbols() {
  const symbol = Symbol();
  struct S { [symbol] = 1; }
  assertEquals(1, new S()[symbol]);
})();

(function TestUsedAsPrototype() {
  struct OnPrototypeStruct { prop; }
  let ps = new OnPrototypeStruct();
  ps.prop = "on proto";

  function assertProtoIsStruct(obj, proto) {
    assertSame(proto, obj.__proto__);
    assertSame(proto, Object.getPrototypeOf(obj));
    assertEquals("on proto", obj.prop);
  }

  {
    let pojo = { __proto__: ps };
    assertProtoIsStruct(pojo, ps);
  }

  {
    let pojo = {};
    Object.setPrototypeOf(pojo, ps);
    assertProtoIsStruct(pojo, ps);
  }

  {
    let pojo = {};
    pojo.__proto__ = ps;
    assertProtoIsStruct(pojo, ps);
  }

  {
    // The prototype of the global object is immutable in JSC.
    assertThrows(() => { globalThis.__proto__ = ps; });
  }

  {
    Object.create(ps);
  }

  {
    function Ctor() {}
    Ctor.prototype = ps;
  }
})();

(function TestElements() {
  const largeIndex = 2 ** 32;
  const anotherLargeIndex = 2 ** 31;
  struct StructWithElements {
    1;
    42;
    [largeIndex];
    [anotherLargeIndex];
  }
  let s = new StructWithElements();
  s[1] = 0.1;
  s[42] = 42;
  s[largeIndex] = 'whatever';
  s[anotherLargeIndex] = 'whatever2';
  assertEquals(0.1, s[1]);
  assertEquals(42, s[42]);
  assertEquals('whatever', s[largeIndex]);
  assertEquals('whatever2', s[anotherLargeIndex]);
  assertThrows(() => s[80] = 0.2);
})();
