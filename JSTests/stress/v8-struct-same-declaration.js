//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/shared-struct-type-registry.js in V8.
// The license is in resources/v8-mjsunit.js.
// Unshared structs have no type registry, so every evaluation makes a new type and nothing throws.

load("./resources/v8-mjsunit.js", "caller relative");

function TestSameFields(fields1, fields2, keys) {
  let make = fields => (0, eval)(`(function() { struct T {${fields}; m() { } } return T; })()`);
  let T1 = make(fields1);
  let T2 = make(fields2);
  assertNotSame(T1, T2);
  let t1 = new T1;
  let t2 = new T2;
  assertArrayEquals(keys, Reflect.ownKeys(t1));
  if (fields1 === fields2) {
    assertArrayEquals(keys, Reflect.ownKeys(t2));
  }
  assertFalse(t1 instanceof T2);
  assertFalse(t2 instanceof T1);
  t1.m();
  assertThrows(() => T1.prototype.m.call(t2), TypeError);
  return Reflect.ownKeys(t2);
}

TestSameFields('x; y', 'x; y', ['x', 'y']);
TestSameFields('0; 4', '0; 4', ['0', '4']);
TestSameFields('0; x; 4; y', '0; x; 4; y', ['0', '4', 'x', 'y']);

// The order of the elements doesn't matter, even when interleaved with field
// names.
assertArrayEquals(['0', '4'], TestSameFields('0; 4', '4; 0', ['0', '4']));
assertArrayEquals(
    ['0', '4', 'x', 'y'],
    TestSameFields('0; x; 4; y', 'x; 4; y; 0', ['0', '4', 'x', 'y']));

// Other fields.
TestSameFields('x', 'x; y', ['x']);
TestSameFields('x; y', 'z; w', ['x', 'y']);
TestSameFields('y; x', 'x; y', ['y', 'x']);
TestSameFields('0; 1', '0', ['0', '1']);
TestSameFields('0; 1', '2; 3', ['0', '1']);
TestSameFields('x', '0; 1', ['x']);

(function TestFieldsInternalized() {
  let a = 'qwporugao';
  let b = 'bhuiweuryiq';
  struct T {
    qwporugaoasdjioasdjiaods;
    bhuiweuryiq190hvaodeh;
  }
  struct U {
    [a + 'asdjioasdjiaods'];
    [b + '190hvaodeh'];
  }
  assertArrayEquals(Reflect.ownKeys(new T), Reflect.ownKeys(new U));
  let u = new U;
  u.bhuiweuryiq190hvaodeh = 1;
  assertEquals(1, u[b + '190hvaodeh']);
})();
