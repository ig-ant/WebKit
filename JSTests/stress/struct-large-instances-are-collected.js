//@ skip if $memoryLimited
//@ requireOptions("--useStructs=1")

function define(source) {
    return (0, eval)(`struct S { ${source} } S`);
}

function allocate(S, count) {
    let last;
    for (let i = 0; i < count; ++i)
        last = new S;
    return last;
}
noInline(allocate);

let names = Array.from({ length: 100 }, (_, i) => "f" + i);
for (let S of [define(names.join(";")), define("0; 1; 2"), define(names.join(";") + "; 0; 1")]) {
    allocate(S, 300000);
    let { peak } = MemoryFootprint();
    if (peak > 250 * 1024 * 1024)
        throw new Error("peak footprint is " + peak);
}
