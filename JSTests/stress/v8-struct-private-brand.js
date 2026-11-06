//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/private-brand.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

// Private brands from private methods should not be able to extend structs.
// This is unlike ordinary objects, which can get them even if sealed/frozen.

function TestStructCannotAdd(obj) {
  function Base() {
    return obj;
  }
  assertThrows(() => {
    class C extends Base {
      #o() {}
    }
    return new C();
  });
}

struct Empty { }
struct Named { p; }
struct Indexed { 0; }
struct Private { #o; }
TestStructCannotAdd(new Empty);
TestStructCannotAdd(new Named);
TestStructCannotAdd(new Indexed);
TestStructCannotAdd(new Private);
