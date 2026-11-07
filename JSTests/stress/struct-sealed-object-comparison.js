//@ skip if !$structsEnabled
//@ slow!
//@ requireOptions("--useStructs=1")

// A struct instance behaves like a sealed ordinary object with the same properties, except that
// the attributes of its fields cannot change. None of the operations below try to change them to
// something that a sealed object allows.

function describe(value, seen) {
    if (typeof value === "function") return "function";
    if (typeof value !== "object" || value === null) return typeof value + ":" + (Object.is(value, -0) ? "-0" : String(value));
    if (seen.has(value)) return seen.get(value);
    if (seen.size > 5) return "deep";
    seen = new Map(seen).set(value, "seen");
    let properties = Reflect.ownKeys(value)
        .slice(0, 40)
        .map(key => {
            let { writable, enumerable, configurable, value: v } = Object.getOwnPropertyDescriptor(value, key);
            return [String(key), writable, enumerable, configurable, describe(v, seen)].join();
        });
    return `${Array.isArray(value)}{${properties.join(";")}}${Object.isExtensible(value)}`;
}

function run(operation, object, key) {
    let result;
    try {
        result = describe(
            operation(object, key),
            new Map([
                [object, "self"],
                [Object.getPrototypeOf(object), "prototype"],
            ]),
        );
    } catch (e) {
        result = e.constructor.name;
    }
    return result + " " + describe(object, new Map([[Object.getPrototypeOf(object), "prototype"]]));
}

function sealedCopy(object) {
    let descriptors = Object.getOwnPropertyDescriptors(object);
    for (let key of Reflect.ownKeys(descriptors)) descriptors[key].configurable = true;
    let copy = Object.create(Object.getPrototypeOf(object), descriptors);
    for (let key of Reflect.ownKeys(copy)) {
        if (copy[key] === object) copy[key] = copy;
    }
    return Object.seal(copy);
}

let structs = [
    `b = "b"; 1 = "one"; 0 = "zero"; ["7"]; "01" = "n"; 4294967294 = "max"; 4294967295 = "no"; "-0" = "m";`,
    `0 = 3; 1 = 1; 2 = 2; length = 3;`,
    `x = 1;`,
    `0;`,
    `5 = 1; [Symbol.for("q")] = 2; ["__proto__"] = 9;`,
    `length = 4294967295; 4294967294 = 1; 4294967293 = 2;`,
    `0 = 0; 1 = 1; 2 = 2; 3 = 3; length = 4; [Symbol.isConcatSpreadable] = true;`,
    `0 = 1.5; 1 = {}; 2 = -0; 10000 = 1; 100001 = 2; length = 4;`,
    `a0; a1; a2; a3; a4; a5; a6; a7; a8; a9; 0 = 1; 1 = 2; length = 2;`,
    `1.5 = 1; "-1" = 2; 1e3 = 3; 0x10 = 4; 0b11 = 5; 1n = 6; "1e3" = 7; 2147483647 = 8; 2147483648 = 9; 2147483646 = 1;`,
    `0 = 1;  1 = 2;  length = 2;  toJSON;`,
    `0 = this; 1 = this[0] === this; 2 = (this[1] = 5, this[1]);`,
].map(fields => (0, eval)(`(function () { struct S { ${fields} } return S; })()`));

let keys = [
    "0",
    "1",
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    50,
    100,
    1000,
    9999,
    10000,
    10001,
    100001,
    65536,
    2 ** 31 - 2,
    2 ** 31 - 1,
    2 ** 31,
    2 ** 32 - 3,
    2 ** 32 - 2,
    2 ** 32 - 1,
    2 ** 32,
    "4294967294",
    "4294967295",
    -0,
    "-0",
    -1,
    1.5,
    "01",
    "1e3",
    "b",
    "x",
    "a0",
    "length",
    "constructor",
    "__proto__",
    "toJSON",
    Symbol.for("q"),
    Symbol.iterator,
];

