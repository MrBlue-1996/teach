/**
 * TopShelf Service LLC
 * PROPRIETARY AND CONFIDENTIAL
 * Copyright (c) 2026 TopShelf Service LLC. All Rights Reserved.
 */

import { accessSync, constants, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const workflowsDirectory = path.join(repositoryRoot, ".github", "workflows");
const dockerImage = process.env.ACTIONLINT_IMAGE ?? "rhysd/actionlint:latest";
const forwardedArgs = process.argv.slice(2);

const workflowFiles = readdirSync(workflowsDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(?:ya?ml)$/i.test(entry.name))
  .map((entry) => path.posix.join(".github", "workflows", entry.name))
  .sort();

if (workflowFiles.length === 0) {
  console.log("No GitHub Actions workflow files found in .github/workflows.");
  process.exit(0);
}

console.log(`Linting ${workflowFiles.length} GitHub Actions workflow file(s):`);
for (const workflowFile of workflowFiles) {
  console.log(`- ${workflowFile}`);
}

if (commandExists("actionlint")) {
  console.log("Using actionlint from PATH.");
  runOrExit("actionlint", forwardedArgs);
}

if (commandExists("docker")) {
  console.log(`Using Docker image ${dockerImage}.`);
  runOrExit("docker", [
    "run",
    "--rm",
    "-v",
    `${repositoryRoot}:/repo`,
    "-w",
    "/repo",
    "--entrypoint",
    "actionlint",
    dockerImage,
    ...forwardedArgs,
  ]);
}

console.error(
  "Unable to run workflow linting because neither 'actionlint' nor 'docker' is available in PATH.",
);
console.error(
  "Install actionlint locally or run the dedicated 'Workflow Lint' GitHub Actions workflow.",
);
process.exit(1);

function commandExists(command) {
  const executableExtensions =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
      : [""];
  const pathEntries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter((entry) => entry.length > 0);

  for (const pathEntry of pathEntries) {
    for (const extension of executableExtensions) {
      const candidate = path.join(pathEntry, `${command}${extension}`);

      try {
        accessSync(candidate, constants.X_OK);
        return true;
      } catch {
        continue;
      }
    }
  }

  return false;
}

function runOrExit(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}