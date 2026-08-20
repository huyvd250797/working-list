import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const preload = join(dirname(fileURLToPath(import.meta.url)), "safe-memory.cjs");
const nodeOptions = `${process.env.NODE_OPTIONS ?? ""} --require=${preload}`.trim();
const result = spawnSync(executable, ["next", "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});

process.exit(result.status ?? 1);
