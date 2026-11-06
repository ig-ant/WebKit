//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-object-has-instance.js in V8.
// The license is in resources/v8-mjsunit.js.
// Unshared structs have no Symbol.hasInstance method of their own.

"use strict";

load("./resources/v8-mjsunit.js", "caller relative");

struct S1 { field; }
struct S2 { other_field; }
struct S3 { field; }
let other_obj = {'field': 42};

function OtherConstructor(val) {
  return {'val': val + 1};
}

function BuildPrototypeChain(base_obj) {
  let proto = {};
  Object.setPrototypeOf(proto, base_obj);
  for (let i = 0; i < 10; i++) {
    let temp = Object.create(proto);
    proto = temp;
  }

  const handler = {};

  for (let i = 0; i < 10; i++) {
    let temp = new Proxy(proto, handler);
    proto = temp;
  }

  return proto;
}

(function TestStructHasInstance() {
  let s1 = new S1();

  // Returns true for the original constructor.
  assertTrue(s1 instanceof S1);
  // Returns false for a struct with different fields.
  assertFalse(s1 instanceof S2);
  // Returns false for a different struct with the same fields.
  assertFalse(s1 instanceof S3);
  // Returns false for a different object.
  assertFalse(other_obj instanceof S1);
  // Returns false for a different constructor.
  assertFalse(s1 instanceof OtherConstructor);
  // Returns true if the struct is in the prototype chain.
  assertTrue(BuildPrototypeChain(s1) instanceof S1);
})();

(function TestCallHasInstance() {
  let s1 = new S1();
  // Returns true when calling with the correct constructor as the receiver.
  assertTrue(S1[Symbol.hasInstance].call(S1, s1));
  assertTrue(S2[Symbol.hasInstance].call(S1, s1));
  // Returns false when calling with another constructor as the receiver.
  assertFalse(S1[Symbol.hasInstance].call(OtherConstructor, s1));
  // Returns false when calling with a non-function as receiver.
  assertFalse(S1[Symbol.hasInstance].call({}, s1));
})();

(function TestInheritHasInstance() {
  function func() {};
  const s1 = new S1();
  Object.setPrototypeOf(func, S1);
  assertFalse(s1 instanceof func);
})();
