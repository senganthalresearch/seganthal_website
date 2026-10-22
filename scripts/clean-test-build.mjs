import { rmSync } from "node:fs";
// Fixed output directory relative to this checked-in script; no user-supplied path.
rmSync(new URL("../.test-build/", import.meta.url), { recursive: true, force: true });
