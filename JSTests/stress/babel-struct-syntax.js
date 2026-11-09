//@ requireOptions("--useStructs=1")
// MIT License
//
// Copyright (c) 2014-present Sebastian McKenzie and other contributors
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// Modified from the parser tests of Babel for structs,
// packages/babel-parser/test/fixtures/experimental/structs.

function shouldParse(name, check, source) {
    try {
        check(source);
    } catch (e) {
        throw new Error(`${name} should parse, but got ${e}`);
    }
}

function shouldNotParse(name, check, source) {
    let error;
    try {
        check(source);
    } catch (e) {
        error = e;
    }
    if (!String(error).startsWith("SyntaxError"))
        throw new Error(`${name} should not parse, but got ${error}`);
}

shouldParse("export-default-anonymous-struct-declaration", checkModuleSyntax, String.raw`export default struct {
  property = 0;
  method() {}
  #private = "";
  #PrivateMethod() {}

  static staticProperty;
  static staticMethod() {}
  static #staticPrivate;
  static #staticPrivateMethod() {}

  [computedMethod]() {};
  [computedProperty];

  get accessor() {}
  set accessor(value) {}

  static {}
}`);

shouldParse("export-default-anonymous-struct-declaration-extends", checkModuleSyntax, String.raw`export default struct extends B {
  property = 0;
  method() {}
  #private = "";
  #PrivateMethod() {}

  static staticProperty;
  static staticMethod() {}
  static #staticPrivate;
  static #staticPrivateMethod() {}

  [computedMethod]() {};
  [computedProperty];

  get accessor() {}
  set accessor(value) {}

  static {}
}`);

shouldParse("export-default-body-linebreak", checkModuleSyntax, String.raw`export default struct S
{};`);

shouldParse("export-default-extends-linebreak", checkModuleSyntax, String.raw`export default struct S
extends B {};`);

shouldParse("export-default-struct-declaration", checkModuleSyntax, String.raw`export default struct S {
  property = 0;
  method() {}
  #private = "";
  #PrivateMethod() {}

  static staticProperty;
  static staticMethod() {}
  static #staticPrivate;
  static #staticPrivateMethod() {}

  [computedMethod]() {};
  [computedProperty];

  get accessor() {}
  set accessor(value) {}

  static {}
}`);

shouldParse("export-default-struct-declaration-extends", checkModuleSyntax, String.raw`export default struct S extends B {
  property = 0;
  method() {}
  #private = "";
  #PrivateMethod() {}

  static staticProperty;
  static staticMethod() {}
  static #staticPrivate;
  static #staticPrivateMethod() {}

  [computedMethod]() {};
  [computedProperty];

  get accessor() {}
  set accessor(value) {}

  static {}
}`);

shouldParse("export-named-struct-declaration", checkModuleSyntax, String.raw`export struct S {
  property = 0;
  method() {}
  #private = "";
  #PrivateMethod() {}

  static staticProperty;
  static staticMethod() {}
  static #staticPrivate;
  static #staticPrivateMethod() {}

  [computedMethod]() {};
  [computedProperty];

  get accessor() {}
  set accessor(value) {}

  static {}
}`);

shouldParse("export-named-struct-declaration-extends", checkModuleSyntax, String.raw`export struct S extends B {
  property = 0;
  method() {}
  #private = "";
  #PrivateMethod() {}

  static staticProperty;
  static staticMethod() {}
  static #staticPrivate;
  static #staticPrivateMethod() {}

  [computedMethod]() {};
  [computedProperty];

  get accessor() {}
  set accessor(value) {}

  static {}
}`);

shouldParse("identifier-struct-in-instanceof", checkScriptSyntax, String.raw`struct in struct instanceof struct;`);

shouldNotParse("invalid-anonymous-struct-declaration", checkScriptSyntax, String.raw`struct {};`);

shouldNotParse("invalid-duplicate-export-alias", checkModuleSyntax, String.raw`const value = 0;
export { value as S };
export struct S {}`);

