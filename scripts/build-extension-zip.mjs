// Zips extension/ into public/driveboard-extension.zip so the Admin
// board's "Add extension" download button always ships whatever's
// currently in extension/. Runs automatically before every build (see
// package.json's "prebuild" script) — never hand-edit the zip itself.
import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { ZipArchive } from "archiver";

const root = path.resolve(import.meta.dirname, "..");
const sourceDir = path.join(root, "extension");
const outDir = path.join(root, "public");
const outFile = path.join(outDir, "driveboard-extension.zip");

if (!existsSync(sourceDir)) {
  console.error(`extension/ not found at ${sourceDir}`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const output = createWriteStream(outFile);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Wrote ${path.relative(root, outFile)} (${archive.pointer()} bytes)`);
});
archive.on("warning", (err) => {
  throw err;
});
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
// Nested one level under "driveboard-extension/" in the zip so extracting
// it doesn't scatter files into whatever folder the user unzips into —
// matches the "extract, then Load unpacked the folder" instructions.
archive.directory(sourceDir, "driveboard-extension");
await archive.finalize();
