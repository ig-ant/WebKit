//@ requireOptions("--useStructs=1")
// Copyright 2026 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/regress/regress-505101417.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

// A struct with an "interesting" property like "toJSON".
struct StructType { toJSON; }
const instance = new StructType();
assertEquals('{}', JSON.stringify(instance));
instance.toJSON = () => 5;
assertEquals('5', JSON.stringify(instance));
assertEquals('{"a":5}', JSON.stringify({a: instance}));
