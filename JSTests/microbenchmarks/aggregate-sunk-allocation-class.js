class Vec2 {
    x; y;
    constructor(x, y) { this.x = x; this.y = y; }
    add(o) { return new Vec2(this.x + o.x, this.y + o.y); }
    dot(o) { return this.x * o.x + this.y * o.y; }
}
function test(n) {
    let result = 0;
    let unit = new Vec2(1, 1);
    for (let i = 0; i < n; ++i)
        result = (result + new Vec2(i, 2).add(unit).dot(unit)) | 0;
    return result;
}
noInline(test);
for (let i = 0; i < 200; ++i) {
    if (test(10000) !== 50035000)
        throw new Error("bad result");
}
