//@ requireOptions("--useStructs=1")

function shouldBe(actual, expected) {
    if (!Object.is(actual, expected))
        throw new Error(`expected ${String(expected)} but got ${String(actual)}`);
}

function shouldBeSyntaxError(source) {
    for (let code of [source, `(function () { ${source} })`, `"use strict"; ${source}`]) {
        let error;
        try {
            new Function(code);
        } catch (e) {
            error = e;
        }
        if (!(error instanceof SyntaxError))
            throw new Error(`expected a SyntaxError for ${code}`);
    }
}

var struct = 1;
shouldBe(struct, 1);
struct = 2;
shouldBe(struct, 2);
shouldBe((() => { let struct = 3; return struct + 1; })(), 4);
shouldBe(((struct) => struct)(5), 5);
shouldBe({ struct }.struct, 2);
shouldBe({ struct() { return 1; } }.struct(), 1);
shouldBe((function struct() { return 6; })(), 6);
{
    let Foo = 10;
    struct
    Foo
    { }
    shouldBe(Foo, 10);
}
struct: for (;;) { break struct; }
struct
++struct;
shouldBe(struct, 3);
shouldBe(struct in { 3: 1 }, true);
shouldBe((struct instanceof Object), false);
for (struct of [7]);
shouldBe(struct, 7);
class C { struct = 1; static struct() { } get struct2() { } }

(function () {
    struct async { }
    shouldBe(async.name, "async");
    struct of { }
    shouldBe(of.name, "of");
    struct get { }
    shouldBe(get.name, "get");
    { struct struct { x = 1; } shouldBe(new struct().x, 1); }
})();

shouldBeSyntaxError("struct A { } struct A { }");
shouldBeSyntaxError("let A; struct A { }");
shouldBeSyntaxError("struct A { } var A;");
shouldBeSyntaxError("if (1) struct A { }");
shouldBeSyntaxError("while (0) struct A { }");
shouldBeSyntaxError("label: struct A { }");

shouldBeSyntaxError("(struct { })");
shouldBeSyntaxError("(struct A { })");
shouldBeSyntaxError("x = struct A { }");
shouldBeSyntaxError("struct { }");

shouldBeSyntaxError("struct A { m() { with ({}) { } } }");
shouldBeSyntaxError("struct let { }");
shouldBeSyntaxError("struct static { }");
shouldBeSyntaxError("struct yield { }");
shouldBeSyntaxError("struct eval { }");
shouldBeSyntaxError("struct if { }");
shouldBeSyntaxError("s\\u0074ruct A { }");

shouldBeSyntaxError("struct A { constructor() { } constructor() { } }");
shouldBeSyntaxError("struct A { get constructor() { } }");
shouldBeSyntaxError("struct A { *constructor() { } }");
shouldBeSyntaxError("struct A { async constructor() { } }");
shouldBeSyntaxError("struct A { constructor; }");
shouldBeSyntaxError("struct A { #constructor; }");
shouldBeSyntaxError("struct A { static prototype; }");
shouldBeSyntaxError("struct A { static prototype() { } }");
shouldBeSyntaxError("struct A { #a; #a; }");
shouldBeSyntaxError("struct A { #a; get #a() { } }");
shouldBeSyntaxError("struct A { get #a() { } static set #a(v) { } }");
shouldBeSyntaxError("struct A { m() { this.#b; } }");
shouldBeSyntaxError("struct A { constructor() { super(); } }");
shouldBeSyntaxError("struct A extends B { m() { super(); } }");
shouldBeSyntaxError("struct A extends B { x = super(); }");
shouldBeSyntaxError("struct A extends B { static { super(); } }");
shouldBeSyntaxError("struct A { x = arguments; }");

struct Empty { }
struct Semicolons { ;;; x;;; y = 1; }
struct Generators { *g() { } async *ag() { } async a() { } static async *sag() { } }
struct Elements { static; get; set; async; static static; static async; static get; 'a'; "b" = 1; struct; }
shouldBe(Object.keys(new Elements).join(), "static,get,set,async,a,b,struct");
label: { struct Inner { } }
switch (1) { case 1: struct InSwitch { } shouldBe(InSwitch.name, "InSwitch"); }
(function () { struct InFunction { } shouldBe(InFunction.name, "InFunction"); })();
(() => { struct InArrow { } shouldBe(InArrow.name, "InArrow"); })();
shouldBe(eval("struct InEval { x = 1; } new InEval().x"), 1);
shouldBe(typeof InEval, "undefined");
shouldBe((0, eval)("struct InGlobalEval { x = 1; } new InGlobalEval().x"), 1);
