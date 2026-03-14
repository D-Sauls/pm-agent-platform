import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const teamsRoot = resolve(__dirname, "..");
const templateManifestPath = resolve(teamsRoot, "manifest", "manifest.json");
const packageDir = resolve(teamsRoot, "app-package");
const outputManifestPath = resolve(packageDir, "manifest.json");
const colorIconPath = resolve(packageDir, "color.png");
const outlineIconPath = resolve(packageDir, "outline.png");
const zipOutputPath = resolve(packageDir, "pm-agent-teams-app.zip");

const tokens = {
  "${{TEAMS_APP_ID}}": process.env.TEAMS_APP_ID ?? "00000000-0000-0000-0000-000000000001",
  "${{TEAMS_BOT_APP_ID}}": process.env.TEAMS_BOT_APP_ID ?? process.env.TEAMS_APP_ID ?? "00000000-0000-0000-0000-000000000001",
  "${{TEAMS_APP_DOMAIN}}": process.env.TEAMS_APP_DOMAIN ?? "localhost:5173"
};

function ensurePackageDir() {
  mkdirSync(packageDir, { recursive: true });
}

function renderManifest() {
  const template = readFileSync(templateManifestPath, "utf8");
  const rendered = Object.entries(tokens).reduce(
    (content, [token, value]) => content.replaceAll(token, value),
    template
  );
  writeFileSync(outputManifestPath, rendered, "utf8");
}

function copyIcons() {
  if (!existsSync(colorIconPath) || !existsSync(outlineIconPath)) {
    throw new Error("Missing Teams app icons. Expected color.png and outline.png in teams/app-package.");
  }
}

function writeReadme() {
  const readmePath = resolve(packageDir, "README.md");
  writeFileSync(
    readmePath,
    [
      "# Teams App Package",
      "",
      "Generated package assets for sideloading the PM Agent app into Microsoft Teams.",
      "",
      "Resolved values:",
      `- TEAMS_APP_ID: ${tokens["${{TEAMS_APP_ID}}"]}`,
      `- TEAMS_BOT_APP_ID: ${tokens["${{TEAMS_BOT_APP_ID}}"]}`,
      `- TEAMS_APP_DOMAIN: ${tokens["${{TEAMS_APP_DOMAIN}}"]}`,
      "",
      "If zip creation is unavailable on this machine, compress manifest.json, color.png, and outline.png into pm-agent-teams-app.zip manually."
    ].join("\n"),
    "utf8"
  );
}

function tryZipPackage() {
  rmSync(zipOutputPath, { force: true });

  if (process.platform === "win32") {
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path '${outputManifestPath}','${colorIconPath}','${outlineIconPath}' -DestinationPath '${zipOutputPath}' -Force`
      ],
      { stdio: "inherit" }
    );
    return result.status === 0;
  }

  const result = spawnSync(
    "zip",
    ["-j", zipOutputPath, outputManifestPath, colorIconPath, outlineIconPath],
    { stdio: "inherit" }
  );
  return result.status === 0;
}

ensurePackageDir();
renderManifest();
cpSync(resolve(teamsRoot, "bot"), resolve(packageDir, "bot"), { recursive: true, force: true });
copyIcons();
writeReadme();

const zipped = tryZipPackage();
if (!zipped) {
  console.warn("Teams package assets generated, but zip creation was skipped or failed.");
}
