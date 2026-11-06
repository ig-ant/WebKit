//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-array-concat.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

(function TestArrayConcatStructOnArrayProto() {
  struct Indexed { 0 = 1; 1 = 2; }
  let s = new Indexed();
  Object.defineProperty(
      Array.prototype, 0, {writable: true, enumerable: true, configurable: true, value: 42});
  assertEquals(0, Object.setPrototypeOf(Array.prototype, s).concat().length - Array.prototype.length);
  assertEquals(42, [,][0]);
  assertEquals(2, [,,][1]);
  assertArrayEquals([42, 2, 5], [,,5].concat());
  delete Array.prototype[0];
  assertEquals(1, [,][0]);
  assertArrayEquals([1, 2, 5], Array.prototype.slice.call([,,5]));
  Object.setPrototypeOf(Array.prototype, Object.prototype);
  assertEquals(undefined, [,][0]);
})();
