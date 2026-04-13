# dotkiro

Sync your team's [Kiro](https://kiro.dev) steering files and skills from a central Git repo into any project.

For a deeper walkthrough of the problem and the thinking behind dotkiro, read the [blog post](BLOG.md).

## Why

Steering files and skills shape how Kiro writes code — your style preferences, security rules, testing conventions, and more. When these are consistent across projects, every developer on the team gets the same AI behavior. When they're not, you get drift: slightly different rules in every repo, outdated copies, new projects starting from scratch.

The problem gets worse as you scale from a team to an organisation. Updating a convention means editing files across every active project. New team members don't know which version to use. Different teams end up with their own variations. There's no single source of truth for "how we use Kiro."

dotkiro fixes that. One Git repo holds your conventions, one command syncs them everywhere.

## Quick start

```bash
git clone https://github.com/kirodotdev-labs/dotkiro.git
cd dotkiro
npm link
```

Then in any project, create a `.dotkirorc` file pointing at your team's conventions repo:

```json
{
  "repo": "https://github.com/your-org/your-kiro-conventions.git"
}
```

And sync:

```bash
dotkiro init
```

This pulls all `.md` files from the `steering/` and `skills/` directories at the root of your conventions repo into `.kiro/steering/` and `.kiro/skills/`.

To layer type-specific conventions on top (e.g. for a Python project), add a type. Your conventions repo just needs a `python/steering/` and/or `python/skills/` folder:

```bash
dotkiro add python
```

