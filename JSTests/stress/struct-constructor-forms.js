//@ requireOptions("--useStructs=1")

function shouldBe(actual, expected) {
    if (actual !== expected)
        throw new Error(`expected ${String(expected)} but got ${String(actual)}`);
}

function shouldThrow(func, message) {
    let error;
    try {
        func();
    } catch (e) {
        error = e;
    }
    if (!error)
        throw new Error(`${func} should throw`);
    if (!String(error).includes(message))
        throw new Error(`unexpected error: ${error}`);
}

function test() {
    struct A {
        x = 1;
        y;
        constructor(y = 3) { this.y = y; }
        get getter() { return this.x; }
        set setter(value) { this.x = value; }
        method() { return (() => this.x)(); }
        *generator() { yield this.x; }
    }

    struct WithArrow extends A {
        z = 7;
        constructor(v) {
            super(v);
            const f = () => this;
            shouldBe(f(), this);
            this.z = f().y + 1;
        }
        superMethod() { return eval("(() => super.method())()"); }
    }
    shouldBe(new WithArrow(4).z, 5);
    shouldBe(new WithArrow(4).superMethod(), 1);

    // super() in arrow functions and direct eval.
    struct Arrow extends A { constructor() { (() => super(9))(); } }
    shouldBe(new Arrow().y, 9);
    struct Eval extends A { constructor() { eval("super(10)"); } }
    shouldBe(new Eval().y, 10);
    struct EvalInArrow extends A { constructor() { (() => { eval("(() => super(11))()"); })(); } }
    shouldBe(new EvalInArrow().y, 11);
    struct DefaultParameter extends A { constructor(f = () => super(12)) { f(); return { }; } }
    shouldBe(new DefaultParameter().y, 12);
    struct AsyncArrow extends A { constructor() { (async () => { await 0; super(13); })(); } }
    let object = new AsyncArrow();
    shouldBe(object.y, undefined);
    drainMicrotasks();
    shouldBe(object.y, 13);
    struct Initializer extends Eval { constructor() { super(); eval("(() => this.y = 77)()"); } }
    shouldBe(new Initializer().y, 77);

    // Default constructors do not run the constructors of parents.
    struct Default extends WithArrow { }
    shouldBe(new Default().x, 1);
    shouldBe(new Default().z, 7);
    shouldBe(Default.length, 0);
    struct CallsDefault extends Default { constructor() { super(); } }
    shouldBe(new CallsDefault().z, 7);

    struct ReturnInTry extends A { constructor() { try { return 1; } catch { } } }
    shouldBe(new ReturnInTry().x, 1);

    // Functions of other classes and structs inside a derived struct constructor.
    struct WithClass extends A {
        c;
        constructor() {
            super(1);
            this.c = (() => {
                class B { q = 1; }
                class C extends B {
                    r = 2;
                    constructor() {
                        super();
                        this.s = (() => this.q)();
                    }
                }
                return new C;
            })();
        }
    }
    shouldBe(new WithClass().c.r, 2);
    shouldBe(new WithClass().c.s, 1);
    struct WithStruct extends A {
        n;
        constructor() {
            (() => {
                struct Inner extends A { constructor() { super(5); } get() { return this.y; } }
                this.n = new Inner().get();
            })();
        }
    }
    shouldBe(new WithStruct().n, 5);

    for (const S of [A, WithArrow, Default, Eval]) {
        shouldThrow(() => S(), "Cannot call a struct constructor without |new|");
        shouldThrow(() => S.call(new S), "Cannot call a struct constructor without |new|");
        shouldThrow(() => Reflect.construct(S, [], Object), "new target");
    }
    class Derived extends Default { }
    shouldThrow(() => new Derived, "new target");

    shouldThrow(() => A.prototype.method.call({ }), "not an instance of struct A");
    shouldThrow(() => A.prototype.generator.call({ }), "not an instance of struct A");
    shouldThrow(() => Object.getOwnPropertyDescriptor(A.prototype, "getter").get.call({ }), "not an instance of struct A");
    shouldThrow(() => Object.getOwnPropertyDescriptor(A.prototype, "setter").set.call({ }, 1), "not an instance of struct A");
    shouldThrow(() => WithArrow.prototype.superMethod.call(new A), "not an instance of struct WithArrow");
}

for (let i = 0; i < 10; ++i)
    test();
