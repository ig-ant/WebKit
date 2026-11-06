//@ skip if !$structsEnabled
//@ requireOptions("--useStructs=1")
import { shouldBe } from "./resources/assert.js";
import Anonymous, { Named, Extended } from "./struct-declarations/exports.js";
import NamedDefault, { local } from "./struct-declarations/named-default.js";
import structExpression from "./struct-declarations/expression-default.js";

shouldBe(Anonymous.name, "default");
shouldBe(Anonymous.toString(), "struct { x = 1; }");
shouldBe(new Anonymous().x, 1);
shouldBe(new Named().y, 2);
shouldBe(new Extended().sum(), 5);
shouldBe(NamedDefault, local);
shouldBe(NamedDefault.name, "NamedDefault");
shouldBe(structExpression, 10);
