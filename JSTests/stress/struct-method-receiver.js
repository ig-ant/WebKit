//@ slow!
//@ requireOptions("--useStructs=1")

function shouldBe(actual, expected) {
    if (!Object.is(actual, expected))
        throw new Error(`expected ${String(expected)} but got ${String(actual)}`);
}

function shouldThrowTypeError(func, message) {
    let error;
    try {
        func();
    } catch (e) {
        error = e;
    }
    if (!(error instanceof TypeError))
        throw new Error(`expected a TypeError but got ${String(error)}`);
    if (message !== undefined && !String(error.message).startsWith(message))
        throw new Error(`expected the message "${message}" but got "${error.message}"`);
}

let log = [];

struct Base {
    baseMethod() { return this; }
    get baseGetter() { return this; }
}

struct S extends Base {
    x = 1;

    plain() { return this; }
    withoutThis() { return "withoutThis"; }
    arrow() { return (() => this)(); }
    nestedArrow() { return (() => () => this)()(); }
    directEval() { return eval("this"); }
    arrowEval() { return (() => eval("this"))(); }
    evalArrow() { return eval("() => this")(); }
    defaultParameter(a = (log.push("default"), this)) { return a; }
    defaultArrow(a = () => this) { return a(); }
    defaultEval(a = eval("this")) { return a; }
    defaultArrowEval(a = () => eval("this"), b = a()) { return b; }
    destructured({ a } = { a: (log.push("destructured"), this) }) { return a; }
    rest(...[a = (log.push("rest"), this)]) { return a; }
    superCall() { return super.baseMethod(); }
    superGetter() { return super.baseGetter; }
    arrowSuper() { return (() => super.baseMethod())(); }
    evalSuper() { return eval("super.baseMethod()"); }
    superDefault(a = super.baseMethod()) { return a; }
    tryCatch() { try { throw this; } catch (e) { return e; } }
    write() { this.x = 2; shouldBe(this.x, 2); this.x = 1; return this; }
    sloppyCallee() { return returnThis.call(this); }
    withArguments() { return [this, arguments.length][0]; }
    get getter() { return this; }
    get arrowGetter() { return (() => this)(); }
    set setter(v) { v.result = this; }
    set evalSetter(v) { v.result = eval("this"); }
    ["computed"]() { return this; }
    1() { return this; }

    *generator() { yield this; yield (() => this)(); yield eval("this"); }
    *generatorDefault(a = (log.push("generatorDefault"), this)) { yield a; }
    *generatorWithoutThis() { yield 1; }
    async asyncWithoutAwait() { return this; }
    async asyncUnused() { return 1; }
    async asyncWithAwait() { await 0; return this; }
    async asyncArrow() { return await (async () => { await 0; return this; })(); }
    async asyncDefault(a = (log.push("asyncDefault"), this)) { await 0; return a; }
    async asyncEval() { await 0; return eval("this"); }
    async *asyncGenerator() { yield this; await 0; yield (() => this)(); }
    async *asyncGeneratorDefault(a = (log.push("asyncGeneratorDefault"), this)) { yield a; }
}

struct Sub extends S {
    y = 2;
    own() { return this; }
    superPlain() { return super.plain(); }
    get getter() { return super.getter; }
}

struct Other { x = 1; }
class C { x = 1; }

function returnThis() { return this; }

const returnsThis = [
    "plain", "arrow", "nestedArrow", "directEval", "arrowEval", "evalArrow", "defaultParameter", "defaultArrow",
    "defaultEval", "defaultArrowEval", "destructured", "rest", "superCall", "superGetter", "arrowSuper", "evalSuper",
    "superDefault", "tryCatch", "write", "sloppyCallee", "withArguments", "computed", "1",
];
const generators = ["generator", "generatorDefault"];
const asyncs = ["asyncWithoutAwait", "asyncWithAwait", "asyncArrow", "asyncDefault", "asyncEval"];
const asyncGenerators = ["asyncGenerator", "asyncGeneratorDefault"];
const all = [...returnsThis, "withoutThis", ...generators, "generatorWithoutThis", ...asyncs, "asyncUnused", ...asyncGenerators];

const instances = [new S, new Sub];

