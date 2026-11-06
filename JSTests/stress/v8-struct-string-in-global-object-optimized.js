//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-string-in-global-object-optimized.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

struct ST { foo; }
var t22 = new ST();

function f() {
  t22.foo = 'a'.repeat(9);
  globalThis[Symbol.unscopables] = t22.foo;
  return globalThis[Symbol.unscopables];
}
noInline(f);

for (let i = 0; i < testLoopCount; i++) {
  f();
}
assertEquals('a'.repeat(9), f());
