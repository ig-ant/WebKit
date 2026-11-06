//@ requireOptions("--useStructs=1")
// Copyright 2022 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-struct-workers-optimized-code.js in V8.
// The license is in resources/v8-mjsunit.js.
// Unshared structs cannot be sent to a worker, so this stays in one.

"use strict";

load("./resources/v8-mjsunit.js", "caller relative");

(function TestStructOptimizedCode() {
  function writePayload(struct) {
    for (let i = 0; i < 100; i++) {
      struct.payload = struct.payload + 1;
    }
  }
  noInline(writePayload);

  struct Named { payload; }
  struct Indexed { payload; 0; }
  for (let S of [Named, Indexed]) {
    let instance = new S();
    instance.payload = 0;
    for (let i = 0; i < 500; i++) writePayload(instance);
    assertEquals(50000, instance.payload);
  }
})();
