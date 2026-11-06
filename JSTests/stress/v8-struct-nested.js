//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
// Copyright 2022 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-struct-workers.js in V8.
// The license is in resources/v8-mjsunit.js.
// Unshared structs cannot be sent to a worker, so this stays in one.

load("./resources/v8-mjsunit.js", "caller relative");

(function TestNestedStruct() {
  function onmessage({data: struct}) {
    struct.struct_field.payload = 42;
    struct.string_field = "worker";
  }

  struct OuterStruct { string_field; struct_field; }
  struct InnerStruct { payload; }
  let outer = new OuterStruct();
  outer.struct_field = new InnerStruct();
  outer.string_field = "main";
  assertEquals("main", outer.string_field);
  assertEquals(undefined, outer.struct_field.payload);
  onmessage({data: outer});
  assertEquals("worker", outer.string_field);
  assertEquals(42, outer.struct_field.payload);
})();

(function TestObjectAssign() {
  struct Struct { field; }
  const struct_ = new Struct();
  const obj = {'field': 1};
  Object.assign(struct_, obj);
  assertEquals(1, struct_.field);
})();
