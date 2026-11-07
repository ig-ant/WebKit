//@ skip if $memoryLimited
//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")

load("./resources/struct-footprint.js", "caller relative");

checkFootprint(Array.from({ length: 200 }, (_, i) => i), 12000);
