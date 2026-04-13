// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { readManifest } from "./init.js";

export async function status() {
  const cwd = process.cwd();
  const types = await readManifest(cwd);
  const entries = Object.entries(types);

  if (entries.length === 0) {
    console.log("No dotkiro files synced. Run `dotkiro init` to get started.");
    return;
  }

  let total = 0;
  for (const [type, files] of entries) {
    console.log(`  ${type}: ${files.length} file(s)`);
    total += files.length;
  }
  console.log(`Total: ${total} file(s)`);
}
