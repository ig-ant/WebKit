//@ skip if $memoryLimited
//@ requireOptions("--useStructs=1")

load("./resources/struct-footprint.js", "caller relative");

checkFootprint(Array.from({ length: 100 }, (_, i) => "f" + i), 150000);
