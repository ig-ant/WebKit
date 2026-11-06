//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")

function shouldBe(actual, expected) {
    if (!Object.is(actual, expected))
        throw new Error("expected " + String(expected) + " but got " + String(actual));
}

function shouldThrow(f, type = TypeError) {
    let error;
    try { f(); } catch (e) { error = e; }
    if (!(error instanceof type))
        throw new Error("expected " + type.name + " but got " + String(error));
}

function keys(o) { return Reflect.ownKeys(o).map(String).join(); }

{
    let log = [];
    let key = (value) => ({ [Symbol.toPrimitive](hint) { log.push(value + hint); return value; } });
    struct S { [key(2)]; [key(1)] = 0; static [key(0)] = 5; [key("z")]() { } }
    new S;
    shouldBe(log.join(), "2string,1string,0string,zstring");
    shouldBe(S[0], 5);
    shouldBe(keys(new S), "1,2");
}

{
    struct S {
        [-0]; [1e0]; [2n]; [4294967294n]; [4294967295n]; ["-0"]; [-1]; [NaN]; [null]; [[5]]; [true]; [0.5]; [1e21]; [2 ** 53];
    }
    shouldBe(keys(new S), "0,1,2,5,4294967294,4294967295,-0,-1,NaN,null,true,0.5,1e+21,9007199254740992");
}

{
    struct A { 0 = 1; 1 = 2; x = 3; }
    struct B extends A { 1 = 20; 0; 2 = 30; x; }
    let b = new B;
    shouldBe(keys(b), "0,1,2,x");
    shouldBe(b[0], 1);
    shouldBe(b[1], 20);
    shouldBe(b.x, 3);
    struct C extends B { 4 = this[1] + 1; }
    struct D extends C { 1 = this[4] + 1; }
    shouldBe(JSON.stringify(new D), '{"0":1,"1":22,"2":30,"4":21,"x":3}');
    shouldBe(JSON.stringify(new A), '{"0":1,"1":2,"x":3}');
}

{
    let symbol = Symbol("a");
    struct S { [symbol] = 1; 0 = 3; z = 4; [Symbol.toStringTag] = "T"; }
    let s = new S;
    shouldBe(keys(s), "0,z,Symbol(a),Symbol(Symbol.toStringTag)");
    shouldBe(Object.prototype.toString.call(s), "[object T]");
    shouldBe(Object.isSealed(s), true);
}

{
    let calls = 0;
    struct A { get 0() { calls++; return "getter"; } set 0(v) { calls++; } }
    struct B extends A {
        0 = 7;
        superGet() { return super[0]; }
        superSet() { super[0] = 9; return this[0]; }
    }
    let b = new B;
    shouldBe(b[0], 7);
    b[0] = 8;
    shouldBe(b[0], 8);
    shouldBe(calls, 0);
    shouldBe(b.superGet(), "getter");
    shouldBe(b.superSet(), 8);
    shouldBe(calls, 2);

    struct C { 0 = 1; get 0() { return 2; } own() { return this[0]; } }
    shouldBe(new C().own(), 1);
    shouldThrow(() => C.prototype[0]);
}

{
    struct A { }
    struct B extends A {
        0 = 1;
        own(v) { super[0] = v; return this[0]; }
        add() { super[1] = 2; }
    }
    let b = new B;
    shouldBe(b.own(5), 5);
    shouldThrow(() => b.add());
    shouldBe(keys(b), "0");
}

{
    struct A { 0() { } }
    Object.defineProperty(A.prototype, 0, { writable: false });
    shouldBe(Reflect.set(new A, 0, 1), false);
    struct B extends A { 0 = 3; }
    let b = new B;
    b[0] = 4;
    shouldBe(b[0], 4);
}

{
    struct N extends null { 0 = 1; 2 = 3; }
    let n = new N;
    shouldBe(n[1], undefined);
    shouldBe(Reflect.set(n, 1, 1), false);
    shouldBe(keys(n), "0,2");
}

{
    let leaked;
    struct S { 0 = (leaked = this, (() => { throw new RangeError; })()); 1 = 1; }
    shouldThrow(() => new S, RangeError);
    shouldBe(leaked[1], undefined);
    shouldBe(keys(leaked), "0,1");
    shouldBe(Object.isSealed(leaked), true);

    struct T { 0 = this[1]; 1 = (this[0] = 9, Reflect.set(this, 2, 1)); }
    let t = new T;
    shouldBe(t[0], 9);
    shouldBe(t[1], false);
}

{
    let source = "struct S {";
    for (let i = 0; i < 16384; ++i)
        source += `${i * 262143} = ${i};`;
    let S = (0, eval)(source + "} S");
    let s = new S;
    shouldBe(Object.keys(s).length, 16384);
    shouldBe(s[262143 * 16383], 16383);
    let count = 0;
    for (let name in { ...s })
        ++count;
    shouldBe(count, 16384);

    source = "struct S {";
    for (let i = 0; i < 20000; ++i)
        source += "0 = 1;";
    shouldBe(keys(new ((0, eval)(source + "} S"))), "0");
}

