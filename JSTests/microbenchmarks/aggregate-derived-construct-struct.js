//@ requireOptions("--useStructs=1")
struct Base { a = 1; b; constructor(b) { this.b = b; } }
struct Derived extends Base { c = 2; d; constructor(b, d) { super(b); this.d = d; } sum() { return this.a + this.b + this.c + this.d; } }
function test(n) {
    let result = 0;
    for (let i = 0; i < n; ++i)
        result = (result + new Derived(i, i).sum()) | 0;
    return result;
}
noInline(test);
for (let i = 0; i < 200; ++i) {
    if (test(5000) !== 25010000)
        throw new Error("bad result");
}
