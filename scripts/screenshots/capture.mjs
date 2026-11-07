#!/usr/bin/env node
// Screenshots of Roolio Dev on a connected phone, at several screen shapes and
// in both themes, into screenshots/<device>/<theme>/<shot>.png. See --help.
//
// It only changes com.shawndza.roolio.dev. The phone's screen size, density and
// font scale are put back when it ends, and Roolio Dev's tracking is turned off.

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { SAMPLE_APPS, seedSql } from "./seed.mjs";

const PACKAGE = "com.shawndza.roolio.dev";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUTPUT = join(ROOT, "screenshots");
const BASELINE_FILE = join(OUTPUT, ".phone-baseline.json");
const PLATFORM_TOOLS = join(process.env.ANDROID_HOME ?? `${process.env.HOME}/Android/Sdk`, "platform-tools");
// The SDK's adb, as Expo uses: two different versions restart each other's server.
const ADB = join(PLATFORM_TOOLS, "adb");
const SQLITE = join(PLATFORM_TOOLS, "sqlite3");
const METRO_URL = "http://127.0.0.1:8081";
const DEV_LAUNCH = `roolio://expo-development-client/?url=${encodeURIComponent(METRO_URL)}`;
const REMOTE_UI_DUMP = "/data/local/tmp/roolio-screenshots-ui.xml";

// Size in px and density give the size in dp, which is what layouts see.
const DEVICES = [
  { name: "my-phone", about: "This phone as it normally is (420x933 dp)" },
  { name: "tiny-320x569", size: "720x1280", density: 360, about: "The narrowest Android phones" },
  { name: "small-360x640", size: "720x1280", density: 320, about: "A small, older 16:9 phone" },
  { name: "tall-360x800", size: "1080x2400", density: 480, about: "A common narrow 20:9 phone" },
  { name: "wide-672x840", size: "1260x1575", density: 300, about: "An open foldable, nearly square" },
  { name: "large-text", size: "1080x2400", density: 480, fontScale: 1.3, about: "A common narrow 20:9 phone with its font size at 130%" },
];
const THEMES = ["dark", "light"];

const stats = (range, chart) => ({ prefs: { stats_range: range, stats_chart: chart, last_tab: "stats" }, link: "/stats" });

// `perms`: "all", "required" (no notifications), "usage" (Usage Access only) or
// "none". `setup`, `welcomeSeen` and `batteryDeclined` are the app's saved
// onboarding flags. Without `batteryDeclined`, the battery step would cover
// every screen, because Roolio Dev's battery use isn't unrestricted by default.
const SHOTS = [
  { name: "home-budgets", about: "Home with five budgets: banked, borrowed, weekly, monthly", link: "/", scroll: true },
  { name: "home-crowded", about: "Home with up to seven banked and seven borrow days", scenario: "crowded", link: "/", scroll: true },
  { name: "home-empty", about: "Home with no budgets", scenario: "empty", link: "/" },
  { name: "add-app", about: "Picking an app (lists the phone's real apps)", link: "/add-app", scroll: true },
  { name: "budget-banked", about: "App detail with banked time (Reddit)", link: "/budget/com.reddit.frontpage", scroll: true },
  { name: "budget-borrowed", about: "App detail while owing time (LinkedIn)", link: "/budget/com.linkedin.android", scroll: true },
  { name: "budget-crowded", about: "App detail with seven banked days (LinkedIn)", scenario: "crowded", link: "/budget/com.linkedin.android", scroll: true },
  { name: "budget-weekly", about: "App detail of a weekly budget (Minecraft)", link: "/budget/com.mojang.minecraftpe", scroll: true },
  { name: "stats-day-ring", about: "Stats: one day, ring chart", ...stats("day", "ring"), scroll: true },
  { name: "stats-week-ring", about: "Stats: one week, ring chart", ...stats("week", "ring"), scroll: true },
  { name: "stats-week-stacked", about: "Stats: one week, bars stacked by app", ...stats("week", "stacked"), scroll: true },
  { name: "stats-week-daily", about: "Stats: one week, bars in one color", ...stats("week", "daily"), scroll: true },
  { name: "stats-month-ring", about: "Stats: one month, ring chart", ...stats("month", "ring"), scroll: true },
  { name: "stats-week-calendar", about: "Stats: the range picker's calendar", ...stats("week", "ring"), tap: /, choose a / },
  { name: "settings", about: "Settings", link: "/settings", scroll: true },
  { name: "welcome", about: "The one-time welcome screen (animated)", perms: "none", setup: false, welcomeSeen: false, moving: true },
  { name: "permissions-usage-access", about: "Setup: Usage Access step", perms: "none", setup: false },
  { name: "permissions-overlay", about: "Setup: Display over other apps step", perms: "usage", setup: false },
  { name: "permissions-battery", about: "Battery step", perms: "required", batteryDeclined: false },
  { name: "permissions-notifications", about: "Setup: notifications step", perms: "required" },
  { name: "permissions-turned-off", about: "A permission turned off after setup", perms: "none" },
  { name: "pause-out", about: "Pause screen: out of time, can borrow", scenario: "pause-out", pause: true },
  { name: "pause-blocked", about: "Pause screen: blocked, only Got it", scenario: "pause-blocked", pause: true },
].map((shot) => ({ scenario: "everyday", perms: "all", setup: true, welcomeSeen: true, batteryDeclined: true, prefs: {}, ...shot }));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const CONNECTION_LOST = /no devices\/emulators|device offline|device '.*' not found|protocol fault|error: closed/;
const RECONNECT_TIMEOUT_MS = 90_000;

