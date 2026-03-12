import fs from "node:fs";
import path from "node:path";

const targetDir = path.resolve("prisma/data");
const targetFile = path.join(targetDir, "dev.db");

fs.mkdirSync(targetDir, { recursive: true });

if (!fs.existsSync(targetFile)) {
  fs.closeSync(fs.openSync(targetFile, "w"));
}
