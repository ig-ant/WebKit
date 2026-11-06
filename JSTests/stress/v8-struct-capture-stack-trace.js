//@ requireOptions("--useStructs=1")
// Copyright 2022 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/private-name.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

// Error.captureStackTrace should not bypass the extensibility check. JSC does
// not throw when it cannot add the property.

struct Empty { }
struct Named { p; }
struct Indexed { 0; }
for (let S of [Empty, Named, Indexed]) {
  let s = new S;
  try {
    Error.captureStackTrace(s);
  } catch (e) {
    assertTrue(e instanceof TypeError);
  }
  assertFalse(Object.hasOwn(s, 'stack'));
  assertFalse(Object.isExtensible(s));
}
