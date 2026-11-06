//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
// Copyright 2023 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/brand-checks.js in V8.
// The license is in resources/v8-mjsunit.js.
// There is no isSharedStruct for unshared structs, so this calls methods and looks for private fields.

load("./resources/v8-mjsunit.js", "caller relative");

function TestBrandChecks(S1, S2, struct1, struct2) {
  assertTrue(S1.isInstance(struct1));
  assertTrue(S2.isInstance(struct2));
  assertFalse(S1.isInstance(struct2));
  assertFalse(S2.isInstance(struct1));
  assertSame(1, S1.prototype.method.call(struct1));
  assertSame(2, S2.prototype.method.call(struct2));
  assertThrows(() => S1.prototype.method.call(struct2), TypeError);
  assertThrows(() => S2.prototype.method.call(struct1), TypeError);

  const falsehoods = [42, -0, undefined, null, true, false, 'foo', {}, [],
                      S1, S1.prototype, Object.create(struct1),
                      new Proxy(struct1, {}), {field: 1}];
  for (const x of falsehoods) {
    if (Object(x) === x) {
      assertFalse(S1.isInstance(x));
      assertFalse(S2.isInstance(x));
    }
    assertThrows(() => S1.prototype.method.call(x), TypeError);
    assertThrows(() => S2.prototype.method.call(x), TypeError);
  }
}

const source = `
struct S1 {
  field;
  #private;
  method() { return 1; }
  static isInstance(x) { return #private in x; }
}
struct S2 {
  field2;
  #private;
  method() { return 2; }
  static isInstance(x) { return #private in x; }
}
[S1, S2, new S1(), new S2()]`;

// Test same Realm.
const mine = eval(source);
TestBrandChecks(...mine);

// Test cross-Realm.
const other = createGlobalObject().eval(source);
TestBrandChecksCrossRealm(...other);

function TestBrandChecksCrossRealm(S1, S2, struct1, struct2) {
  assertTrue(S1.isInstance(struct1));
  assertFalse(S1.isInstance(struct2));
  assertSame(1, S1.prototype.method.call(struct1));
  assertThrows(() => S1.prototype.method.call(struct2));
  // The same source text in another Realm is another struct.
  assertFalse(mine[0].isInstance(struct1));
  assertFalse(S1.isInstance(mine[2]));
  assertThrows(() => S1.prototype.method.call(mine[2]));
  assertThrows(() => mine[0].prototype.method.call(struct1), TypeError);
}
