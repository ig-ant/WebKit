//@ requireOptions("--useStructs=1")
// Copyright 2026 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/regress/regress-499155348.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

struct SType { x; }
let instance = new SType();

let source = {};
for (let i = 0; i < 1021; i++) source['prop' + i] = i;

assertThrows(() => Object.assign(instance, source), TypeError);
assertArrayEquals(['x'], Reflect.ownKeys(instance));
