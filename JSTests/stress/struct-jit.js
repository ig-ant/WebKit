//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")

function shouldBe(actual, expected) {
    if (!Object.is(actual, expected))
        throw new Error(`expected ${String(expected)} but got ${String(actual)}`);
}

(function () {
    struct Vec {
        x; y;
        constructor(x, y) { this.x = x; this.y = y; }
        add(other) { return new Vec(this.x + other.x, this.y + other.y); }
        dot(other) { return this.x * other.x + this.y * other.y; }
    }
    function test(i) {
        let a = new Vec(i, 1);
        let b = new Vec(2, i);
        return a.add(b).dot(a);
    }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i)
        shouldBe(test(i), (i + 2) * i + (1 + i));
})();

(function () {
    struct S { a; b; c; d = 4; constructor(b) { this.b = b; } }
    function test(i, escape) {
        let s = new S(i);
        if (escape)
            globalThis.escaped = s;
        return [s.a, s.b, s.c, s.d];
    }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i) {
        let escape = !(i % 100);
        let [a, b, c, d] = test(i, escape);
        shouldBe(a, undefined);
        shouldBe(b, i);
        shouldBe(c, undefined);
        shouldBe(d, 4);
        if (escape) {
            shouldBe(escaped.b, i);
            shouldBe(escaped.a, undefined);
            shouldBe(escaped.d, 4);
            shouldBe(Object.keys(escaped).join(), "a,b,c,d");
            shouldBe(Object.isExtensible(escaped), false);
        }
    }
})();

(function () {
    struct S { a = 1; b; m() { return this.a; } }
    function test(i, value) {
        let s = new S;
        s.b = i;
        let t = value + 1;
        return s.m() + s.b + String(t).length + Object.keys(s).length;
    }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i)
        test(i, 1);
    shouldBe(test(5, "abc"), 1 + 5 + 4 + 2);
    shouldBe(test(5, {}), 1 + 5 + "[object Object]1".length + 2);
})();

(function () {
    struct Shape { kind = 0; area() { return 0; } describe() { return this.kind * 10 + this.area(); } }
    struct Square extends Shape { side = 2; kind = 1; area() { return this.side * this.side; } }
    struct Rect extends Shape { w = 2; h = 3; kind = 2; area() { return this.w * this.h; } }
    struct Cube extends Square { kind = 3; depth = 5; area() { return super.area() * this.depth; } }
    let shapes = [new Shape, new Square, new Rect, new Cube];
    let expected = [0, 14, 26, 50];
    function test(shape) { return shape.describe(); }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i)
        shouldBe(test(shapes[i & 3]), expected[i & 3]);
    let failed = false;
    try {
        Shape.prototype.describe.call({ kind: 1, area() { return 1; } });
    } catch {
        failed = true;
    }
    shouldBe(failed, true);
})();

(function () {
    function make(i) {
        struct S {
            v = i;
            #p = i * 2;
            constructor(w) { this.w = w; }
            w;
            get() { return this.v + this.w + this.#p; }
            static make(w) { return new S(w); }
        }
        return S;
    }
    let structs = [];
    for (let i = 0; i < 20; ++i)
        structs.push(make(i));
    function test(S, w) { return new S(w).get() + S.make(w).get(); }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i) {
        let k = i % 20;
        shouldBe(test(structs[k], i), (k * 3 + i) * 2);
    }
    for (let i = 0; i < 20; ++i) {
        let s = new structs[i](1);
        for (let j = 0; j < 20; ++j) {
            let failed = false;
            try {
                structs[j].prototype.get.call(s);
            } catch {
                failed = true;
            }
            shouldBe(failed, i !== j);
        }
    }
})();

(function () {
    function make() {
        let captured = { v: 1 };
        struct Parent { p; constructor() { this.p = captured.v; } }
        struct S extends Parent { x; constructor(v) { super(); this.x = v + captured.v; captured.v = captured.v; } bump() { captured.v++; } }
        return S;
    }
    noInline(make);
    let First = make();
    function test(S, i) { return Reflect.construct(S, [i]); }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i)
        shouldBe(test(First, i).x, i + 1);
    let Second = make();
    new Second(1).bump();
    for (let i = 0; i < testLoopCount; ++i) {
        shouldBe(test(First, i).x, i + 1);
        let s = test(Second, i);
        shouldBe(s.x, i + 2);
        shouldBe(s.p, 2);
        shouldBe(s instanceof Second, true);
        shouldBe(s instanceof First, false);
    }
})();

