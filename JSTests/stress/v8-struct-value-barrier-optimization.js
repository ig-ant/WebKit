//@ requireOptions("--useStructs=1")
// Copyright 2022 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-value-barrier-optimization.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

struct Box { payload; 0; }
let a, b;
function f() {
  a = Array(4000);
  b = new Box();
  a[0] = 2000000000;
  b.payload = 2000000000;
  b[0] = { x: 2000000000 };
}
noInline(f);
for (let i = 0; i < 1000; i++) {
  f();
  if (!(i % 100)) {
    gc();
    assertEquals(2000000000, a[0]);
    assertEquals(2000000000, b.payload);
    assertEquals(2000000000, b[0].x);
  }
}
