//@ requireOptions("--useStructs=0")

let error;
try {
    new Function("struct A { }");
} catch (e) {
    error = e;
}
if (!(error instanceof SyntaxError))
    throw new Error("struct must be a SyntaxError if the option is off");
