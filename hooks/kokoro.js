// Pair Narrator: the natural "Kokoro" voice and audio playback.
//
// Kokoro is a small open-source AI voice model (82 million parameters) that
// runs on the user's own computer. It isn't bundled with the plugin because
// it's large (about 580 MB): the first time voice is turned on, voice.js
// downloads it once into ~/.pair-narrator/kokoro, in the background. Until
// then, voice.js uses the computer's built-in system voice and says so.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { pathToFileURL } = require("url");

const DATA = path.join(os.homedir(), ".pair-narrator");
const DIR = path.join(DATA, "kokoro");
const MODELS = path.join(DIR, "models");
const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const MODEL_FILE = path.join(MODELS, ...MODEL_ID.split("/"), "onnx", "model.onnx");
const STATUS = path.join(DATA, "setup-status.json");
const KOKORO_VERSION = "1.2.1";

// All 28 Kokoro voices. The prefix is accent + gender:
// a = American, b = British; f = female, m = male.
const VOICES = ("af_alloy af_aoede af_bella af_heart af_jessica af_kore af_nicole af_nova af_river " +
  "af_sarah af_sky am_adam am_echo am_eric am_fenrir am_liam am_michael am_onyx am_puck am_santa " +
  "bf_alice bf_emma bf_isabella bf_lily bm_daniel bm_fable bm_george bm_lewis").split(" ");
const DEFAULT_VOICE = "af_heart";

// "michael" -> "am_michael", "af_heart" -> "af_heart", unknown -> null
function voiceId(name) {
  const n = String(name || "").toLowerCase();
  if (VOICES.includes(n)) return n;
  return VOICES.find((v) => v.slice(3) === n) || null;
}

function installed() {
  return fs.existsSync(path.join(DIR, "node_modules", "kokoro-js")) && fs.existsSync(MODEL_FILE);
}

function setupStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS, "utf8")); } catch { return {}; }
}

// ---------- loading the model ----------

// A tiny ES module placed next to the installed packages, so that "kokoro-js"
// resolves to the copy in ~/.pair-narrator and not to anything in the plugin.
const ENGINE_SOURCE = `import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";
env.cacheDir = ${JSON.stringify(MODELS)};
export async function load(allowDownload) {
  env.allowRemoteModels = allowDownload;
  // fp32 is the full-size model. On a normal CPU it is the fastest version
  // (about 3.5x faster than talking speed), because the compressed versions
  // have to be unpacked during the math.
  return KokoroTTS.from_pretrained(${JSON.stringify(MODEL_ID)}, { dtype: "fp32", device: "cpu" });
}
`;

let tts = null;
async function load(allowDownload = false) {
  if (tts) return tts;
  const engine = path.join(DIR, "engine.mjs");
  if (!fs.existsSync(engine) || fs.readFileSync(engine, "utf8") !== ENGINE_SOURCE) {
    fs.writeFileSync(engine, ENGINE_SOURCE);
  }
  const mod = await import(pathToFileURL(engine).href);
  tts = await mod.load(allowDownload);
  return tts;
}

// Turn text into a WAV file. Volume is applied by scaling the sound wave
// itself (0.5 = half as loud), which works the same on every computer.
async function synthesize(text, file, { voice, volume, speed }) {
  const model = await load();
  const v = voiceId(voice) || DEFAULT_VOICE;
  const audio = await model.generate(text, { voice: v, speed });
  const samples = audio.audio;
  for (let i = 0; i < samples.length; i++) samples[i] *= volume;
  await audio.save(file);
}

// Kokoro reads a limited amount of text at a time, and short pieces also let
// us start talking sooner. Split into sentences, grouped up to ~250 characters.
function chunk(text, max = 250) {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
  const out = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && (cur + s).length > max) { out.push(cur.trim()); cur = ""; }
    cur += s;
    while (cur.length > max * 1.5) { // one very long sentence: cut at a comma or space
      let cut = cur.lastIndexOf(", ", max);
      if (cut < max / 2) cut = cur.lastIndexOf(" ", max);
      if (cut <= 0) cut = max;
      out.push(cur.slice(0, cut + 1).trim()); cur = cur.slice(cut + 1);
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// ---------- playing a WAV file ----------

// On Windows, starting PowerShell takes about half a second, so one
// PowerShell "player" stays open and plays each file it is sent.
let player = null;
let waiting = null;
function windowsPlayer(onPid) {
  if (player) return player;
  const ps = "while (($l = [Console]::In.ReadLine()) -ne $null) { " +
    "try { (New-Object System.Media.SoundPlayer $l).PlaySync() } catch {} ; [Console]::Out.WriteLine('done') }";
  player = spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { windowsHide: true });
  onPid(player.pid);
  player.stdout.on("data", (d) => { if (String(d).includes("done") && waiting) { const w = waiting; waiting = null; w(); } });
  player.on("exit", () => { player = null; if (waiting) { const w = waiting; waiting = null; w(); } });
  player.on("error", () => { player = null; });
  return player;
}

function play(file, onPid) {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      const p = windowsPlayer(onPid);
      waiting = resolve;
      p.stdin.write(file + "\n");
      return;
    }
    const tries = process.platform === "darwin"
      ? [["afplay", [file]]]
      : [["paplay", [file]], ["aplay", ["-q", file]], ["ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", file]]];
    const next = () => {
      const t = tries.shift();
      if (!t) return resolve();
      const p = spawn(t[0], t[1], { stdio: "ignore" });
      onPid(p.pid);
      p.on("error", next);
      p.on("exit", () => resolve());
    };
    next();
  });
}

function closePlayer() {
  if (player) { try { player.stdin.end(); } catch {} }
}

// ---------- one-time setup ----------

function writeStatus(s) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(STATUS, JSON.stringify({ ...s, time: new Date().toISOString() }));
}

async function setup(log) {
  writeStatus({ state: "installing" });
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const pkg = path.join(DIR, "package.json");
    if (!fs.existsSync(pkg)) {
      fs.writeFileSync(pkg, JSON.stringify({ name: "pair-narrator-kokoro", private: true, type: "module" }));
    }
    log("Installing kokoro-js...");
    // One fixed command string (no user input in it). A shell is needed on
    // Windows, where npm is a .cmd script.
    const npm = spawnSync(`npm install kokoro-js@${KOKORO_VERSION} --no-audit --no-fund --loglevel=error`,
      { cwd: DIR, shell: true, encoding: "utf8", windowsHide: true });
    if (npm.status !== 0) throw new Error("npm install failed: " + (npm.stderr || npm.error || "").toString().slice(0, 500));

    // The AI engine ships ready-made files for Windows, macOS and Linux.
    // Only this computer's are ever used, so delete the others (~140 MB).
    const bin = path.join(DIR, "node_modules", "onnxruntime-node", "bin");
    for (const napi of fs.existsSync(bin) ? fs.readdirSync(bin) : []) {
      for (const plat of fs.readdirSync(path.join(bin, napi))) {
        if (plat !== process.platform) fs.rmSync(path.join(bin, napi, plat), { recursive: true, force: true });
      }
    }

    log("Downloading the voice model (about 310 MB)...");
    await load(true);
    writeStatus({ state: "ready" });
    log("Ready.");
  } catch (err) {
    writeStatus({ state: "failed", error: String(err && err.message || err) });
    throw err;
  }
}

module.exports = { VOICES, DEFAULT_VOICE, voiceId, installed, setupStatus, setup, synthesize, chunk, play, closePlayer, DATA };
