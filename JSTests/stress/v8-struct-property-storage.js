//@ requireOptions("--useStructs=1")
// Copyright 2022 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-struct-property-storage.js in V8.
// The license is in resources/v8-mjsunit.js.

"use strict";

load("./resources/v8-mjsunit.js", "caller relative");

let source = 'struct S {';
for (let i = 0; i < 999; i++) {
  source += 'field' + i + ';';
}
let s = new (eval(source + '} S'));

// Write to an out-of-object field.
(function storeOutOfObject() {
  for (let i = 0; i < 100; i++) s.field998 = i;
})();

// Write to an in-object field.
(function storeInObject() {
  for (let i = 0; i < 100; i++) s.field0 = i;
})();

assertEquals(99, s.field998);
assertEquals(99, s.field0);
