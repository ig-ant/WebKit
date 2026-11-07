//@ skip if $structsEnabled != false
//@ requireOptions("--useStructs=1")

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

shouldBe(jscOptions().useStructs ? true : false, false);

shouldThrowSyntaxError("struct A { }");
shouldThrowSyntaxError("struct A extends null { x; }");
shouldThrowSyntaxError("{ struct A { } }");

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
