import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBinPath = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");
const nextArgs = process.argv.slice(2);

if (nextArgs.length === 0) {
  console.error("Usage: node scripts/run-next.mjs <dev|build|start> [...args]");
  process.exit(1);
}

process.chdir(rootDir);

const child = spawn(process.execPath, [nextBinPath, ...nextArgs], {
  cwd: rootDir,
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Failed to start Next.js:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
