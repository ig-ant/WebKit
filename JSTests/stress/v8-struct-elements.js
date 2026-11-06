//@ requireOptions("--useStructs=1")
// Copyright 2022 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-array-surface.js in V8.
// The license is in resources/v8-mjsunit.js.
// There is no SharedArray, so this uses a struct with the same fields.

"use strict";

load("./resources/v8-mjsunit.js", "caller relative");

(function TestPrimitives() {
  let test_values =
      [42, -0, Math.random(), undefined, null, true, false, 'foo'];
  struct Elements { 0; 1; 2; 3; 4; 5; 6; 7; length; }
  let arr = new Elements();
  let i = 0;
  for (let prim of test_values) {
    arr[i] = prim;
    assertEquals(arr[i], prim);
    i++;
  }
})();

struct Pair { 0; 1; length = 2; }

(function TestObjects() {
  let arr = new Pair();
  for (let rhs of [[], {}, arr]) {
    arr[0] = rhs;
    assertSame(arr[0], rhs);
  }
})();

(function TestNotExtensible() {
  let arr = new Pair();
  assertThrows(() => {
    arr[2] = 42;
  });
  assertThrows(() => {
    Object.setPrototypeOf(arr, {});
  });
  assertThrows(() => {
    Object.defineProperty(arr, 'nonExistent', {value: 42});
  });
})();

(function TestOwnPropertyEnumeration() {
  let arr = new Pair();
  arr[0] = 42;

  assertEquals(2, arr.length);

  let propDescs = Object.getOwnPropertyDescriptors(arr);
  let desc = propDescs[0];
  assertEquals(true, desc.writable);
  assertEquals(false, desc.configurable);
  assertEquals(true, desc.enumerable);
  assertEquals(42, desc.value);

  let vals = Object.values(arr);
  assertArrayEquals([42, undefined, 2], vals);

  let entries = Object.entries(arr);
  assertEquals(3, entries.length);
  assertArrayEquals(['0', 42], entries[0]);
})();

(function TestForIn() {
  struct TwoElements { 0; 1; }
  let i = 0;
  for (let index in new TwoElements()) {
    assertEquals(index, String(i));
    i++;
  }
  assertEquals(2, i);
})();

(function TestProxyLengthGetter() {
  let a = new Pair();
  let proxy = new Proxy(a, {});
  assertEquals(2, proxy.length);
})();