let keyedOperations = [
    (o, k) => o[k],
    (o, k) => k in o,
    (o, k) => Object.hasOwn(o, k),
    (o, k) => Object.getOwnPropertyDescriptor(o, k),
    (o, k) => {
        o[k] = 5;
        return o[k];
    },
    (o, k) => {
        "use strict";
        o[k] = 5;
    },
    (o, k) => delete o[k],
    (o, k) => {
        "use strict";
        return delete o[k];
    },
    (o, k) => Reflect.set(o, k, 7),
    (o, k) => {
        let t = {};
        let r = Reflect.set(o, k, 7, t);
        return [r, t];
    },
    (o, k) => Reflect.set({}, k, 7, o),
    (o, k) => Reflect.set([], k, 7, o),
    (o, k) => Reflect.set([1, 2, 3, 4], k, 7, o),
    (o, k) => {
        let a = [1, 2];
        let r = Reflect.set(o, k, 7, a);
        return [r, a.length < 10 ? a : a.length];
    },
    (o, k) => Reflect.set(o, k, 7, 1),
    (o, k) => {
        let f = Object.freeze([1, 2, 3]);
        return Reflect.set(o, k, 7, f);
    },
    (o, k) => {
        let t = new Uint8Array(3);
        let r = Reflect.set(o, k, 7, t);
        return [r, String(t)];
    },
    (o, k) => Reflect.set(new Uint8Array(3), k, 7, o),
    (o, k) => Reflect.set(Object.create(o), k, 7, o),
    (o, k) => {
        let p = new Proxy(o, {});
        return Reflect.set(o, k, 7, p);
    },
    (o, k) => Reflect.set(new Proxy(o, {}), k, 7),
    (o, k) => Reflect.set(new Proxy(o, {}), k, 7, o),
    (o, k) => Reflect.get({ __proto__: o }, k, 3),
    (o, k) => Reflect.get(o, k, { 0: "zz" }),
    (o, k) => Reflect.defineProperty(o, k, { value: 9 }),
    (o, k) => Reflect.defineProperty(o, k, {}),
    (o, k) => Reflect.defineProperty(o, k, { value: o[k], writable: true, enumerable: true, configurable: false }),
    (o, k) =>
        Reflect.defineProperty(o, k, {
            get() {
                return 1;
            },
        }),
    (o, k) => Reflect.defineProperty(o, k, { enumerable: false }),
    (o, k) => Reflect.defineProperty(o, k, { configurable: true }),
    (o, k) => Reflect.defineProperty(o, k, { writable: true }),
    (o, k) => Object.defineProperty(o, k, { value: o }),
    (o, k) => o.__defineGetter__(k, () => 1),
    (o, k) => o.__defineSetter__(k, () => 1),
    (o, k) => o.__lookupGetter__(k),
    (o, k) => Object.prototype.propertyIsEnumerable.call(o, k),
    (o, k) => ({ __proto__: o })[k],
    (o, k) => {
        let c = { __proto__: o };
        c[k] = 3;
        return [Object.hasOwn(c, k), c[k]];
    },
    (o, k) => {
        "use strict";
        let c = [];
        Object.setPrototypeOf(c, o);
        if ((typeof k === "number" && k > 20) || Number(k) > 20) return;
        c[k] = 3;
        return [c.length, Object.hasOwn(c, k), c[k]];
    },
    (o, k) => {
        let c = Object.create(o);
        return [Reflect.defineProperty(c, k, { value: 1 }), k in c, delete c[k], c[k]];
    },
    (o, k) => {
        let h = {
            __proto__: o,
            g(k) {
                return super[k];
            },
            s(k, v) {
                super[k] = v;
            },
        };
        let a = h.g(k);
        h.s(k, 8);
        return [a, Object.hasOwn(h, k), h[k]];
    },
    (o, k) => {
        let a = o[k]++;
        return [a, o[k]];
    },
    (o, k) => (o[k] += 1),
    (o, k) => (o[k] ||= 4),
    (o, k) => (o[k] ??= 4),
    (o, k) => new Proxy(o, {})[k],
    (o, k) => delete new Proxy(o, {})[k],
    (o, k) =>
        new Proxy(o, {
            get() {
                return "lie";
            },
        })[k],
    (o, k) =>
        k in
        new Proxy(o, {
            has() {
                return false;
            },
        }),
    (o, k) =>
        Reflect.ownKeys(
            new Proxy(o, {
                ownKeys() {
                    return [];
                },
            }),
        ),
    (o, k) => Object.getOwnPropertyDescriptor(new Proxy(o, { getOwnPropertyDescriptor() {} }), k),
    (o, k) =>
        typeof k === "string" && /^[a-z]\w*$/.test(k) && k !== "constructor"
            ? (0, eval)(`(o=>{with(o){try{${k}=3}catch(e){return String(e)} return typeof ${k}}})`)(o)
            : 0,
    (o, k) => {
        let { [k]: v = 77, ...rest } = o;
        return [v, rest];
    },
    (o, k) => {
        [o[k]] = [44];
        return o[k];
    },
    (o, k) => o?.[k],
];

