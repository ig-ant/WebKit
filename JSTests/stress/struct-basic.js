//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")

function shouldBe(actual, expected) {
    if (!Object.is(actual, expected))
        throw new Error(`expected ${String(expected)} but got ${String(actual)}`);
}

function shouldThrow(func, errorType, message) {
    let error;
    try {
        func();
    } catch (e) {
        error = e;
    }
    if (!(error instanceof errorType))
        throw new Error(`expected ${errorType.name} but got ${String(error)}`);
    if (message !== undefined && !String(error.message).includes(message))
        throw new Error(`unexpected message: ${error.message}`);
}

{
    struct Box {
        constructor(x) { this.x = x; }
        x;
    }

    let box = new Box(0);
    box.x = 42;
    shouldBe(box.x, 42);
    shouldThrow(() => { "use strict"; box.y = 8.8; }, TypeError);
    shouldThrow(() => { box.__proto__ = {}; }, TypeError);

    struct Point extends Box {
        constructor(x, y) {
            this.y = y;
            super(x);
            return {};
        }

        distance(other) {
            return Math.sqrt((other.x - this.x) ** 2 + (other.y - this.y) ** 2);
        }

        y;
    }

    let p = new Point(1, 2);
    let fake = { x: 4, y: 6 };
    shouldThrow(() => Point.prototype.distance.call(fake, p), TypeError, "not an instance of struct Point");
    shouldBe(p.distance(fake), 5);
    shouldBe(Object.keys(p).join(), "x,y");
    shouldBe(p instanceof Point, true);
    shouldBe(p instanceof Box, true);
    shouldBe(Object.getPrototypeOf(Point), Box);
    shouldBe(Object.getPrototypeOf(Point.prototype), Box.prototype);
}

{
    struct S { a; b = 1; "c d"; [Symbol.for("sym")] = 2; ["comp" + "uted"] = this.b + 1; __proto__ = 5; then; }
    let s = new S;
    for (let key of Reflect.ownKeys(s)) {
        let descriptor = Object.getOwnPropertyDescriptor(s, key);
        shouldBe(descriptor.writable, true);
        shouldBe(descriptor.enumerable, true);
        shouldBe(descriptor.configurable, false);
    }
    shouldBe(Reflect.ownKeys(s).map(String).join(), "a,b,c d,computed,__proto__,then,Symbol(sym)");
    shouldBe(s.a, undefined);
    shouldBe(s.b, 1);
    shouldBe(s["c d"], undefined);
    shouldBe(s[Symbol.for("sym")], 2);
    shouldBe(s.computed, 2);
    shouldBe(Object.getOwnPropertyDescriptor(s, "__proto__").value, 5);
    shouldBe(Object.getPrototypeOf(s), S.prototype);
    shouldBe(JSON.stringify(s), `{"b":1,"computed":2,"__proto__":5}`);
    shouldBe(Object.isExtensible(s), false);
    shouldBe(Object.isSealed(s), true);
    shouldBe(Object.isFrozen(s), false);
}

{
    struct S { x = 1; x = 2; y; }
    shouldBe(Object.keys(new S).join(), "x,y");
    shouldBe(new S().x, 2);
    struct T extends S { z = 4; x = 3; }
    shouldBe(Object.keys(new T).join(), "x,y,z");
    shouldBe(new T().x, 3);
}

{
    let log = [];
    struct A {
        a = log.push("a:" + Object.keys(this).join());
        constructor() { log.push("A"); return 42; }
    }
    struct B extends A {
        b = log.push("b");
        constructor() { log.push("B"); log.push(super()); }
    }
    struct C extends B { }
    struct D extends C {
        d = log.push("d");
        constructor(...args) { log.push("D"); log.push(super(...args)); }
    }
    new B;
    shouldBe(log.join(";"), "a:a,b;b;B;A;42");
    log.length = 0;
    new C;
    shouldBe(log.join(";"), "a:a,b;b");
    log.length = 0;
    new D;
    shouldBe(log.join(";"), "a:a,b,d;b;d;D;");
}

{
    let count = 0;
    struct A { x = 1; constructor(v) { count++; this.x += v; } }
    struct B extends A { constructor() { super(1); super(2); (() => super(3))(); eval("super(4)"); (() => eval("super(5)"))(); } }
    shouldBe(new B().x, 16);
    shouldBe(count, 5);
    struct C extends A { constructor() { } }
    shouldBe(new C().x, 1);
    shouldBe(count, 5);
    struct D extends B { constructor() { let f = () => { super(); }; f(); } }
    shouldBe(new D().x, 16);
    struct E extends A { constructor() { (async () => { await 0; super(10); globalThis.asyncSuper = this; })(); } }
    let e = new E;
    drainMicrotasks();
    shouldBe(globalThis.asyncSuper, e);
    shouldBe(e.x, 11);
}