(function () {
    function test(i) {
        struct Local { x = i; #y = 1; ["a" + (i % 3)] = 2; m() { return this.x + this.#y; } }
        let l = new Local;
        return l.m() + l["a" + (i % 3)];
    }
    noInline(test);
    for (let i = 0; i < testLoopCount / 10; ++i)
        shouldBe(test(i), i + 3);
})();

for (let count of [0, 1, 5, 6, 7, 30, 61, 62, 63, 64, 65, 100, 200, 1000]) {
    let source = "struct Big { ";
    for (let i = 0; i < count; ++i)
        source += i % 2 ? `f${i} = ${i};` : `f${i};`;
    source += " sum() { let sum = 0; for (let k in this) { if (this[k] !== undefined) sum += this[k]; } return sum; } } Big";
    let Big = eval(source);
    let Derived = eval("struct Derived extends Big { last = 1; constructor() { } } Derived");
    let expected = 0;
    for (let i = 1; i < count; i += 2)
        expected += i;
    let keep = [];
    function make() { return new Big; }
    function makeDerived() { return new Derived; }
    noInline(make);
    noInline(makeDerived);
    let loops = count > 100 ? 100 : 2000;
    for (let i = 0; i < loops; ++i) {
        let b = make();
        let d = makeDerived();
        if (!(i % 100)) {
            keep.push(b, d);
            shouldBe(Object.keys(b).length, count);
            shouldBe(b.sum(), expected);
            shouldBe(d.sum(), expected + 1);
            if (count > 1)
                shouldBe(b.f0, undefined);
            shouldBe(Reflect.set(b, "extra", 1), false);
        }
    }
    gc();
    for (let o of keep)
        shouldBe(o.sum() === expected || o.sum() === expected + 1, true);
}

(function () {
    struct S { x = 1; y = 2; }
    let sideEffect = function (s) { };
    function test(s) {
        let result = s.x;
        sideEffect(s);
        result += s.y;
        sideEffect(s);
        return result + s.x;
    }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i)
        shouldBe(test(new S), 4);
    let nasty = [
        s => { try { Object.freeze(s); } catch { } },
        s => { try { s.z = 1; } catch { } },
        s => { try { s[0] = 1; } catch { } },
        s => { Object.create(s); },
        s => { try { Object.defineProperty(s, "x", { writable: false }); } catch { } },
        s => { gc(); },
    ];
    for (let f of nasty) {
        sideEffect = f;
        for (let i = 0; i < 100; ++i)
            shouldBe(test(new S), 4);
    }
    sideEffect = s => { s.x = "a"; };
    shouldBe(test(new S), "3a");
})();

(function () {
    struct Config { debug = false; level; }
    const config = new Config;
    function test() { return config.debug ? 1 : config.level === undefined ? 2 : 3; }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i)
        shouldBe(test(), 2);
    config.level = 1;
    shouldBe(test(), 3);
    config.debug = true;
    shouldBe(test(), 1);
})();

(function () {
    struct S { x = 1; }
    class C { }
    function test(target) { return Reflect.construct(S, [], target); }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i)
        test(S);
    let failed = false;
    try {
        test(C);
    } catch (e) {
        failed = e instanceof TypeError;
    }
    shouldBe(failed, true);
})();

(function () {
    let calls = 0;
    struct A { x; constructor(x) { this.x = x; calls++; } }
    struct B extends A { y; constructor(x, y) { super(x); this.y = y; } }
    struct C extends B { z; constructor(...args) { super(...args); this.z = args.length; } }
    function test(i) { let c = new C(i, i + 1); return c.x + c.y + c.z; }
    noInline(test);
    for (let i = 0; i < testLoopCount; ++i)
        shouldBe(test(i), 2 * i + 3);
    shouldBe(calls, testLoopCount);
})();

(function () {
    for (let i = 0; i < 300; ++i) {
        struct Temp { a = i; b = {}; c = [i]; m() { return this.a + this.c[0]; } }
        let t = new Temp;
        if (!(i % 50))
            gc();
        shouldBe(t.m(), 2 * i);
        shouldBe(new Temp().b !== t.b, true);
    }
    fullGC();
})();