let operations = [
    o => Object.keys(o),
    o => Reflect.ownKeys(o).map(String),
    o => Object.values(o),
    o => Object.entries(o),
    o => Object.getOwnPropertyNames(o),
    o => Object.getOwnPropertySymbols(o).map(String),
    o => {
        let r = [];
        for (let k in o) r.push(k);
        return r;
    },
    o => {
        let r = [];
        let c = { __proto__: o, 1: 1, zz: 2 };
        for (let k in c) r.push(k);
        return r;
    },
    o => {
        let r = [];
        for (let k in o) {
            r.push(k);
            try {
                delete o[k];
            } catch {}
            o[k] = 0;
        }
        return r;
    },
    o => JSON.stringify(o),
    o => JSON.stringify(o, null, 2),
    o => JSON.stringify([o, o], ["0", "length", "b"]),
    o => JSON.stringify(o, (k, v) => (k === "" ? v : typeof v)),
    o => JSON.stringify({ a: [o] }),
    o => ({ ...o }),
    o => ({ 0: 9, ...o, b: 2 }),
    o => Object.assign({}, o),
    o => {
        let a = Object.assign([], { ...o, length: undefined === o.length ? 0 : 3 });
        return a.length;
    },
    o => Object.assign(o, { 0: 1 }),
    o => Object.assign(o, { 1: 1, q: 3 }),
    o => Object.assign(o, [5, 6, 7]),
    o => Object.assign(o, o),
    o => Object.assign(o, "ab"),
    o => Object.isFrozen(o),
    o => Object.isSealed(o),
    o => Object.isExtensible(o),
    o => Object.seal(o),
    o => Reflect.preventExtensions(o),
    o => Reflect.setPrototypeOf(o, {}),
    o => Reflect.setPrototypeOf(o, Object.getPrototypeOf(o)),
    o => Object.fromEntries(Object.entries(o)),
    o => Object.groupBy(Object.keys(o), k => (o[k] === undefined ? "u" : "d")),
    o => [...Map.groupBy(Object.values(o), v => typeof v)].length,
    o => {
        let r = [].concat(o);
        return r.length < 50 ? r : r.length;
    },
    o => {
        if (o.length > 50) return;
        return Array.prototype.concat.call(o, o).length;
    },
    o => Object.prototype.toString.call(o),
    o => {
        if (o.length > 50) return;
        return ((...a) => a)(...Array.prototype.slice.call(o));
    },
    o => {
        if (o.length > 50) return;
        return Reflect.apply((...a) => a, null, o);
    },
    o => {
        if (o.length > 50) return;
        return Math.max.apply(null, o);
    },
    o => {
        if (o.length > 50) return;
        return Function.prototype.apply.call(
            function () {
                return arguments.length + ":" + arguments[0];
            },
            null,
            o,
        );
    },
    o => {
        if (o.length > 50) return;
        return Array.from(o);
    },
    o => {
        if (o.length > 50) return;
        Array.fromAsync(o);
    },
    o => {
        if (o.length > 50) return;
        return String(new Float64Array(o));
    },
    o => {
        if (o.length > 50) return;
        let t = new Uint8Array(9);
        t.set(o, 1);
        return String(t);
    },
    o => {
        if (o.length > 50) return;
        return String(Uint8Array.from(o));
    },
    o => Object.defineProperties(o, Object.getOwnPropertyDescriptors(o)),
    o => Object.defineProperties(o, { 0: { value: 1 }, 1: { value: 2 } }),
    o => {
        try {
            return Object.create({}, o);
        } catch (e) {
            return e.constructor.name;
        }
    },
    o => {
        for (let x of Array.prototype.values.call(o.length > 50 ? {} : o));
    },
    o => {
        if (o.length > 50) return;
        return [...Array.prototype.entries.call(o)];
    },
    o => "abc".replace(/b/, () => o[0]),
    o => {
        if (o.length > 50) return;
        return String.raw({ raw: o }, 1, 2);
    },
    o => new WeakMap([[o, 1]]).get(o),
    o => new Map([[0, o]]).get(0) === o,
    o => {
        class B {
            constructor(o) {
                return o;
            }
        }
        class D extends B {
            0 = 5;
        }
        new D(o);
    },
    o => {
        class B {
            constructor(o) {
                return o;
            }
        }
        class D extends B {
            1;
            b = 2;
        }
        new D(o);
    },
    o => {
        function F() {}
        F.prototype = o;
        return [new F()[0], new F()[1]];
    },
    o => {
        let r = Reflect.construct(Array, [], Object.defineProperty(function () {}.bind(), "prototype", { value: o }));
        return [r[0], r.length];
    },
    o =>
        (function () {
            Object.setPrototypeOf(arguments, o);
            return [arguments[0], arguments[1], 0 in arguments];
        })(),
    o => {
        let a = [, , 3];
        Object.setPrototypeOf(a, o);
        return [a[0], a[1], 0 in a, Array.prototype.join.call(a), Array.prototype.indexOf.call(a, 1), [...Array.prototype.values.call(a)]];
    },
    o => {
        let a = [, , 3];
        Object.setPrototypeOf(a, o);
        Array.prototype.reverse.call(a);
        return Array.from(a);
    },
    o => {
        let a = [, 1.5, 2.5];
        Object.setPrototypeOf(a, o);
        Array.prototype.sort.call(a);
        return Array.from(a);
    },
    o => {
        let a = [, , 3];
        Object.setPrototypeOf(a, o);
        Array.prototype.push.call(a, 1);
        Array.prototype.shift.call(a);
        return [Object.hasOwn(a, 0), a[0], a.length];
    },
    o => {
        let a = new Array(5);
        Object.setPrototypeOf(a, o);
        a[0] = 1;
        a[4] = 2;
        ("use strict");
        return [a[1], Array.prototype.concat.call(a, [1]).length];
    },
    o => {
        let a = Object.setPrototypeOf(new String("a"), o);
        return [a[0], a[1], a[2]];
    },
    o => {
        let a = Object.setPrototypeOf(new Uint8Array(1), o);
        a[1] = 5;
        return [a[0], a[1], 1 in a];
    },
    o => Array.isArray(o),
    o =>
        Iterator.from({
            next() {
                return o;
            },
        }).next() === o,
    o => {
        try {
            return o + "";
        } catch (e) {
            return e.constructor.name;
        }
    },
    o => {
        new FinalizationRegistry(() => {}).register(o, 1);
    },
    o => {
        if (o.length > 50) return;
        return [[o]].flat(Infinity);
    },
    o => {
        if (o.length > 50) return;
        return Array.prototype.join.call(o);
    },
];

