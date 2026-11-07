function allocate(S, count) {
    let last;
    for (let i = 0; i < count; ++i)
        last = new S;
    return last;
}
noInline(allocate);

function checkFootprint(fields, count) {
    let S = (0, eval)(`struct S { ${fields.join(";")} } S`);
    // On Linux, the peak includes what the parent process used before exec.
    let { current, peak } = MemoryFootprint();
    allocate(S, count);
    let growth = MemoryFootprint().peak - Math.max(current, peak);
    if (growth > 90 * 1024 * 1024)
        throw new Error("the footprint grew by " + growth);
}