shouldNotParse("invalid-duplicate-export-declaration-first", checkModuleSyntax, String.raw`export struct S {}
export { S };`);

shouldNotParse("invalid-duplicate-export-specifier-first", checkModuleSyntax, String.raw`export { S };
export struct S {}`);

shouldNotParse("invalid-duplicate-struct-binding", checkScriptSyntax, String.raw`struct S {};
struct \u0053 {};`);

shouldNotParse("invalid-escaped-struct-keyword-1", checkScriptSyntax, String.raw`\u0073truct S {};`);

shouldNotParse("invalid-escaped-struct-keyword-2", checkScriptSyntax, String.raw`s\u0074ruct S {};`);

shouldNotParse("invalid-escaped-struct-keyword-2-export-default", checkModuleSyntax, String.raw`export default s\u0074ruct S {};`);

shouldNotParse("invalid-escaped-struct-keyword-2-export-named", checkScriptSyntax, String.raw`export s\u0074ruct S {};`);

shouldNotParse("invalid-export-default-anonymous-extends-linebreak", checkModuleSyntax, String.raw`export default struct
extends B {};`);

shouldNotParse("invalid-export-named-linebreak", checkModuleSyntax, String.raw`export struct
S
{};`);

shouldNotParse("invalid-outer-private-name", checkScriptSyntax, String.raw`class C {
  static {
    struct S {
      static #privateProperty;
    }
    #privateProperty in S;
  }
}`);

shouldNotParse("invalid-struct-declaration-if-statement", checkScriptSyntax, String.raw`if (true) struct S {};`);

shouldNotParse("invalid-struct-declaration-left-brace", checkScriptSyntax, String.raw`struct S [};`);

shouldNotParse("invalid-struct-declaration-right-brace", checkScriptSyntax, String.raw`struct S {];`);

shouldNotParse("invalid-struct-decorators", checkScriptSyntax, String.raw`@f
struct S {}

class C {}`);

shouldNotParse("invalid-struct-expression", checkScriptSyntax, String.raw`const S = struct {};`);

shouldNotParse("invalid-struct-linebreak-extends", checkModuleSyntax, String.raw`export default struct
extends B {};`);

shouldNotParse("invalid-struct-member-decorators", checkScriptSyntax, String.raw`struct S {
  @f property;
}`);

shouldNotParse("invalid-struct-sloppy-production", checkScriptSyntax, String.raw`struct S {
  x = 01;
}`);

shouldNotParse("invalid-undefined-private-name", checkScriptSyntax, String.raw`struct S {
  property = S.#undefinedPrivateName;
}`);

shouldParse("struct-asi", checkModuleSyntax, String.raw`struct
NotStructId
{};

export default struct
{};`);

shouldParse("struct-declaration", checkScriptSyntax, String.raw`struct S {
  property = 0;
  method() {}
  #private = "";
  #PrivateMethod() {}

  static staticProperty;
  static staticMethod() {}
  static #staticPrivate;
  static #staticPrivateMethod() {}

  [computedMethod]() {};
  [computedProperty];

  get accessor() {}
  set accessor(value) {}

  static {}
}`);

shouldParse("struct-declaration-empty-body", checkScriptSyntax, String.raw`struct S {

}
struct T { ; }
struct U { ;; }`);

shouldParse("struct-declaration-extends", checkScriptSyntax, String.raw`struct S extends B {
  property = 0;
  method() {}
  #private = "";
  #PrivateMethod() {}

  static staticProperty;
  static staticMethod() {}
  static #staticPrivate;
  static #staticPrivateMethod() {}

  [computedMethod]() {};
  [computedProperty];

  get accessor() {}
  set accessor(value) {}

  static {}
}`);

shouldParse("struct-id-escaped", checkModuleSyntax, String.raw`struct \u0053 {}
export struct \u0054 {}
export default struct \u0055 {}`);

shouldParse("struct-id-non-bmp", checkModuleSyntax, String.raw`struct 𝕊 {}
export struct 𝕋 {}
export default struct 𝕌 {}`);
