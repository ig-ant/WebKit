//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/regress-crbug-1449611.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

struct Empty { }
struct Indexed { 4; }

function f(a) { a[4] = 42; }

let indexed = new Indexed();
for (let i = 0; i < testLoopCount; i++) {
  f([]);
  f(new Empty());
  f(indexed);
}
assertEquals(42, indexed[4]);