This fetches files from `python/steering/` and `python/skills/` in the remote repo without re-syncing the shared ones. See [Repo structure](#repo-structure) for the full layout.

## Commands

### `dotkiro init [types...]`

Fetches steering files and skills from the configured remote repo and copies them into `.kiro/steering/` and `.kiro/skills/`.

- With no types and no `types` in `.dotkirorc`, syncs only the shared conventions (files at the repo root's `steering/` and `skills/` directories).
- With no CLI types but `types` declared in `.dotkirorc`, syncs shared plus those declared types.
- With CLI types (e.g. `dotkiro init python cdk`), syncs shared conventions plus the specified types and saves them to `.dotkirorc`.
- Creates a manifest at `.dotkiro-manifest.json` that tracks every file it placed, grouped by type.
- On repeat runs, detects files that were previously synced but are no longer present in the remote and removes them from disk and the manifest.
- Safe to run multiple times — unchanged files are skipped.

```bash
dotkiro init                    # shared only
dotkiro init python typescript  # shared + python + typescript
dotkiro init --gitignore        # also add the manifest to .gitignore
```

The manifest (`.dotkiro-manifest.json`) is generated at runtime and reflects each developer's local sync state. It shouldn't be committed — different developers may have different types active, and the remote repo is the source of truth for file contents. Use `--gitignore` on first run to keep it out of source control automatically.

### `dotkiro add <types...>`

Adds one or more types to an existing setup without re-syncing shared files.

- Requires at least one type argument.
- Only fetches and copies the type-specific directories — shared files are left as-is.
- Merges the new type entries into the existing manifest.
- Appends the new types to the `types` array in `.dotkirorc`.

```bash
dotkiro add cdk                 # layer CDK conventions on top
dotkiro add python cdk          # add multiple types at once
```

### `dotkiro update`

Re-syncs all previously configured types from the remote repo.

- Reads the manifest to discover which types were set up, then runs the equivalent of `dotkiro init` with those types.
- Picks up new files, updates changed files, and removes files that were deleted from the remote.
- Accepts `--repo` and `--branch` flags to override config for this run.
- Does nothing if no manifest exists (tells you to run `init` first).

```bash
dotkiro update
dotkiro update --branch=v2
```

### `dotkiro remove [types...]`

Removes synced files from disk and updates the manifest.

- With type arguments (e.g. `dotkiro remove python`), removes only the files belonging to those types and removes them from the `types` array in `.dotkirorc`. Files shared with a type you're keeping are left in place.
- With no arguments, removes everything dotkiro synced, deletes the manifest, and clears `types` from `.dotkirorc`.

```bash
dotkiro remove typescript       # drop one type
dotkiro remove python cdk       # drop multiple types
dotkiro remove                  # remove everything
```

### `dotkiro status`

Shows what's currently synced — lists each type and its file count.

```bash
dotkiro status
```

### Global options

```
--repo <url>     Git repo URL (overrides .dotkirorc)
--branch <name>  Branch to clone (default: main)
--gitignore      Add the manifest to .gitignore (if the file exists and the entry is missing)
-h, --help       Show help
```

## How it works

```mermaid
graph LR
    A[Central Git Repo] -->|dotkiro init| B[.kiro/steering/]
    A -->|dotkiro init| C[.kiro/skills/]
```

`dotkiro init` shallow-clones your configured repo and copies `.md` files into `.kiro/steering/` and `.kiro/skills/`.

Types let you layer conventions. Shared files are always synced, and each type adds its own on top.

### The manifest

dotkiro creates a `.dotkiro-manifest.json` file in your project root. This is a local tracking file that records every file dotkiro placed on disk, grouped by type. It's how the tool knows:

- Which files to update when you run `dotkiro update`
- Which files to delete when you run `dotkiro remove`
- Which files belong to which type

Files you create manually in `.kiro/steering/` or `.kiro/skills/` are never in the manifest, so dotkiro will never touch them. Only files that came from the central repo are tracked and managed.

The manifest reflects your local sync state and shouldn't be committed — different developers may have different types active. Use `dotkiro init --gitignore` to exclude it automatically.

## Updating conventions

When someone on your team changes a convention, they open a PR against the conventions repo. The team reviews it. Once merged, every developer gets the update on their next `dotkiro update` — it reports what was added, changed, or removed.

No Slack messages asking people to update their files. No wiki pages that go stale. The Git repo is the source of truth, and the CLI is the delivery mechanism.

## Repo structure

Your central repo should look like this:

```
my-repo/
  steering/                    # Shared — always pulled
    code-style.md
    security.md
  skills/                      # Shared — always pulled
    code-review/
      SKILL.md
  python/                      # Type-specific
    steering/
      python-rules.md
    skills/
      pytest-helper/
        SKILL.md
```

### Where files end up

Running `dotkiro init python` produces:

```
.kiro/
  steering/
    code-style.md              ← from steering/
    security.md                ← from steering/
    python/
      python-rules.md          ← from python/steering/
  skills/
    code-review/
      SKILL.md                 ← from skills/
    pytest-helper/
      SKILL.md                 ← from python/skills/
```

Steering supports subfolders in Kiro, so type-specific steering goes into `.kiro/steering/<type>/`. Skills only work one level deep, so they're flattened into `.kiro/skills/` regardless of source.

### Local files are safe

Files you create locally in `.kiro/steering/` or `.kiro/skills/` are never touched by dotkiro. Only files tracked in the manifest are managed.

## Configuration

Create a `.dotkirorc` file in your project (or `~/.config/dotkiro/config.json` for global defaults):

```json
{
  "repo": "https://github.com/your-org/your-kiro-repo.git"
}
```

Optionally declare the types your project needs and a branch:

```json
{
  "repo": "https://github.com/your-org/your-kiro-repo.git",
  "branch": "main",
  "types": ["python", "cdk"]
}
```

A sample `.dotkirorc` is available in the [`examples/`](examples/) directory.

Commit this file to your repo. When a new developer clones the project and runs `dotkiro init`, it reads the `types` from `.dotkirorc` and syncs everything automatically — no need to remember which types to pass.

The `types` array is kept in sync by the CLI: `dotkiro add cdk` appends `cdk`, `dotkiro remove cdk` removes it. You can also edit it by hand.

CLI flags override config. Config is resolved in layers: defaults -> user config (`~/.config/dotkiro/config.json`) -> project config (`.dotkirorc`) -> CLI flags, so you can set org-wide defaults and override per-project or per-command.

```bash
dotkiro init python --repo=https://github.com/your-org/repo.git --branch=v2
```

## Requirements

- Node.js >= 18
- Git on PATH

## License

Apache 2.0