// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { readManifest } from "./init.js";
import { loadConfig } from "./config.js";
import { init } from "./init.js";

export async function update(cliFlags) {
  const cwd = process.cwd();
  const manifest = await readManifest(cwd);
  const previousTypes = Object.keys(manifest).filter((t) => t !== "shared");

  if (Object.keys(manifest).length === 0) {
    console.log("Nothing to update — no dotkiro manifest found. Run `dotkiro init` first.");
    return;
  }

  const config = await loadConfig(cliFlags, previousTypes);
  await init(config);
}
