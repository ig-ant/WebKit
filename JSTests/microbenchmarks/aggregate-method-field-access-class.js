class Counter {
    a = 0; b = 1; c = 2;
    step(n) { this.a += n; this.b += this.a & 3; this.c = this.a - this.b; return this.c; }
}
function test(n) {
    let counter = new Counter;
    let result = 0;
    for (let i = 0; i < n; ++i)
        result = (result + counter.step(i & 7)) | 0;
    return result;
}
noInline(test);
for (let i = 0; i < 200; ++i) {
    if (test(10000) !== 99947500)
        throw new Error("bad result");
}