for (let i = 0; i < 20; ++i) {
    class A { constructor() { this.a = 1; } }
    class B extends A { b = 2; constructor() { eval("super()"); } }
    let b = new B;
    shouldBe(b.a + b.b, 3);
    struct C { a; constructor() { this.a = 1; } }
    struct D extends C { b = 2; constructor() { eval("super()"); } }
    let d = new D;
    shouldBe(d.a + d.b, 3);
}

{
    struct N extends null { x = 1; }
    let n = new N;
    shouldBe(Object.getPrototypeOf(N), Function.prototype);
    shouldBe(Object.getPrototypeOf(N.prototype), null);
    shouldBe(n.x, 1);
    shouldBe("toString" in n, false);
    struct M extends null { constructor() { super(); } }
    shouldThrow(() => new M, TypeError);
    struct O extends N { y = this.x + 1; }
    shouldBe(new O().y, 2);
}

for (let heritage of [undefined, 1, "a", {}, class { }, function () { }, Object, new Proxy(class { }, { }), Object.bind(null), () => { }]) {
    shouldThrow(() => { struct S extends heritage { } }, TypeError, "can only extend another struct");
}
shouldThrow(() => { struct S extends S { } }, ReferenceError);
{
    struct S { }
    shouldThrow(() => { struct T extends (new Proxy(S, {})) { } }, TypeError);
    class C extends S { }
    shouldThrow(() => new C, TypeError);
    shouldThrow(() => Reflect.construct(S, [], C), TypeError);
    shouldThrow(() => Reflect.construct(S, [], Object), TypeError);
    shouldBe(Reflect.construct(S, []) instanceof S, true);
    shouldThrow(() => S(), TypeError, "without |new|");
    shouldThrow(() => S.call(new S), TypeError);
    shouldThrow(() => Reflect.apply(S, new S, []), TypeError);
    let o = Reflect.construct(function () { this.x = 1; }, [], S);
    shouldBe(Object.getPrototypeOf(o), S.prototype);
    shouldBe(Object.isExtensible(o), true);
    let b = S.bind(null);
    shouldBe(new b() instanceof S, true);
    let p = new Proxy(S, {});
    shouldThrow(() => new p, TypeError);
}

{
    let targets = [];
    struct A { constructor() { targets.push(new.target, (() => new.target)(), eval("new.target")); } }
    struct B extends A { constructor() { targets.push(new.target); super(); } }
    new A; new B;
    shouldBe(targets.length, 7);
    shouldBe(targets.every(t => t === undefined), true);
}