let methods = {
    push: [1],
    pop: [],
    shift: [],
    unshift: [1],
    splice: [0, 1],
    reverse: [],
    sort: [],
    fill: [4, 1, 2],
    copyWithin: [0, 1],
    slice: [1],
    concat: [[1]],
    indexOf: [1],
    lastIndexOf: [1],
    includes: [undefined],
    map: [x => x],
    filter: [x => x],
    reduce: [(a, b) => typeof b, 0],
    every: [x => true],
    some: [x => false],
    find: [x => false],
    findLastIndex: [x => 0],
    at: [-1],
    flatMap: [x => [x, x]],
    toSorted: [],
    toReversed: [],
    toSpliced: [0, 1],
    with: [0, 3],
    join: ["-"],
    toLocaleString: [],
    toString: [],
};
for (let name in methods)
    operations.push(o => {
        if (!(o.length > 50)) return Array.prototype[name].apply(o, methods[name]);
    });
operations.push(o => {
    if (o.length > 50) return Array.prototype.push.call(o, 1);
});
operations.push(o => {
    if (o.length > 50) return Array.prototype.pop.call(o);
});
operations.push(o => {
    if (o.length > 50) return Array.prototype.lastIndexOf.call(o, 1);
});

function compare(Struct, operation, key) {
    let object = new Struct();
    let actual = run(operation, object, key);
    let expected = run(operation, sealedCopy(new Struct()), key);
    if (actual !== expected) throw new Error(`${operation} with ${String(key)}:\n${actual}\n${expected}`);
}

function compareAll() {
    for (let Struct of structs) {
        for (let operation of keyedOperations) {
            for (let key of keys) compare(Struct, operation, key);
        }
        for (let operation of operations) compare(Struct, operation);
    }
}

compareAll();
Object.defineProperty(Object.prototype, 3, {
    get() {
        return "getter";
    },
    set() {},
    configurable: true,
});
Object.defineProperty(Object.prototype, 4, { value: "read only", writable: false, configurable: true });
Object.defineProperty(Object.prototype, 0, { value: "read only", writable: false, configurable: true });
Object.defineProperty(Object.prototype, 1, {
    get() {
        return "getter";
    },
    set() {
        throw new RangeError();
    },
    configurable: true,
});
compareAll();
