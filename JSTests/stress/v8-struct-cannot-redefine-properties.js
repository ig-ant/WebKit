//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/cannot-redefine-properties.js in V8.
// The license is in resources/v8-mjsunit.js.

load("./resources/v8-mjsunit.js", "caller relative");

// Structs have fixed layout and cannot have their properties redefined. They
// are constructed sealed. In ordinary objects, sealed objects can be redefined
// to be frozen. This is disallowed for structs.

function TestStructCannotRedefineProperty(obj) {
  function TestRedefine(obj, propName) {
    if (Object.hasOwn(obj, propName)) {
      assertThrows(() => Object.defineProperty(obj, propName, {
        value: 99,
        enumerable: true,
        writable: false,
        configurable: false
      }));
      Object.defineProperty(
          obj, propName,
          {value: 99, enumerable: true, writable: true, configurable: false});
      assertEquals(99, obj[propName]);
    }
  }

  TestRedefine(obj, 'p');
  TestRedefine(obj, '0');
  // Objects without any properties are a degenerate case and are considered
  // frozen (or any integrity level, really).
  if (Object.getOwnPropertyNames(obj).length > 0) {
    assertThrows(() => Object.freeze(obj));
  }
  assertTrue(Object.isSealed(obj));
}

struct Empty { }
struct Named { p; }
struct Indexed { 0; }
struct Both { p; 0; }
TestStructCannotRedefineProperty(new Empty);
TestStructCannotRedefineProperty(new Named);
TestStructCannotRedefineProperty(new Indexed);
TestStructCannotRedefineProperty(new Both);