{
    let makeStruct = () => {
        struct S {
            x;
            #p = 1;
            method() { return this.x; }
            get accessor() { return this.x; }
            set accessor(v) { this.x = v; }
            *generator() { yield this.x; }
            async asyncMethod() { return this.x; }
            async awaits() { await 0; return this.x; }
            async *asyncGenerator() { yield this.x; }
            #private() { return this.#p; }
            callPrivate() { return this.#private(); }
            getPrivateMethod() { return this.#private; }
            arrow() { return () => this; }
            unused() { return 1; }
            defaults(a = this.x) { return a; }
            evals() { return eval("this.x"); }
            [Symbol.toPrimitive]() { return 7; }
            static staticMethod() { return this; }
            static get staticAccessor() { return this; }
            static hasP(o) { return #p in o; }
            static hasPrivate(o) { return #private in o; }
            toString() { return super.toString(); }
        }
        return S;
    };
    let S = makeStruct();
    let Other = makeStruct();
    let s = new S;
    s.x = 1;
    let descriptor = Object.getOwnPropertyDescriptor(S.prototype, "accessor");
    let functions = ["method", "generator", "asyncMethod", "awaits", "asyncGenerator", "callPrivate", "getPrivateMethod", "arrow", "unused", "defaults", "evals", Symbol.toPrimitive, "toString"].map(name => S.prototype[name]);
    functions.push(descriptor.get, descriptor.set, s.getPrivateMethod());
    for (let i = 0; i < testLoopCount / 10; ++i) {
        for (let f of functions) {
            f.call(s);
            for (let receiver of [undefined, null, 1, "s", Symbol(), {}, S.prototype, S, new Other, Object.create(s), new Proxy(s, {}), []]) {
                let error = null;
                try {
                    f.call(receiver);
                } catch (e) {
                    error = e;
                }
                if (!(error instanceof TypeError))
                    throw new Error("bad error " + error);
            }
            s.x = 1;
            Object.setPrototypeOf({}, S.prototype);
        }
        if (i > 20)
            i += 100;
    }
    shouldBe(s.method(), 1);
    shouldBe(s.accessor, 1);
    s.accessor = 2;
    shouldBe(s.x, 2);
    shouldBe([...s.generator()].join(), "2");
    shouldBe(s.callPrivate(), 1);
    shouldBe(s.arrow()(), s);
    shouldBe(s.defaults(), 2);
    shouldBe(s.evals(), 2);
    shouldBe(+s, 7);
    shouldBe(s.toString(), "[object Object]");
    shouldBe(S.staticMethod(), S);
    shouldBe(S.staticAccessor, S);
    shouldBe(S.hasP(s), true);
    shouldBe(S.hasP(new Other), false);
    shouldBe(S.hasPrivate(s), true);
    shouldBe(S.hasPrivate(new Other), false);
    struct Sub extends S { method() { return super.method() + 1; } }
    let sub = new Sub;
    sub.x = 10;
    shouldBe(sub.method(), 11);
    shouldBe(sub.accessor, 10);
    shouldBe(sub.callPrivate(), 1);
    shouldBe(S.hasP(sub), true);
    shouldThrow(() => Sub.prototype.method.call(s), TypeError, "not an instance of struct Sub");
    shouldThrow(() => Object.create(s).method(), TypeError);
}

{
    struct S { static a = 1; static #b = 2; static getB() { return S.#b; } static { this.c = 3; } method() { } static m() { } }
    shouldBe(Object.isSealed(S), true);
    shouldBe(Object.isSealed(S.prototype), true);
    shouldBe(S.a, 1);
    shouldBe(S.c, 3);
    shouldBe(S.getB(), 2);
    S.a = 2;
    shouldBe(S.a, 2);
    shouldBe(Reflect.set(S, "d", 1), false);
    shouldBe(Reflect.set(S.prototype, "d", 1), false);
    shouldBe(Reflect.deleteProperty(S.prototype, "method"), false);
    shouldBe(Reflect.setPrototypeOf(S, null), false);
    shouldBe(Reflect.setPrototypeOf(S.prototype, null), false);
    shouldBe(S.prototype.constructor, S);
    shouldBe(S.name, "S");
    shouldBe(S.length, 0);
    shouldBe(Reflect.ownKeys(S).join(), "length,name,prototype,getB,m,a,c");
    struct L { constructor(a, b) { } }
    shouldBe(L.length, 0);
    shouldBe(L.bind(null, 1).length, 0);
    shouldBe(L.bind().name, "bound L");
    struct StaticNames { static name() { return 1; } static length = 5; }
    shouldBe(StaticNames.name(), 1);
    shouldBe(StaticNames.length, 5);
    shouldBe(L.toString(), "struct L { constructor(a, b) { } }");
    shouldBe(Object.prototype.toString.call(new S), "[object Object]");
    shouldBe(typeof S, "function");
    S.prototype.method = () => 5;
    shouldBe(new S().method(), 5);
    let d = Object.getOwnPropertyDescriptor(S, "prototype");
    shouldBe(d.writable || d.enumerable || d.configurable, false);
}

{
    struct S { x = 1; static instance = new S; static { this.other = new this; } }
    shouldBe(S.instance.x, 1);
    shouldBe(S.other.x, 1);
}

{
    shouldThrow(() => { new T; struct T { } }, ReferenceError);
    shouldThrow(() => { struct T { static { T = 1; } } }, TypeError);
    shouldThrow(() => { struct T { [T] } }, ReferenceError);
    struct T { x }
    let Old = T;
    T = null;
    shouldBe(new Old().x, undefined);
    struct U { x = 1; clone() { let u = new U; u.x = this.x; return u; } }
    let u = new U;
    u.x = 5;
    shouldBe(u.clone().x, 5);
}

{
    struct Outer {
        #x = 1;
        make() {
            let outer = this;
            struct Inner { #x = 2; sum() { return this.#x + outer.#y; } }
            return new Inner;
        }
        #y = 40;
    }
    shouldBe(new Outer().make().sum(), 42);
    struct First { #x = 1; get() { return this.#x; } }
    struct Second extends First { #x = 2; get2() { return this.#x; } }
    let s = new Second;
    shouldBe(s.get(), 1);
    shouldBe(s.get2(), 2);
    shouldBe(Reflect.ownKeys(s).length, 0);
}

{
    struct S {
        #v = 1;
        get #a() { return this.#v; }
        set #a(v) { this.#v = v; }
        static get #sa() { return 5; }
        bump() { this.#a = this.#a + 1; return this.#a; }
        static read() { return this.#sa; }
    }
    shouldBe(new S().bump(), 2);
    shouldBe(S.read(), 5);
}

{
    struct S { f = function () { }; g = () => { }; ["h"] = class { }; #i = () => { }; get i() { return this.#i; } }
    let s = new S;
    shouldBe(s.f.name, "f");
    shouldBe(s.g.name, "g");
    shouldBe(s.h.name, "h");
    shouldBe(s.i.name, "#i");
}

{
    let instance;
    struct S { x = 1; constructor() { instance = this; throw new RangeError; } }
    shouldThrow(() => new S, RangeError);
    shouldBe(instance.x, 1);
    struct T { x = (() => { throw new RangeError })(); }
    shouldThrow(() => new T, RangeError);
    struct U { constructor() { try { return 1; } finally { this.x = 5; } } x; }
    shouldBe(new U().x, 5);
}

{
    struct S { "01"; "-1"; 1.5; "4294967295"; }
    shouldBe(Object.keys(new S).length, 4);
}
