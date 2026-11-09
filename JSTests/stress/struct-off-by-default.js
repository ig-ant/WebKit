function shouldBe(actual, expected) {
    if (actual !== expected)
        throw new Error(`expected ${String(expected)} but got ${String(actual)}`);
}

function shouldThrowSyntaxError(source) {
    let error;
    try {
        (0, eval)(source);
    } catch (e) {
        error = e;
    }
    if (!(error instanceof SyntaxError))
        throw new Error(`${source} should be a SyntaxError`);
}

function shouldBeModuleSyntaxError(source) {
    let error;
    try {
        checkModuleSyntax(source);
    } catch (e) {
        error = e;
    }
    if (!error)
        throw new Error(`${source} should be a syntax error in a module`);
}

shouldBe(!!jscOptions().useStructs, false);

shouldThrowSyntaxError("struct A { }");
shouldThrowSyntaxError("struct A extends null { x; }");
shouldThrowSyntaxError("{ struct A { } }");
shouldThrowSyntaxError("(function () { struct A { } })");

let struct = 1, A = 2;
struct
A
{
    shouldBe(struct + A, 3);
}

function f(struct) { return struct; }
shouldBe(f(42), 42);

struct: for (;;)
    break struct;

class C { struct = 1; static struct() { return this.name; } }
shouldBe(new C().struct, 1);
shouldBe(C.struct(), "C");

shouldBeModuleSyntaxError("export struct A { }");
shouldBeModuleSyntaxError("export default struct { }");
shouldBeModuleSyntaxError("export default struct A { }");
checkModuleSyntax("let struct = 1; export default struct;");
checkModuleSyntax("let struct = 1; export { struct };");