let metroForwarded = false;

const phoneIsConnected = () =>
  spawnSync(ADB, ["devices"]).stdout.toString().split("\n").slice(1).some((line) => /\sdevice\s*$/.test(line));

// USB connections can drop for a few seconds and come back by themselves.
function waitForPhone() {
  const deadline = Date.now() + RECONNECT_TIMEOUT_MS;
  while (!phoneIsConnected()) {
    if (Date.now() > deadline) return false;
    sleepSync(2_000);
  }
  // The forward to Metro doesn't survive a reconnect.
  if (metroForwarded) spawnSync(ADB, ["reverse", "tcp:8081", "tcp:8081"]);
  return true;
}

function adb(args, { input, allowFailure = false } = {}) {
  for (let attempt = 0; ; attempt++) {
    const result = spawnSync(ADB, args, { input, maxBuffer: 256 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status === 0) return result.stdout;
    const message = result.stderr.toString().trim();
    if (attempt < 3 && CONNECTION_LOST.test(message) && waitForPhone()) continue;
    if (allowFailure) return result.stdout;
    throw new Error(`adb ${args.join(" ")} failed: ${message.split("\n")[0]}`);
  }
}

const shell = (command, options) => adb(["shell", command], options).toString().trim();
const readAppFile = (path) => adb(["exec-out", `run-as ${PACKAGE} cat ${path}`]);
const writeAppFile = (path, data) => adb(["exec-in", `run-as ${PACKAGE} sh -c 'cat > ${path}'`], { input: data });
const appFileExists = (path) => shell(`run-as ${PACKAGE} ls ${path} 2>/dev/null || true`).length > 0;

function parseArgs(argv) {
  const list = (value) => value.split(",").map((item) => item.trim());
  const options = { devices: null, themes: null, shots: null };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--device") options.devices = list(argv[++index]);
    else if (arg === "--theme") options.themes = list(argv[++index]);
    else if (arg === "--shot") options.shots = list(argv[++index]);
    else if (arg === "--restore") options.restore = true;
    else if (arg === "--list") options.list = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown option "${arg}". Try --help.`);
  }
  return options;
}

function printHelp() {
  console.log(`npm run screenshots [-- options]

  --device a,b   Only these devices
  --theme dark   Only this theme
  --shot a,b     Only shots whose name starts with these
  --list         List devices and shots
  --restore      Put the phone back to normal, and turn tracking off

Output: screenshots/<device>/<theme>/<shot>.png, described in screenshots/INDEX.md`);
}

function printList() {
  console.log("Devices:");
  for (const device of DEVICES) console.log(`  ${device.name.padEnd(28)} ${device.about}`);
  console.log("Shots:");
  for (const shot of SHOTS) console.log(`  ${shot.name.padEnd(28)} ${shot.about}`);
}

function pick(all, wanted, label, matches) {
  if (!wanted) return all;
  for (const name of wanted) {
    if (!all.some((item) => matches(item, name))) throw new Error(`No ${label} "${name}". Try --list.`);
  }
  return all.filter((item) => wanted.some((name) => matches(item, name)));
}

// The phone's font scale before any run, kept in a file so a run that was cut
// off short can't be mistaken for the normal setting. Size and density need no
// record: resetting them always gives the phone's own values.
function saveBaseline() {
  if (existsSync(BASELINE_FILE)) return;
  mkdirSync(OUTPUT, { recursive: true });
  const stayOn = shell("settings get global stay_on_while_plugged_in");
  writeFileSync(BASELINE_FILE, JSON.stringify({ fontScale: shell("settings get system font_scale"), stayOn }));
}

function turnOffTracking() {
  // Without Usage Access, the service doesn't start again, even after a reboot.
  adb(["shell", `am force-stop ${PACKAGE}`], { allowFailure: true });
  adb(["shell", `appops set ${PACKAGE} GET_USAGE_STATS ignore`], { allowFailure: true });
  adb(["shell", `appops set ${PACKAGE} SYSTEM_ALERT_WINDOW ignore`], { allowFailure: true });
}

function restorePhone() {
  turnOffTracking();
  adb(["shell", "wm size reset"], { allowFailure: true });
  adb(["shell", "wm density reset"], { allowFailure: true });
  if (existsSync(BASELINE_FILE)) {
    const { fontScale, stayOn } = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
    adb(["shell", `settings put system font_scale ${fontScale}`], { allowFailure: true });
    adb(["shell", `settings put global stay_on_while_plugged_in ${stayOn}`], { allowFailure: true });
    rmSync(BASELINE_FILE);
  }
  adb(["shell", `rm -f ${REMOTE_UI_DUMP}`], { allowFailure: true });
  metroForwarded = false;
  adb(["reverse", "--remove", "tcp:8081"], { allowFailure: true });
  return phoneIsRestored();
}

// Reads the phone back, rather than trusting that the commands above worked.
function phoneIsRestored() {
  if (!phoneIsConnected()) return false;
  const display = `${shell("wm size")}\n${shell("wm density")}`;
  const tracking = ["GET_USAGE_STATS", "SYSTEM_ALERT_WINDOW"].map((op) => shell(`appops get ${PACKAGE} ${op}`));
  return !display.includes("Override") && tracking.every((mode) => mode.includes("ignore")) && !existsSync(BASELINE_FILE);
}

const RESTORED = "The phone is back to normal, and Roolio Dev's tracking is off.";
const NOT_RESTORED = "Couldn't confirm the phone is back to normal. Reconnect it and run: npm run screenshots -- --restore";

function preflight() {
  const devices = adb(["devices"]).toString().split("\n").slice(1).filter((line) => line.trim());
  if (devices.length !== 1 || !devices[0].endsWith("device")) {
    throw new Error(`Expected one authorized phone, found: ${devices.join(", ") || "none"}`);
  }
  const packages = shell("pm list packages");
  if (!packages.includes(`package:${PACKAGE}\n`) && !packages.endsWith(`package:${PACKAGE}`)) {
    throw new Error(`${PACKAGE} isn't installed. Run: npm run android`);
  }
  for (const app of SAMPLE_APPS) {
    if (!packages.includes(`package:${app.packageName}`)) {
      throw new Error(`The sample data needs ${app.appName} (${app.packageName}) installed.`);
    }
  }
  if (!existsSync(SQLITE)) throw new Error(`sqlite3 not found at ${SQLITE}`);
  shell("input keyevent KEYCODE_WAKEUP");
  if (/isKeyguardShowing=true|mShowingLockscreen=true|mDreamingLockscreen=true/.test(shell("dumpsys window policy"))) {
    throw new Error("The phone is locked. Unlock it and run this again.");
  }
}

