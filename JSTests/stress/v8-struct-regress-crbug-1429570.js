//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/regress-crbug-1429570.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

struct t0 { a; }
const v6 = new t0();
function f10(a11) {
  a11[1] = 0.1;
}
f10(Array());
f10(v6);
f10(v6);
assertEquals(undefined, v6[1]);
for (let i = 0; i < testLoopCount; i++) {
  f10(i & 1 ? v6 : Array());
}
assertEquals(undefined, v6[1]);