{
    let other = createGlobalObject();
    let Parent = other.eval("struct Parent { 0 = 1; b = 2; m() { return this[0]; } } Parent");
    struct Child extends Parent { 1 = 3; }
    let child = new Child;
    shouldBe(keys(child), "0,1,b");
    shouldBe(child.m(), 1);
    let calls = 0;
    Object.defineProperty(other.Object.prototype, 9, { set(v) { calls++; }, configurable: true });
    child[9] = 1;
    new Parent()[9] = 1;
    shouldBe(calls, 2);
    shouldBe(keys(child), "0,1,b");
    shouldThrow(() => { "use strict"; child[8] = 1; });
    child[0] = 5;
    shouldBe(child.m(), 5);
}

{
    struct S { 0 = "a"; 1 = "b"; length = 2; [Symbol.iterator] = Array.prototype[Symbol.iterator]; }
    shouldBe([...new S].join(), "a,b");
    let [x, y] = new S;
    shouldBe(x + y, "ab");
    shouldBe(Array.from(new S).join(), "a,b");
    let s = new S;
    s[0] = 65;
    s[1] = 66;
    shouldBe(String.fromCharCode.apply(null, s), "AB");
    shouldBe(String(new Uint8Array(s)), "65,66");
    let grouped = Object.groupBy(new S, value => value);
    shouldBe(Object.keys(grouped).join(), "a,b");
}

{
    struct S { 0 = 1; length = 1; }
    let s = new S;
    JSON.parse("[1,[2,3]]", function (key, value) {
        if (Array.isArray(this) && this[0] === 1)
            this[1] = s;
        return this === s ? undefined : value;
    });
    shouldBe(keys(s), "0,length");
    shouldBe(s[0], 1);
}

{
    struct S {
        static 0 = 1;
        static 1() { }
        static get 2() { return 6; }
        static { this[3] = 4; this[100000] = 1; delete this[1]; }
    }
    shouldBe(S[2], 6);
    shouldBe(S[100000], 1);
    shouldBe(1 in S, false);
    shouldBe(Object.isSealed(S), true);
    shouldThrow(() => { "use strict"; S[9] = 1; });
    Object.freeze(S);
    Object.freeze(S.prototype);
    shouldBe(new S instanceof S, true);
}

{
    struct S { 0 = function () { }; 1 = () => { }; ["2"] = class { }; [Symbol("d")] = () => { }; }
    let s = new S;
    shouldBe(s[0].name, "0");
    shouldBe(s[1].name, "1");
    shouldBe(s[2].name, "2");
    shouldBe(s[Object.getOwnPropertySymbols(s)[0]].name, "[d]");
}

{
    struct S { a = 1; 0 = 1; b = 2; }
    let s = new S;
    shouldThrow(() => Object.freeze(s));
    for (let key of Reflect.ownKeys(s))
        shouldBe(Object.getOwnPropertyDescriptor(s, key).writable, true);
}

{
    struct S { 0 = 1; a = 2; 1 = 3; b = 4; }
    function enumerate(o) {
        let result = "";
        for (let key in o) {
            if (Object.hasOwn(o, key))
                result += key + o[key];
        }
        return result;
    }
    for (let i = 0; i < testLoopCount; ++i) {
        shouldBe(enumerate(new S), "0113a2b4");
        if (!(i % 100))
            shouldBe(enumerate({ 0: 5, a: 1 }), "05a1");
    }
}

{
    struct S { 0 = 1; 2 = 2; }
    let s = new S;
    let get = (o, i) => o[i];
    let has = (o, i) => i in o;
    let set = (o, i) => { o[i] = i; };
    for (let f of [get, has, set])
        noInline(f);
    for (let i = 0; i < testLoopCount; ++i) {
        shouldBe(get(s, 0), 1);
        shouldBe(get(s, 1), undefined);
        shouldBe(get(s, 2), 2);
        shouldBe(has(s, 0), true);
        shouldBe(has(s, 1), false);
    }
    for (let i = 0; i < testLoopCount; ++i) {
        for (let index of [0, 1, 2, 3])
            set(s, index);
        if (!(i % 7))
            set([1, 2, 3, 4], 1);
    }
    shouldBe(keys(s), "0,2");
    shouldBe(s[0], 0);
    shouldBe(s[2], 2);
}

{
    struct S { 0 = 1; 1 = 2; 2 = 3; length = 3; }
    let s = new S;
    Object.defineProperty(Array.prototype, 1, { get() { return "bad"; }, set() { }, configurable: true });
    shouldBe(Array.prototype.slice.call(s).length, 3);
    Array.prototype.reverse.call(s);
    shouldBe(s[0], 3);
    Array.prototype.sort.call(s);
    shouldBe(s[0], 1);
    shouldBe(s[1], 2);
    delete Array.prototype[1];
}

{
    struct S { 0 = "p"; }
    let s = new S;
    Object.setPrototypeOf(Array.prototype, s);
    let hole = () => new Array(3);
    noInline(hole);
    for (let i = 0; i < testLoopCount; ++i)
        shouldBe(hole()[0], "p");
    s[0] = "q";
    for (let i = 0; i < testLoopCount; ++i)
        shouldBe(hole()[0], "q");
    let [x] = [,];
    shouldBe(x, "q");
    let a = [, 1];
    a[0] = 1;
    shouldBe(Object.hasOwn(a, 0), true);
    shouldBe(s[0], "q");
    Object.setPrototypeOf(Array.prototype, Object.prototype);
}
