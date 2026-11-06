//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")

function shouldBe(actual, expected) {
    if (actual !== expected)
        throw new Error("expected " + String(expected) + " but got " + String(actual));
}

function shouldThrow(f, type) {
    let error;
    try { f(); } catch (e) { error = e; }
    if (!(error instanceof type))
        throw new Error("expected " + type.name + " but got " + String(error));
}

function keys(o) { return Reflect.ownKeys(o).map(String).join(); }

let computed = 3;
struct Pair {
    b = "b";
    1 = "one";
    0 = "zero";
    [computed] = "three";
    ["7"];
    "01" = "named";
    #p = 5;
    4294967294 = "max";
    4294967295 = "not an index";
    get p() { return this.#p; }
    5() { return this[0]; }
}

function check(pair) {
    shouldBe(keys(pair), "0,1,3,7,4294967294,b,01,4294967295");
    shouldBe(pair[0], "zero");
    shouldBe(pair["1"], "one");
    shouldBe(pair[2], undefined);
    shouldBe(pair[3], "three");
    shouldBe(pair[7], undefined);
    shouldBe(7 in pair, true);
    shouldBe(Object.hasOwn(pair, 2), false);
    shouldBe(pair[4294967294], "max");
    shouldBe(pair[4294967295], "not an index");
    shouldBe(pair["01"], "named");
    shouldBe(pair.b, "b");
    shouldBe(pair.p, 5);
    shouldBe(pair[5](), "zero");
}

function checkShape(pair) {
    "use strict";
    shouldBe(Object.isExtensible(pair), false);
    shouldBe(Object.isSealed(pair), true);
    shouldBe(Object.isFrozen(pair), false);
    let descriptor = Object.getOwnPropertyDescriptor(pair, 0);
    shouldBe(descriptor.writable, true);
    shouldBe(descriptor.enumerable, true);
    shouldBe(descriptor.configurable, false);

    for (let index of [2, 8, 100, 1000000, 4294967293]) {
        shouldThrow(() => { pair[index] = 1; }, TypeError);
        shouldThrow(() => Object.defineProperty(pair, index, { value: 1 }), TypeError);
        shouldBe(Reflect.set(pair, index, 1), false);
        shouldBe(Reflect.defineProperty(pair, index, { value: 1, writable: true, enumerable: true, configurable: true }), false);
        shouldBe(Reflect.deleteProperty(pair, index), true);
    }
    for (let index of [0, 7, 4294967294]) {
        let old = pair[index];
        shouldThrow(() => { delete pair[index]; }, TypeError);
        shouldThrow(() => Object.defineProperty(pair, index, { writable: false }), TypeError);
        shouldThrow(() => Object.defineProperty(pair, index, { value: 1, writable: false }), TypeError);
        shouldThrow(() => Object.defineProperty(pair, index, { enumerable: false }), TypeError);
        shouldThrow(() => Object.defineProperty(pair, index, { configurable: true }), TypeError);
        shouldThrow(() => Object.defineProperty(pair, index, { get() { } }), TypeError);
        shouldBe(pair[index], old);
        Object.defineProperty(pair, index, { value: "defined" });
        shouldBe(pair[index], "defined");
        Object.defineProperty(pair, index, { value: old, writable: true, enumerable: true, configurable: false });
        Object.defineProperty(pair, index, { });
        shouldBe(pair[index], old);
    }
    shouldThrow(() => Object.freeze(pair), TypeError);
    shouldBe(Object.seal(pair), pair);
    shouldBe(Object.preventExtensions(pair), pair);
    shouldBe(keys(pair), "0,1,3,7,4294967294,b,01,4294967295");
}

check(new Pair);
checkShape(new Pair);

{
    struct Derived extends Pair {
        0 = "derived zero";
        9 = "nine";
        constructor() { super(); this[7] = "seven"; }
    }
    let derived = new Derived;
    shouldBe(keys(derived), "0,1,3,7,9,4294967294,b,01,4294967295");
    shouldBe(derived[0], "derived zero");
    shouldBe(derived[1], "one");
    shouldBe(derived[7], "seven");
    shouldBe(derived[9], "nine");
    shouldBe(derived.p, 5);

    struct Named extends Pair { x = 1; }
    shouldBe(keys(new Named), "0,1,3,7,4294967294,b,01,4294967295,x");
    struct Base { x = 1; }
    struct IndexedChild extends Base { 0 = this.x; }
    shouldBe(new IndexedChild()[0], 1);
    shouldBe(keys(new Base), "x");
}

{
    let seen;
    struct Order { 0 = (seen = Reflect.ownKeys(this).join(), this[1]); 1 = 2; 1 = 3; }
    let o = new Order;
    shouldBe(seen, "0,1");
    shouldBe(o[0], undefined);
    shouldBe(o[1], 3);
}

{
    let pair = new Pair;
    let names = [];
    for (let name in pair)
        names.push(name);
    shouldBe(names.join(), "0,1,3,7,4294967294,b,01,4294967295");
    shouldBe(JSON.stringify(new (struct_small())), '{"0":1,"2":3,"a":4}');
    let copy = { ...pair };
    shouldBe(copy[0], "zero");
    copy[50] = 1;
    copy = Object.assign([], pair);
    shouldBe(copy[1], "one");
    let child = Object.create(pair);
    shouldBe(child[0], "zero");
    child[0] = 1;
    child[2] = 2;
    shouldBe(child[2], 2);
    shouldBe(pair[0], "zero");
    let array = [, , 5];
    Object.setPrototypeOf(array, pair);
    shouldBe(array[0], "zero");
    array[0] = 4;
    shouldBe(pair[0], "zero");
    shouldBe(Array.prototype.slice.call({ __proto__: pair, length: 2 }).join(), "zero,one");
}

{
    struct Like { 0 = 3; 1 = 1; 2 = 2; length = 3; }
    let values = (o) => [o[0], o[1], o[2], o.length].join();
    let run = (method, ...args) => {
        let like = new Like;
        Array.prototype[method].apply(like, args);
        shouldBe(keys(like), "0,1,2,length");
        return values(like);
    };
    shouldBe(run("sort"), "1,2,3,3");
    shouldBe(run("reverse"), "2,1,3,3");
    shouldBe(run("fill", 7), "7,7,7,3");
    shouldBe(run("copyWithin", 0, 1), "1,2,2,3");
    shouldBe(Array.prototype.map.call(new Like, x => x * 2).join(), "6,2,4");
    for (let method of ["push", "unshift", "pop", "shift"])
        shouldThrow(() => run(method, 9), TypeError);
}

{
    let define = (named, indexed, parent = "") => {
        let source = `struct S ${parent} {`;
        for (let i = 0; i < named; ++i)
            source += `n${i};`;
        for (let i = 0; i < indexed; ++i)
            source += `${i};`;
        return (0, eval)(source + "} S");
    };
    define(0, 16384);
    define(8000, 8384);
    shouldThrow(() => define(0, 16385), TypeError);
    shouldThrow(() => define(8001, 8384), TypeError);
    globalThis.LimitParent = define(8000, 8384);
    define(8000, 8384, "extends LimitParent");
}

{
    let message = (f) => { try { f(); } catch (e) { return e.message; } };
    struct Named { a; }
    shouldBe(message(() => { "use strict"; new Pair()[2] = 1; }), message(() => { "use strict"; new Named()[2] = 1; }));
}

function struct_small() {
    struct Small { 0 = 1; a = 4; 2 = 3; }
    return Small;
}

{
    let source = "struct Big {";
    for (let i = 0; i < 100; ++i)
        source += `f${i} = ${i}; ${i * 3} = ${i};`;
    let Big = (0, eval)(source + "} Big");
    for (let n = 0; n < 200; ++n) {
        let big = new Big;
        if (!(n % 50))
            gc();
        for (let i = 0; i < 100; ++i) {
            shouldBe(big["f" + i], i);
            shouldBe(big[i * 3], i);
        }
    }
}

function make() { return new Pair; }
noInline(make);
function set(o, i, v) { o[i] = v; return o[i]; }
noInline(set);
function strictSet(o, i, v) { "use strict"; o[i] = v; }
noInline(strictSet);
function read(o) { return o[0] + o[1]; }
noInline(read);
function local(i) { let p = new Pair; p[0] = i; return p[0]; }
noInline(local);

function hot() {
    let kept = [];
    for (let i = 0; i < testLoopCount; ++i) {
        let pair = make();
        shouldBe(read(pair), "zeroone");
        shouldBe(set(pair, 0, i), i);
        shouldBe(set(pair, 2, i), undefined);
        shouldBe(local(i), i);
        if (!(i % 100)) {
            shouldThrow(() => strictSet(pair, 2, 1), TypeError);
            strictSet(pair, 1, { i });
            kept.push(pair);
        }
    }
    gc();
    kept.forEach((pair, n) => {
        shouldBe(pair[0], n * 100);
        shouldBe(pair[1].i, n * 100);
    });
    return kept;
}
let kept = hot();

let intercepted = 0;
Object.defineProperty(Object.prototype, 2, { set(value) { intercepted = value; }, configurable: true });
{
    let pair = new Pair;
    pair[2] = 10;
    shouldBe(intercepted, 10);
    check(pair);
    pair[0] = "x";
    shouldBe(pair[0], "x");
}
kept[0][2] = 11;
shouldBe(intercepted, 11);
shouldBe(keys(kept[0]), "0,1,3,7,4294967294,b,01,4294967295");
delete Object.prototype[2];
checkShape(new Pair);
hot();
