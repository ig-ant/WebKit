//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
struct Vec3 { x; y; z; constructor(x, y, z) { this.x = x; this.y = y; this.z = z; } }
function test(n) {
    let last;
    for (let i = 0; i < n; ++i)
        last = new Vec3(i, i + 1, i + 2);
    return last;
}
noInline(test);
for (let i = 0; i < 200; ++i) {
    if (test(10000).x !== 9999)
        throw new Error("bad result");
}
