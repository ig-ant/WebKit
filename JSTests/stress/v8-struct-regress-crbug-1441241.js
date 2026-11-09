//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/regress-crbug-1441241.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

struct Named { x; }
struct Indexed { 0; }

for (let ctor of [Named, Indexed]) {
  (function TestConstructors(C) {
    function f(a) {
      a.stack = "boom";
    }
    Error.captureStackTrace(f);
    for (let i = 0; i < testLoopCount; i++) {
      f(C);
    }
    assertFalse(Object.hasOwn(C, 'stack'));
  })(ctor);
}
