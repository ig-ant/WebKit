//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
// Copyright 2022 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-struct-atomics.js in V8.
// The license is in resources/v8-mjsunit.js.
// Unshared structs do not support Atomics, so this uses plain accesses.

"use strict";

load("./resources/v8-mjsunit.js", "caller relative");

struct S { field; '2'; }

(function TestAtomicsThrow() {
  let s = new S();
  assertThrows(() => Atomics.load(s, 'field'), TypeError);
  assertThrows(() => Atomics.store(s, 'field', 1), TypeError);
  assertThrows(() => Atomics.exchange(s, '2', 1), TypeError);
  assertThrows(() => Atomics.compareExchange(s, 2, 1, 2), TypeError);
  assertSame(undefined, s.field);
  assertSame(undefined, s[2]);
})();

(function TestPrimitives() {
  // All primitives can be stored in fields.
  let s = new S();
  const prims = [42, -0, undefined, null, true, false, "foo"];

  for (let prim1 of prims) {
    for (let prim2 of prims) {
      s.field = prim1;
      s[2] = prim1;
      assertEquals(s.field, prim1);
      assertEquals(s[2], prim1);
      s.field = prim2;
      s['2'] = prim2;
      assertEquals(s.field, prim2);
      assertEquals(s[2], prim2);
    }
  }
})();

(function TestNumbers() {
  let source = 'struct ST { 2;';
  for (let i = 1; i < 999; i++) {
    source += `field${i};`;
  }
  let s = new (eval(source + '} ST'));
  let keys = ['field1', 2, 'field998'];

  for (let i = 0; i < 1000; i++) {
    for (let key of keys) {
      s[key] = 0;
      assertEquals(0, s[key]);
      s[key] = 1.5 + i;
      assertEquals(1.5 + i, s[key]);
      s[key] = 'success';
      assertEquals('success', s[key]);
    }
  }
})();