async function metroIsUp() {
  try {
    const response = await fetch(`${METRO_URL}/status`);
    return (await response.text()).includes("running");
  } catch {
    return false;
  }
}

// Uses the Metro already running, or starts one for this run.
async function startMetro() {
  adb(["reverse", "tcp:8081", "tcp:8081"]);
  metroForwarded = true;
  if (await metroIsUp()) return null;
  console.log("Starting Metro...");
  const metro = spawn("npx", ["expo", "start", "--dev-client", "--port", "8081"], {
    cwd: ROOT,
    env: { ...process.env, APP_VARIANT: "development", CI: "1" },
    stdio: "ignore",
    detached: true,
  });
  for (let waited = 0; waited < 120; waited++) {
    if (await metroIsUp()) return metro;
    await sleep(1_000);
  }
  throw new Error("Metro didn't start within 2 minutes.");
}

function stopMetro(metro) {
  if (!metro) return;
  try {
    process.kill(-metro.pid);
  } catch {
    // Already gone.
  }
}

function setPermissions(perms) {
  const usage = perms === "none" ? "ignore" : "allow";
  const overlay = perms === "all" || perms === "required" ? "allow" : "ignore";
  shell(`appops set ${PACKAGE} GET_USAGE_STATS ${usage}`);
  shell(`appops set ${PACKAGE} SYSTEM_ALERT_WINDOW ${overlay}`);
  const action = perms === "all" ? "grant" : "revoke";
  shell(`pm ${action} ${PACKAGE} android.permission.POST_NOTIFICATIONS`, { allowFailure: true });
}

