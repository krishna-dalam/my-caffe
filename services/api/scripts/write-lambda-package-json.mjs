import { mkdir, writeFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await writeFile("dist/package.json", `${JSON.stringify({ type: "module" }, null, 2)}\n`);
