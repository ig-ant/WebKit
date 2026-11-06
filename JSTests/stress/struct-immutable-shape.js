//@ requireOptions("--useStructs=1")

function shouldBe(actual, expected) {
    if (!Object.is(actual, expected))
        throw new Error(`expected ${String(expected)} but got ${String(actual)}`);
}

function shouldThrow(func, errorType = TypeError) {
    let error;
    try {
        func();
    } catch (e) {
        error = e;
    }
    if (!(error instanceof errorType))
        throw new Error(`expected ${errorType.name} but got ${String(error)}`);
}

function checkShape(s, keys) {
    shouldBe(Reflect.ownKeys(s).map(String).join(), keys);
    for (let key of Reflect.ownKeys(s)) {
        let descriptor = Object.getOwnPropertyDescriptor(s, key);
        shouldBe(descriptor.writable, true);
        shouldBe(descriptor.enumerable, true);
        shouldBe(descriptor.configurable, false);
    }
    shouldBe(Object.isExtensible(s), false);
    shouldBe(Object.isSealed(s), true);
}

struct S { x = 1; y = 2; #p = 3; p() { return this.#p; } }

let mutations = [
    s => { shouldBe(Reflect.set(s, "z", 1), false); },
    s => { "use strict"; shouldThrow(() => { s.z = 1; }); },
    s => { (0, eval)("(s, v) => { s.z = v; }")(s, 1); },
    s => { "use strict"; shouldThrow(() => { s[Symbol()] = 1; }); },
    s => { (0, eval)("(s, v) => { s[0] = v; s[100] = v; s[4294967294] = v; s[4294967295] = v; s[-1] = v; s[1.5] = v; }")(s, 1); },
    s => { "use strict"; shouldThrow(() => { s[0] = 1; }); },
    s => { "use strict"; shouldThrow(() => { s[1000000] = 1; }); },
    s => { shouldThrow(() => Object.defineProperty(s, 0, { value: 1 })); },
    s => { shouldThrow(() => Object.defineProperty(s, "z", { value: 1 })); },
    s => { shouldBe(Reflect.defineProperty(s, "z", { get() { } }), false); },
    s => { shouldBe(Reflect.defineProperty(s, "x", { get() { } }), false); },
    s => { shouldBe(Reflect.defineProperty(s, "x", { enumerable: false }), false); },
    s => { shouldBe(Reflect.defineProperty(s, "x", { configurable: true }), false); },
    s => { shouldBe(Reflect.defineProperty(s, "x", { writable: false }), false); },
    s => { shouldBe(Reflect.defineProperty(s, "x", { value: 5, writable: false }), false); shouldBe(s.x, 1); },
    s => { shouldBe(Reflect.defineProperty(s, "x", { value: 1 }), true); },
    s => { shouldBe(Reflect.defineProperty(s, "x", { value: 5 }), true); shouldBe(s.x, 5); s.x = 1; },
    s => { shouldBe(Reflect.defineProperty(s, "x", { value: 1, writable: true, enumerable: true, configurable: false }), true); },
    s => { shouldBe(Reflect.defineProperty(s, "x", { }), true); },
    s => { shouldBe(Reflect.defineProperty(s, 0, { }), false); },
    s => { shouldThrow(() => Object.freeze(s)); },
    s => { shouldBe(Object.seal(s), s); },
    s => { shouldBe(Object.preventExtensions(s), s); },
    s => { shouldBe(Reflect.preventExtensions(s), true); },
    s => { shouldBe(Reflect.deleteProperty(s, "x"), false); },
    s => { shouldBe(Reflect.deleteProperty(s, "z"), true); },
    s => { shouldBe(Reflect.deleteProperty(s, 0), true); },
    s => { (0, eval)("s => { delete s.x; delete s[0]; }")(s); },
    s => { shouldThrow(() => Object.setPrototypeOf(s, null)); },
    s => { shouldThrow(() => Object.setPrototypeOf(s, {})); },
    s => { shouldBe(Object.setPrototypeOf(s, S.prototype), s); },
    s => { shouldBe(Reflect.setPrototypeOf(s, {}), false); },
    s => { shouldThrow(() => { s.__proto__ = {}; }); },
    s => { shouldThrow(() => s.__defineGetter__("x", () => 1)); },
    s => { shouldThrow(() => s.__defineGetter__("z", () => 1)); },
    s => { shouldThrow(() => s.__defineSetter__(0, () => 1)); },
    s => { shouldThrow(() => Object.defineProperties(s, { a: { value: 1 } })); },
    s => { shouldThrow(() => Object.assign(s, { z: 1 })); },
    s => { shouldThrow(() => Object.assign(s, { z: 1 }, { y: 1 })); s.y = 2; },
    s => { Object.assign(s, { x: 1, y: 2 }); Object.assign(s, { x: 1 }, { y: 2 }); },
    s => { shouldThrow(() => Array.prototype.push.call(s, 1)); },
    s => { Array.prototype.fill.call(s, 1); },
    s => { shouldThrow(() => Array.prototype.unshift.call(s, 1)); },
    s => { shouldThrow(() => Array.prototype.splice.call(s, 0, 0, 1)); },
    s => { shouldThrow(() => Array.prototype.pop.call(s)); },
    s => { Array.prototype.sort.call(s); Array.prototype.reverse.call(s); },
    s => { shouldThrow(() => Array.from.call(function () { return s; }, [1, 2])); },
    s => { shouldThrow(() => Array.of.call(function () { return s; }, 1, 2)); },
    s => { class Base { constructor(o) { return o; } } class D extends Base { #x = 1; } shouldThrow(() => new D(s)); },
    s => { class Base { constructor(o) { return o; } } class D extends Base { #x() { } } shouldThrow(() => new D(s)); },
    s => { class Base { constructor(o) { return o; } } class D extends Base { x = 5; } shouldThrow(() => new D(s)); s.x = 1; },
    s => { class Base { constructor(o) { return o; } } class D extends Base { z = 5; } shouldThrow(() => new D(s)); },
    s => { class Base { constructor(o) { return o; } } class D extends Base { 0 = 5; } shouldThrow(() => new D(s)); },
    s => { let o = Object.create(s); shouldBe(o.x, 1); o.z = 1; shouldBe(o.z, 1); o.x = 3; shouldBe(o.x, 3); shouldBe(s.x, 1); },
    s => { let o = { __proto__: s }; shouldBe(o.y, 2); o[0] = 1; },
    s => { let a = [1, , 3]; a.__proto__ = s; shouldBe(a[1], undefined); a[1] = 2; },
    s => { function F() { } F.prototype = s; shouldBe(new F().x, 1); shouldBe(new F() instanceof F, true); },
    s => { Function.prototype; let f = function () { }; Object.setPrototypeOf(f, s); shouldBe(f.x, 1); },
    s => { class C { static m() { return super.x; } } Object.setPrototypeOf(C, s); shouldBe(C.m(), 1); },
    s => { let o = { ...s }; shouldBe(Object.getPrototypeOf(o), Object.prototype); o.z = 1; shouldBe(Object.keys(o).join(), "x,y,z"); },
    s => { let o = Object.assign({}, s); o.z = 1; shouldBe(delete o.x, true); shouldThrow(() => S.prototype.p.call(o)); },
    s => { let { x, ...rest } = s; rest.z = 1; shouldBe(Object.keys(rest).join(), "y,z"); },
    s => { let o = Object.fromEntries(Object.entries(s)); o.z = 1; },
    s => { for (let k in s) shouldBe(k === "x" || k === "y", true); },
    s => { try { Error.captureStackTrace(s); } catch { } },
    s => { new WeakMap([[s, 1]]); new Map([[s, 1]]); new WeakRef(s); new FinalizationRegistry(() => { }).register(s, 1); },
    s => { let p = new Proxy(s, {}); shouldBe(Reflect.set(p, "z", 1), false); p.x = 1; shouldThrow(() => Object.freeze(p)); },
    s => { with_(s); },
    s => { s.x++; s.x--; s.x += 1; s.x -= 1; s.x ||= 5; s.x &&= 1; [s.x, s.y] = [1, 2]; ({ a: s.x } = { a: 1 }); },
    s => { JSON.parse('[1]', () => s); JSON.stringify(s); },
    s => { Reflect.set({}, "q", 1, s); shouldBe(Reflect.set({}, "x", 1, s), true); shouldBe(Reflect.set([], 0, 1, s), false); },
    s => { shouldBe(s.hasOwnProperty("x"), true); shouldBe(s.propertyIsEnumerable("y"), true); },
    s => { let re = /a/; try { RegExp.prototype.exec.call(s, "a"); } catch { } },
    s => { try { Promise.resolve.call(function () { return s; }, 1); } catch { } },
    s => { try { Iterator.from(s); } catch { } },
    s => { try { Intl.DateTimeFormat.call(s); Intl.NumberFormat.call(s); } catch { } },
    s => { try { Reflect.apply(Error, s, ["a", s]); new Error("a", s); } catch { } },
];

const with_ = (0, eval)("(function (s) { with (s) { x = 1; y = 2; } })");

for (let iteration = 0; iteration < 3; ++iteration) {
    for (let mutate of mutations) {
        for (let i = 0; i < 150; ++i) {
            let s = new S;
            try {
                mutate(s);
            } catch (e) {
                throw new Error(`${mutate} failed: ${e}\n${e.stack}`);
            }
            checkShape(s, "x,y");
            shouldBe(s.p(), 3);
            shouldBe(s.x, 1);
            shouldBe(s.y, 2);
        }
    }
}

{
    struct HasStack { message; stack; name; cause; }
    for (let i = 0; i < 100; ++i) {
        let s = new HasStack;
        Error.captureStackTrace(s);
        shouldBe(typeof s.stack, "string");
        checkShape(s, "message,stack,name,cause");
    }
    struct HasToJSON { length; constructor_; lastIndex; value; done; raw; index; groups; get; set; }
    let t = new HasToJSON;
    try { RegExp.prototype.test.call(t, "a"); } catch { }
    checkShape(t, "length,constructor_,lastIndex,value,done,raw,index,groups,get,set");
    Array.prototype.push.call(Object.assign(t, { length: 0 }));
    checkShape(t, "length,constructor_,lastIndex,value,done,raw,index,groups,get,set");
}

{
    struct Empty { }
    shouldBe(Object.isFrozen(new Empty), true);
    let e = new Empty;
    shouldBe(Object.freeze(e), e);
    struct OnlyPrivate { #x = 1; get() { return this.#x; } set(v) { this.#x = v; } }
    let o = new OnlyPrivate;
    shouldBe(Object.freeze(o), o);
    o.set(2);
    shouldBe(o.get(), 2);
}

{
    let stored = [];
    struct P { x; set 5(v) { stored.push(v); } get 6() { return "six"; } }
    let p = new P;
    for (let i = 0; i < 100; ++i) {
        p[5] = i;
        shouldBe(p[6], "six");
        shouldBe(Reflect.set(p, 7, 1), false);
    }
    shouldBe(stored.length, 100);
    checkShape(p, "x");
}

{
    Object.defineProperty(Array.prototype, 3, { get() { return 1; }, configurable: true });
    Object.defineProperty(Object.prototype, 9, { set(v) { }, configurable: true });
    let s = new S;
    s[9] = 1;
    shouldBe(Reflect.set(s, 10, 1), false);
    checkShape(s, "x,y");
    struct Late { z = 1; }
    let l = new Late;
    shouldThrow(() => { "use strict"; l[0] = 1; });
    checkShape(l, "z");
    for (let mutate of mutations) {
        let s = new S;
        try { mutate(s); } catch { }
        checkShape(s, "x,y");
    }
}
