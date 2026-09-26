#!/usr/bin/env node
/**
 * Installs the packaged .vsix into an editor. Node rather than shell so it runs
 * on Windows as well as macOS and Linux — `shell: true` is what lets it find
 * `code.cmd` / `cursor.cmd` on Windows.
 */
const { spawnSync } = require("child_process");
const { existsSync } = require("fs");
const { join } = require("path");

const pkg = require("../package.json");
const editor = process.argv[2];

if (!editor) {
  console.error("Usage: node scripts/install.js <cursor|code>");
  process.exit(1);
}

const extensionId = `${pkg.publisher}.${pkg.name}`;
const vsix = join(__dirname, "..", "build-extension", `${pkg.name}-${pkg.version}.vsix`);

if (!existsSync(vsix)) {
  console.error(`VSIX not found: ${vsix}`);
  console.error("Run 'npm run package' first.");
  process.exit(1);
}

const isWindows = process.platform === "win32";

/**
 * On Windows the editor CLIs are `.cmd` shims, which Node refuses to spawn
 * without a shell. Everywhere else they are real executables, so the shell is
 * skipped — passing an argument array through a shell concatenates it unescaped,
 * which breaks on any path containing a space.
 */
function run(args, opts = {}) {
  const base = { stdio: opts.quiet ? "pipe" : "inherit", encoding: "utf8" };
  if (!isWindows) return spawnSync(editor, args, base);

  const quoted = args.map((arg) => `"${arg.replace(/"/g, '""')}"`).join(" ");
  return spawnSync(`"${editor}" ${quoted}`, { ...base, shell: true });
}

const listed = run(["--list-extensions"], { quiet: true });
if (listed.error || listed.status !== 0) {
  console.error(`Could not run '${editor}'. Is its command line tool on your PATH?`);
  process.exit(1);
}

if ((listed.stdout ?? "").split(/\r?\n/).some((line) => line.trim() === extensionId)) {
  console.log(`Found existing installation of ${extensionId} — uninstalling…`);
  run(["--uninstall-extension", extensionId]);
}

console.log(`Installing ${pkg.name}-${pkg.version}.vsix into ${editor}…`);
const installed = run(["--install-extension", vsix]);
if (installed.status !== 0) process.exit(installed.status ?? 1);

console.log(`Done. Reload ${editor} to activate the new version.`);
