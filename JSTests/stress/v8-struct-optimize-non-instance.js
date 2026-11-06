//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/optimize-non-instance.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

function Foo() {}

function TestInstanceOfStruct() {
  struct S { foo; }
  return Foo instanceof S;
}
noInline(TestInstanceOfStruct);

struct Outer { foo; }
function TestInstanceOfOuterStruct() {
  return Foo instanceof Outer;
}
noInline(TestInstanceOfOuterStruct);

for (let i = 0; i < testLoopCount; i++) {
  assertFalse(TestInstanceOfStruct());
  assertFalse(TestInstanceOfOuterStruct());
}