function writePrefs(theme, shot) {
  const coreEntries = { theme_mode: theme, ...shot.prefs };
  const core = Object.entries(coreEntries)
    .map(([key, value]) => `<string name="${key}">${value}</string>`)
    .join("");
  const permissions =
    `<boolean name="setup_completed" value="${shot.setup}" />` +
    `<boolean name="welcome_seen" value="${shot.welcomeSeen}" />` +
    `<boolean name="battery_declined" value="${shot.batteryDeclined}" />`;
  shell(`run-as ${PACKAGE} mkdir -p shared_prefs`);
  writeAppFile("shared_prefs/roolio_core.xml", `<?xml version='1.0' encoding='utf-8' standalone='yes' ?><map>${core}</map>`);
  writeAppFile("shared_prefs/roolio_permissions.xml", `<?xml version='1.0' encoding='utf-8' standalone='yes' ?><map>${permissions}</map>`);
  // The development build's menu and its floating button would cover the app.
  const devMenu =
    `<boolean name="showsAtLaunch" value="false" />` +
    `<boolean name="isOnboardingFinished" value="true" />` +
    `<boolean name="showFab" value="false" />`;
  writeAppFile("shared_prefs/expo.modules.devmenu.sharedpreferences.xml", `<?xml version='1.0' encoding='utf-8' standalone='yes' ?><map>${devMenu}</map>`);
}

