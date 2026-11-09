//@ requireOptions("--useStructs=1")
// Copyright 2022 the V8 project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// Modified from test/mjsunit/shared-memory/regress-crbug-1425710.js in V8.
// The license is in resources/v8-mjsunit.js.
// JSC cannot externalize strings.

load("./resources/v8-mjsunit.js", "caller relative");

struct Bar { a; }
const str = String.fromCharCode(849206214, 00, 00);
gc();
const bar = new Bar();
bar.a = str;
bar[str] = 'foo';
const str2 = String.fromCharCode(849206214, 00, 00);
gc();
const bar2 = new Bar();
bar2.a = str2;
bar2[str2] = 'foo';
assertEquals(str, bar.a);
assertEquals(str, bar2.a);
assertArrayEquals(['a'], Reflect.ownKeys(bar));
assertArrayEquals(['a'], Reflect.ownKeys(bar2));
