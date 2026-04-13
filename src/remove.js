// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { rm } from "node:fs/promises";
import { join } from "node:path";
import { readManifest, writeManifest, removeFiles, MANIFEST_PATH } from "./init.js";
import { updateDotkirorc } from "./config.js";

export async function remove(types) {
  const cwd = process.cwd();
  const manifest = await readManifest(cwd);
  const allTypes = Object.keys(manifest);

  if (allTypes.length === 0) {
    console.log("Nothing to remove — no dotkiro manifest found.");
    return;
  }

  // no types specified = remove everything
  const typesToRemove = types.length > 0 ? types : allTypes;

  let totalRemoved = 0;
  const remaining = { ...manifest };

  for (const type of typesToRemove) {
    const files = manifest[type];
    if (!files || files.length === 0) {
      console.log(`  No files found for type "${type}" — skipping.`);
      continue;
    }

    // don't remove files that are also claimed by a type we're keeping
    const keepFiles = new Set();
    for (const [t, f] of Object.entries(manifest)) {
      if (!typesToRemove.includes(t)) {
        f.forEach((file) => keepFiles.add(file));
      }
    }

    const toRemove = files.filter((f) => !keepFiles.has(f));
    await removeFiles(cwd, toRemove);
    totalRemoved += toRemove.length;
    delete remaining[type];
  }

  if (Object.keys(remaining).length === 0) {
    // nothing left, remove the manifest too
    await rm(join(cwd, MANIFEST_PATH), { force: true });
  } else {
    await writeManifest(cwd, remaining);
  }

  if (totalRemoved === 0) {
    console.log("Nothing to remove.");
  } else {
    const label = types.length > 0 ? types.join(", ") : "all";
    console.log(`Removed ${totalRemoved} file(s) (${label}).`);
  }

  // update .dotkirorc to reflect the removal
  if (types.length > 0) {
    await updateDotkirorc({ removeTypes: types });
  } else {
    await updateDotkirorc({ clearTypes: true });
  }
}