// Edits a copy of the database and puts it back. Roolio Dev must be stopped.
function seed(scenario) {
  const today = shell("date +%F");
  const dir = mkdtempSync(join(tmpdir(), "roolio-screenshots-"));
  try {
    const db = join(dir, "roolio.db");
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      if (appFileExists(`databases/roolio.db${suffix}`)) {
        writeFileSync(db + suffix, readAppFile(`databases/roolio.db${suffix}`));
      }
    }
    const result = spawnSync(SQLITE, ["-bail", db], {
      input: `PRAGMA wal_checkpoint(TRUNCATE);\n${seedSql(scenario, today)}\nPRAGMA wal_checkpoint(TRUNCATE);\n`,
    });
    if (result.status !== 0) throw new Error(`Seeding failed: ${result.stderr}`);
    shell(`run-as ${PACKAGE} rm -f databases/roolio.db-wal databases/roolio.db-shm databases/roolio.db-journal`);
    writeAppFile("databases/roolio.db", readFileSync(db));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// A dropped connection can cut an image short without adb reporting an error.
function screencap() {
  for (let attempt = 0; ; attempt++) {
    const image = adb(["exec-out", "screencap -p"]);
    const whole =
      image.subarray(0, 4).toString("latin1") === "\x89PNG" && image.subarray(-8, -4).toString("latin1") === "IEND";
    if (whole) return image;
    if (attempt >= 3) throw new Error("Couldn't get a whole screenshot from the phone.");
    waitForPhone();
  }
}

const hash = (data) => createHash("sha1").update(data).digest("hex");

// The screen once two captures in a row match, or the last one after `timeoutMs`.
async function settledScreen(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let last = screencap();
  while (Date.now() < deadline) {
    await sleep(600);
    const next = screencap();
    if (hash(next) === hash(last)) return next;
    last = next;
  }
  return last;
}

function uiNodes() {
  shell(`uiautomator dump ${REMOTE_UI_DUMP}`, { allowFailure: true });
  const xml = shell(`cat ${REMOTE_UI_DUMP}`, { allowFailure: true });
  return [...xml.matchAll(/<node [^>]*>/g)].map(([node]) => {
    const attr = (name) => node.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
    const [x1, y1, x2, y2] = attr("bounds").match(/\d+/g)?.map(Number) ?? [0, 0, 0, 0];
    return {
      text: attr("text"),
      desc: attr("content-desc"),
      packageName: attr("package"),
      x: (x1 + x2) >> 1,
      y: (y1 + y2) >> 1,
    };
  });
}

// Waits for the app's own content, past the splash screen and JS bundling. The
// development build's menu introduces itself once, over the first screen.
// Animated screens can't be read while they move, so that wait has a limit.
async function waitForApp(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let content = false;
  while (Date.now() < deadline) {
    const nodes = uiNodes();
    if (nodes.some(({ text }) => /This is the developer menu/.test(text))) {
      const button = nodes.find(({ text }) => /^Continue$/.test(text));
      if (button) shell(`input tap ${button.x} ${button.y}`);
      content = false;
    } else if (content) {
      return;
    } else {
      content = nodes.some(({ packageName, text, desc }) => packageName === PACKAGE && (text || desc));
    }
    // Lets the menu appear, since it comes a moment after the first screen.
    await sleep(content ? 2_500 : 1_000);
  }
}

function tapNode(pattern) {
  const node = uiNodes().find(({ text, desc }) => pattern.test(text) || pattern.test(desc));
  if (!node) throw new Error(`Nothing on screen matches ${pattern}`);
  shell(`input tap ${node.x} ${node.y}`);
}

function startApp(url) {
  shell(`am start -W -a android.intent.action.VIEW -d '${url}' -p ${PACKAGE}`);
}

// Restarts the app when the data, theme or permissions it starts with changed.
let appState = null;
let seededScenario = null;

async function prepare(shot, theme, device) {
  const wanted = JSON.stringify([device.name, theme, shot.scenario, shot.perms, shot.setup, shot.welcomeSeen, shot.batteryDeclined, shot.prefs]);
  if (wanted === appState) return;
  shell(`am force-stop ${PACKAGE}`);
  // A new install has no database until Roolio Dev first opens.
  if (!appFileExists("databases/roolio.db")) {
    setPermissions("all");
    writePrefs(theme, shot);
    startApp(DEV_LAUNCH);
    await waitForApp(120_000);
    shell(`am force-stop ${PACKAGE}`);
    if (!appFileExists("databases/roolio.db")) throw new Error("Roolio Dev didn't create its database.");
  }
  if (shot.scenario !== seededScenario) {
    seed(shot.scenario);
    seededScenario = shot.scenario;
  }
  setPermissions(shot.perms);
  // The battery step only shows while Roolio Dev's battery use is restricted.
  if (!shot.batteryDeclined) shell(`dumpsys deviceidle whitelist -${PACKAGE}`, { allowFailure: true });
  writePrefs(theme, shot);
  startApp(DEV_LAUNCH);
  await waitForApp(shot.moving ? 12_000 : 60_000);
  appState = wanted;
}

async function saveShot(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log(`  ${relative(ROOT, file)}`);
}

// A sample app opens and the pause screen comes up over it.
async function openPauseScreen() {
  const app = SAMPLE_APPS.find(({ appName }) => appName === "VLC");
  shell(`monkey -p ${app.packageName} -c android.intent.category.LAUNCHER 1`);
  for (let waited = 0; waited < 40; waited++) {
    await sleep(1_000);
    if (uiNodes().some(({ text }) => /^Got it$/i.test(text))) return;
  }
  throw new Error("The pause screen didn't come up within 40 s.");
}

// The development build shows its own launcher when it can't open the app.
const onDevLauncher = () => uiNodes().some(({ text }) => text === "Development Build");

async function openShot(shot, theme, device) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await prepare(shot, theme, device);
    if (shot.link) startApp(`roolio://${shot.link}`);
    if (!shot.moving) await settledScreen();
    if (!onDevLauncher()) return;
    appState = null;
  }
  throw new Error("Roolio Dev kept opening its launcher instead of the app.");
}

