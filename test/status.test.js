// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeManifest } from "../src/init.js";
import { status } from "../src/status.js";

let testDir;
let originalCwd;

async function makeTempDir() {
  const dir = join(tmpdir(), `dotkiro-st-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

beforeEach(async () => {
  testDir = await makeTempDir();
  originalCwd = process.cwd;
  process.cwd = () => testDir;
});

afterEach(async () => {
  process.cwd = originalCwd;
  await rm(testDir, { recursive: true, force: true });
});

describe("status", () => {
  it("prints 'no files synced' when no manifest", async () => {
    const spy = vi.spyOn(console, "log");
    await status();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("No dotkiro files synced"));
    spy.mockRestore();
  });

  it("lists types and file counts", async () => {
    await writeManifest(testDir, {
      shared: [".kiro/steering/a.md", ".kiro/steering/b.md"],
      python: [".kiro/steering/python/c.md"],
    });

    const spy = vi.spyOn(console, "log");
    await status();

    const calls = spy.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.includes("shared") && c.includes("2"))).toBe(true);
    expect(calls.some((c) => c.includes("python") && c.includes("1"))).toBe(true);
    expect(calls.some((c) => c.includes("Total") && c.includes("3"))).toBe(true);
    spy.mockRestore();
  });

  it("handles single type", async () => {
    await writeManifest(testDir, {
      shared: [".kiro/steering/a.md"],
    });

    const spy = vi.spyOn(console, "log");
    await status();

    const calls = spy.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.includes("shared") && c.includes("1"))).toBe(true);
    expect(calls.some((c) => c.includes("Total") && c.includes("1"))).toBe(true);
    spy.mockRestore();
  });

  it("handles empty types object in manifest", async () => {
    await writeManifest(testDir, {});

    const spy = vi.spyOn(console, "log");
    await status();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("No dotkiro files synced"));
    spy.mockRestore();
  });
});
