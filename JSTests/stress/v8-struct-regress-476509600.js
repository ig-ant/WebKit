//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
// Copyright 2026 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/regress/regress-476509600.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

struct t0 { a = 1; 0 = 2; [Symbol.iterator] = 3; }
const v2 = new t0();
Object.defineProperties(v2, Object.getOwnPropertyDescriptors(v2));
assertEquals(1, v2.a);
assertEquals(2, v2[0]);
assertEquals(3, v2[Symbol.iterator]);