async function capture(shot, theme, device) {
  const dir = join(OUTPUT, device.name, theme);
  if (shot.pause) {
    await prepare(shot, theme, device);
    await openPauseScreen();
    await saveShot(join(dir, `${shot.name}.png`), await settledScreen());
    // "Got it" stops the app and goes home, so the next shot starts clean.
    tapNode(/^Got it$/i);
    await sleep(1_000);
    appState = null;
    return;
  }
  await openShot(shot, theme, device);
  if (shot.tap) tapNode(shot.tap);
  if (shot.moving) {
    await sleep(4_000);
    await saveShot(join(dir, `${shot.name}.png`), screencap());
    return;
  }
  await saveShot(join(dir, `${shot.name}.png`), await settledScreen());
  if (!shot.scroll) return;
  const [width, height] = shell("wm size").match(/(\d+)x(\d+)\s*$/).slice(1).map(Number);
  let contents = screenContents();
  for (let part = 2; part <= 6; part++) {
    shell(`input swipe ${width >> 1} ${height * 0.75 | 0} ${width >> 1} ${height * 0.25 | 0} 500`);
    const next = await settledScreen();
    const nextContents = screenContents();
    if (nextContents === contents) break;
    contents = nextContents;
    await saveShot(join(dir, `${shot.name}--scroll-${part}.png`), next);
  }
}

// What the app shows and where. Unlike an image, it ignores the status bar's
// clock and network speed, so it tells when a screen has scrolled to its end.
const screenContents = () => JSON.stringify(uiNodes());

function applyDevice(device, baselineFont) {
  shell(device.size ? `wm size ${device.size}` : "wm size reset");
  shell(device.density ? `wm density ${device.density}` : "wm density reset");
  shell(`settings put system font_scale ${device.fontScale ?? baselineFont}`);
}

// What every saved file shows, so a screenshot can be found without opening it.
function writeIndex() {
  const lines = ["# Screenshots", "", "Made by `npm run screenshots`: `<device>/<theme>/<shot>.png`, with `--scroll-N` for further down the same screen.", "", "## Devices", ""];
  for (const device of DEVICES) lines.push(`- \`${device.name}\`: ${device.about}`);
  lines.push("", "## Shots", "");
  for (const shot of SHOTS) lines.push(`- \`${shot.name}\`: ${shot.about}`);
  lines.push("", "## Files", "");
  for (const device of readdirSync(OUTPUT, { withFileTypes: true })) {
    if (!device.isDirectory()) continue;
    for (const theme of readdirSync(join(OUTPUT, device.name))) {
      const files = readdirSync(join(OUTPUT, device.name, theme)).filter((file) => file.endsWith(".png"));
      lines.push(`- \`${device.name}/${theme}\`: ${files.length} screenshots`);
    }
  }
  writeFileSync(join(OUTPUT, "INDEX.md"), `${lines.join("\n")}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();
  if (options.list) return printList();
  if (options.restore) {
    const restored = restorePhone();
    console.log(restored ? RESTORED : NOT_RESTORED);
    if (!restored) process.exitCode = 1;
    return;
  }

  const devices = pick(DEVICES, options.devices, "device", (device, name) => device.name === name);
  const themes = pick(THEMES, options.themes, "theme", (theme, name) => theme === name);
  const shots = pick(SHOTS, options.shots, "shot", (shot, name) => shot.name.startsWith(name));

  preflight();
  saveBaseline();
  const { fontScale } = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
  let metro = null;
  const cleanUp = () => {
    stopMetro(metro);
    const restored = restorePhone();
    console.log(restored ? RESTORED : NOT_RESTORED);
    return restored;
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      cleanUp();
      process.exit(1);
    });
  }

  let failed = 0;
  try {
    metro = await startMetro();
    // Keep the screen on while plugged in, so a run isn't stopped by a timeout.
    shell("settings put global stay_on_while_plugged_in 7");
    for (const device of devices) {
      applyDevice(device, fontScale);
      for (const theme of themes) {
        console.log(`${device.name} / ${theme}`);
        for (const shot of shots) {
          try {
            await capture(shot, theme, device);
          } catch (error) {
            failed++;
            appState = null;
            console.error(`  FAILED ${shot.name}: ${error.message}`);
          }
        }
      }
    }
    writeIndex();
  } finally {
    if (!cleanUp()) process.exitCode = 1;
  }
  console.log(`Done, with ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
