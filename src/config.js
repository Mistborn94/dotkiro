// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const DEFAULTS = {
  branch: "main",
};

const VALID_TYPE = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/i;

function pathsForType(type) {
  const typeLabel = type ?? "shared";
  const srcPathPrefix = type ? `${type}/` : "";
  const destPathSuffix = type ? `/${type}` : "";

  return [
    { src: `${srcPathPrefix}steering`, dest: `.kiro/steering${destPathSuffix}`, label: `Steering (${typeLabel})`, type: typeLabel, ext: [".md"] },
    { src: `${srcPathPrefix}skills`, dest: ".kiro/skills", label: `Skills (${typeLabel})`, type: typeLabel, ext: [".md"] },
    { src: `${srcPathPrefix}hooks`, dest: `.kiro/hooks`, label: `Hooks (${typeLabel})`, type: typeLabel, ext: [".kiro.hook", ".json"] },
  ];
}

export function buildPaths(types) {
  const paths = pathsForType(null);

  for (const type of types) {
    if (type && type !== "default") {
      if (!VALID_TYPE.test(type)) {
        throw new Error(`Invalid type name: "${type}". Use only letters, numbers, hyphens, dots, and underscores.`);
      }
      paths.push(...pathsForType(type));
    }
  }

  return paths;
}

async function readJson(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function loadConfig(cliFlags = {}, types = []) {
  const userConfig = await readJson(
    join(homedir(), ".config", "dotkiro", "config.json")
  );
  const projectConfig = await readJson(join(process.cwd(), ".dotkirorc"));

  const config = { ...DEFAULTS, ...userConfig, ...projectConfig };

  for (const [key, val] of Object.entries(cliFlags)) {
    if (val !== undefined) config[key] = val;
  }

  config.types = types.length > 0 ? types : (config.types || []);
  config.paths = buildPaths(config.types);

  return config;
}

/**
 * Read the project .dotkirorc, update its types array, and write it back.
 * Preserves all other fields (repo, branch, etc.).
 */
export async function updateDotkirorc({ addTypes = [], removeTypes = [], clearTypes = false } = {}) {
  const rcPath = join(process.cwd(), ".dotkirorc");
  const rc = await readJson(rcPath);

  let current = rc.types || [];

  if (clearTypes) {
    current = [];
  } else {
    // add new types (deduplicated)
    for (const t of addTypes) {
      if (!current.includes(t)) {
        current.push(t);
      }
    }
    // remove specified types
    if (removeTypes.length > 0) {
      current = current.filter((t) => !removeTypes.includes(t));
    }
  }

  if (current.length > 0) {
    rc.types = current;
  } else {
    delete rc.types;
  }

  await writeFile(rcPath, JSON.stringify(rc, null, 2) + "\n");
}
