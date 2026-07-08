import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const copiedPackages = new Set();

const packageJsonPath = (packageName, fromDirectory = process.cwd()) => {
  try {
    return require.resolve(`${packageName}/package.json`, { paths: [fromDirectory] });
  } catch (error) {
    if (!error || typeof error !== "object" || !["ERR_PACKAGE_PATH_NOT_EXPORTED", "MODULE_NOT_FOUND"].includes(error.code)) {
      throw error;
    }

    let currentDirectory = dirname(require.resolve(packageName, { paths: [fromDirectory] }));
    while (currentDirectory !== dirname(currentDirectory)) {
      const candidate = join(currentDirectory, "package.json");
      if (existsSync(candidate)) {
        return candidate;
      }
      currentDirectory = dirname(currentDirectory);
    }

    throw error;
  }
};
const packageOutputPath = (packageName) => join("dist/node_modules", ...packageName.split("/"));

const readPackageJson = (packageName, fromDirectory) => {
  const path = packageJsonPath(packageName, fromDirectory);
  return {
    directory: dirname(path),
    manifest: JSON.parse(readFileSync(path, "utf8")),
  };
};

const copyRuntimePackage = async (packageName, fromDirectory = process.cwd()) => {
  if (packageName === "@my-caffe/shared" || copiedPackages.has(packageName)) {
    return;
  }

  const { directory, manifest } = readPackageJson(packageName, fromDirectory);
  copiedPackages.add(packageName);

  await mkdir(dirname(packageOutputPath(packageName)), { recursive: true });
  await cp(directory, packageOutputPath(packageName), {
    dereference: true,
    filter: (source) => !source.includes(`${directory}/node_modules`),
    recursive: true,
  });

  const dependencyNames = Object.keys({
    ...(manifest.dependencies ?? {}),
    ...(manifest.optionalDependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
  });

  for (const dependencyName of dependencyNames) {
    try {
      await copyRuntimePackage(dependencyName, directory);
    } catch (error) {
      const optionalDependency = Object.hasOwn(manifest.optionalDependencies ?? {}, dependencyName);
      const optionalPeer = manifest.peerDependenciesMeta?.[dependencyName]?.optional === true;
      const missingPackage = error && typeof error === "object" && "code" in error && error.code === "MODULE_NOT_FOUND";
      if (!optionalDependency && !optionalPeer && !missingPackage) {
        throw error;
      }
    }
  }
};

await mkdir("dist", { recursive: true });
await writeFile("dist/package.json", `${JSON.stringify({ type: "module" }, null, 2)}\n`);

await rm("dist/node_modules", { force: true, recursive: true });
await mkdir("dist/node_modules", { recursive: true });

const apiManifest = require("../package.json");
for (const dependencyName of Object.keys(apiManifest.dependencies ?? {})) {
  await copyRuntimePackage(dependencyName);
}

await rm("dist/node_modules/@my-caffe/shared", { force: true, recursive: true });
await mkdir("dist/node_modules/@my-caffe/shared", { recursive: true });
await cp("../../packages/shared/dist", "dist/node_modules/@my-caffe/shared/dist", {
  recursive: true,
});
await writeFile(
  "dist/node_modules/@my-caffe/shared/package.json",
  `${JSON.stringify(
    {
      exports: "./dist/index.js",
      main: "./dist/index.js",
      type: "module",
    },
    null,
    2,
  )}\n`,
);