function testInstances() {
    for (let object of instances) {
        for (let name of returnsThis)
            shouldBe(object[name](), object);
        shouldBe(object.withoutThis(), "withoutThis");
        shouldBe(object.getter, object);
        shouldBe(object.arrowGetter, object);
        for (let name of ["setter", "evalSetter"]) {
            let box = {};
            object[name] = box;
            shouldBe(box.result, object);
        }
        for (let name of generators) {
            for (let value of object[name]())
                shouldBe(value, object);
        }
    }
    shouldBe(instances[1].own(), instances[1]);
    shouldBe(instances[1].superPlain(), instances[1]);
}

for (let i = 0; i < 300; ++i)
    testInstances();

log.length = 0;

const notInstances = [
    null, true, 1, 1.5, 1n, "string", Symbol(), {}, [], function () { }, globalThis, S, S.prototype, Sub.prototype,
    Object.create(new S), new Proxy(new S, {}), new Other, new C, new Base, { __proto__: S.prototype, x: 1 },
];
const accessors = ["getter", "arrowGetter", "setter", "evalSetter"].map(name => {
    let descriptor = Object.getOwnPropertyDescriptor(S.prototype, name);
    return descriptor.get || descriptor.set;
});

function testNotInstances() {
    for (let callee of [...all.map(name => S.prototype[name]), ...accessors]) {
        shouldThrowTypeError(() => callee.call(undefined), "undefined is not an object");
        shouldThrowTypeError(() => callee.call(null), "null is not an object");
        for (let receiver of notInstances) {
            shouldThrowTypeError(() => callee.call(receiver));
            shouldThrowTypeError(() => Reflect.apply(callee, receiver, []));
            if (receiver !== null)
                shouldThrowTypeError(() => callee.call(receiver), "The receiver is not an instance of struct S");
        }
    }
    shouldThrowTypeError(() => Sub.prototype.own.call(instances[0]), "The receiver is not an instance of struct Sub");
    shouldThrowTypeError(() => Sub.prototype.superPlain.call(instances[0]), "The receiver is not an instance of struct Sub");
}

for (let i = 0; i < 20; ++i)
    testNotInstances();
// The receiver is checked before the parameters are evaluated.
shouldBe(log.length, 0);

// A callee that is resolved through a dynamic scope gets that scope as |this|.
let lexicalMethod = S.prototype.plain;
var globalMethod = S.prototype.plain;
(0, eval)("var evalMethod = S.prototype.plain");
function callThroughScopes(object) {
    var localMethod = S.prototype.plain;
    eval("var localEvalMethod = S.prototype.plain");
    for (let name of ["lexicalMethod", "globalMethod", "evalMethod", "localMethod", "localEvalMethod"]) {
        shouldThrowTypeError(() => eval(`${name}()`));
        with ({})
            shouldThrowTypeError(() => eval(`${name}()`));
        shouldThrowTypeError(() => { "use strict"; eval(`${name}()`); });
    }
    with (object) {
        shouldBe(plain(), object);
        shouldBe(arrow(), object);
        shouldThrowTypeError(() => localMethod());
    }
    with ({ plain: S.prototype.plain })
        shouldThrowTypeError(() => plain());
}
for (let i = 0; i < 200; ++i)
    callThroughScopes(instances[i & 1]);

// One call site that sees good receivers until it is optimized, and then bad ones.
for (let receiver of [undefined, ...notInstances]) {
    let create = new Function(`
        struct T { x = 1; get() { return this.x; } arrow() { return (() => this.x)(); } }
        let t = new T;
        function test(receiver) { return T.prototype.get.call(receiver) + T.prototype.arrow.call(receiver); }
        return [t, test];
    `);
    let [t, test] = create();
    for (let i = 0; i < 2000; ++i)
        shouldBe(test(t), 2);
    for (let i = 0; i < 5; ++i) {
        shouldThrowTypeError(() => test(receiver));
        shouldBe(test(t), 2);
    }
}

let pending = 0;
async function testAsync() {
    for (let object of instances) {
        for (let name of asyncs)
            shouldBe(await object[name](), object);
        shouldBe(await object.asyncUnused(), 1);
        for (let name of asyncGenerators) {
            for await (let value of object[name]())
                shouldBe(value, object);
        }
    }
}
let asyncError;
(async () => {
    ++pending;
    for (let i = 0; i < 50; ++i)
        await testAsync();
    --pending;
})().catch(e => { asyncError = e; });
drainMicrotasks();
if (asyncError)
    throw asyncError;
shouldBe(pending, 0);
