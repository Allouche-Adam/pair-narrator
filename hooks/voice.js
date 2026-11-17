#!/usr/bin/env node
// Pair Narrator voice hook.
//
// Claude Code runs this script at four moments (see hooks.json):
//   prompt  - the user sent a message: turn voice on/off, or mute
//   tool    - Claude is about to use a tool: speak what it just wrote
//   stop    - Claude finished its turn: speak the final message
//   notify  - Claude needs the user (e.g. a permission prompt): say so
//   speak   - internal: the background speaker that reads the queue aloud
//
// It must never break Claude Code, so every error is swallowed and the
// script prints nothing (output from a prompt hook would be shown to Claude).

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const kokoro = require("./kokoro.js");

const BASE = path.join(os.tmpdir(), "pair-narrator");
const QUEUE = path.join(BASE, "queue");
const SPEAKER_LOCK = path.join(BASE, "speaker.lock");
const CURRENT_TTS = path.join(BASE, "tts.pid");
const MUTE_MARK = path.join(BASE, "muted-at");
const CONFIG = path.join(kokoro.DATA, "config.json"); // remembered between sessions
const MAX_CHARS = 3000;

const mode = process.argv[2];

async function main() {
  fs.mkdirSync(QUEUE, { recursive: true });
  if (mode === "speak") return runSpeaker();
  if (mode === "setup") return runSetup();

  const input = JSON.parse(await readStdin() || "{}");
  const session = input.session_id || "default";
  const state = loadState(session);

  if (mode === "prompt") return onPrompt(input, session, state);
  if (!state.voice) return; // voice is off: do nothing, as fast as possible

  if (mode === "notify") {
    if (input.message) enqueue(input.message);
    return;
  }
  if (mode === "tool" || mode === "stop") {
    // On stop, the final message can land in the transcript a moment late,
    // so retry briefly if nothing new is there yet.
    const tries = mode === "stop" ? 4 : 1;
    for (let i = 0; i < tries; i++) {
      if (await withLock(session, () => speakNew(input, session))) return;
      await sleep(250);
    }
  }
}

// ---------- turning voice on and off ----------

function onPrompt(input, session, state) {
  const prompt = String(input.prompt || "").trim();
  const lower = prompt.toLowerCase();

  // "/narrate ..." or "/pair-narrator:narrate ...", typed as plain text or
  // wrapped by Claude Code as <command-name>…</command-name><command-args>…
  const wrapped = lower.match(/<command-name>\/?(?:pair-narrator:)?narrate<\/command-name>[\s\S]*?<command-args>([\s\S]*?)<\/command-args>/);
  const cmd = wrapped || lower.match(/^\/(?:pair-narrator:)?narrate\b(.*)$/s);
  if (cmd) {
    const args = cmd[1].trim().split(/\s+/).filter(Boolean);
    const has = (w) => args.includes(w);
    if (has("off") && !has("voice")) return setVoice(session, state, input, false); // /narrate off
    if ((has("voice") && has("off")) || has("mute")) return setVoice(session, state, input, false);
    if (has("stop")) return stopSpeaking(); // stop talking now; voice stays on for the next reply

    const config = loadConfig();
    let said = null;

    // Volume: "louder", "quieter", or "volume 30"
    const volAt = args.indexOf("volume");
    const volNum = volAt >= 0 ? Number(args[volAt + 1]) : NaN;
    if (has("louder") || has("quieter") || has("softer") || !Number.isNaN(volNum)) {
      let v = settings().volume;
      if (has("louder")) v += 15;
      if (has("quieter") || has("softer")) v -= 15;
      if (!Number.isNaN(volNum)) v = volNum;
      config.volume = Math.max(5, Math.min(100, Math.round(v)));
      said = `Volume ${config.volume}.`;
    }

    // Voice name: "voice michael", "voice bf_emma"
    const named = args.map(kokoro.voiceId).find(Boolean);
    if (named) {
      config.voice = named;
      const name = named.slice(3);
      said = `Hi, I'm ${name[0].toUpperCase() + name.slice(1)}. I'll be your voice from now on.`;
    } else {
      // "voice micheal": say so instead of quietly keeping the old voice.
      const after = args[args.indexOf("voice") + 1];
      const known = ["off", "louder", "quieter", "softer", "volume", "vibe", "teach", "engineer", "later", "recap"];
      if (has("voice") && after && !known.includes(after) && Number.isNaN(Number(after))) {
        said = `I don't know a voice called ${after}, so I'm keeping the current one.`;
      }
    }
    saveConfig(config);

    if (has("voice") || named || said) {
      if (!state.voice) setVoice(session, state, input, true);
      startSetup(); // first time only: download the natural voice in the background
      if (said) enqueue(said);
      maybeHint(session);
    }
    return; // otherwise a level change only: leave voice as it is
  }

  if (!state.voice) return;
  // Plain words work instantly, without waiting for Claude.
  if (/\b(be quiet|shut up|mute)\b/.test(lower)) return setVoice(session, state, input, false);
  // Any other new message: stop talking about the old one, and skip what an
  // interrupted turn left unspoken, so you only hear about the new topic.
  stopSpeaking();
  state.lastUuid = lastUuid(readTranscript(input.transcript_path)) || state.lastUuid;
  saveState(session, state);
}

function setVoice(session, state, input, on) {
  state.voice = on;
  if (on) {
    // Start speaking from now on, not the whole past conversation.
    state.lastUuid = lastUuid(readTranscript(input.transcript_path));
  } else {
    stopSpeaking();
  }
  saveState(session, state);
}

// ---------- settings and the one-time natural voice setup ----------

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG, "utf8")); } catch { return {}; }
}
function saveConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
}
// Environment variables win over saved settings, which win over defaults.
function settings() {
  const c = loadConfig();
  const env = process.env;
  return {
    voice: env.PAIR_NARRATOR_VOICE || c.voice || kokoro.DEFAULT_VOICE,
    volume: Number(env.PAIR_NARRATOR_VOLUME || c.volume || 50),
    rate: Number(env.PAIR_NARRATOR_RATE || c.rate || 0), // -10 (slow) to 10 (fast)
    engine: env.PAIR_NARRATOR_ENGINE || c.engine || "auto", // auto | kokoro | system
  };
}

function setupRunning() {
  const s = kokoro.setupStatus();
  // A setup that has said "installing" for over 30 minutes probably crashed.
  return s.state === "installing" && Date.now() - Date.parse(s.time) < 30 * 60 * 1000;
}

function startSetup() {
  if (kokoro.installed() || setupRunning()) return;
  const child = spawn(process.execPath, [__filename, "setup"], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

async function runSetup() {
  const logFile = path.join(kokoro.DATA, "setup.log");
  const log = (m) => fs.appendFileSync(logFile, `${new Date().toISOString()} ${m}\n`);
  try {
    await kokoro.setup(log);
    enqueue("The natural voice is ready. This is how I'll sound from now on.");
  } catch (err) {
    log("FAILED: " + (err && err.stack || err));
    enqueue("Sorry, I couldn't set up the natural voice. The details are in the setup log.");
  }
}

// Once per session, while the natural voice is still downloading, say why
// the voice sounds robotic for now.
function maybeHint(session) {
  const state = loadState(session);
  if (state.hinted || kokoro.installed()) return;
  state.hinted = true;
  saveState(session, state);
  enqueue("I'm downloading my natural voice in the background. It's about 600 megabytes, only once. " +
    "Until it's ready, I'll use the computer's built-in voice, and I'll tell you when I switch.");
}

// ---------- reading new messages from the transcript ----------

function speakNew(input, session) {
  const state = loadState(session);
  if (!state.voice) return true;
  const entries = readTranscript(input.transcript_path);
  if (!entries.length) return false;

  // Find where we stopped last time. If that point is gone, start after
  // the user's most recent message instead.
  let start = state.lastUuid ? entries.findIndex((e) => e.uuid === state.lastUuid) + 1 : 0;
  if (start === 0) {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (isUserText(entries[i])) { start = i + 1; break; }
    }
  }

  const texts = [];
  for (const e of entries.slice(start)) {
    if (e.type !== "assistant" || e.isSidechain) continue; // skip subagents
    for (const c of (e.message && e.message.content) || []) {
      if (c.type === "text" && c.text) texts.push(c.text);
      // Newer models (e.g. Opus 5.5) store the short updates between steps as
      // "thinking" blocks whose text is a summary shown on screen. Empty ones
      // are hidden reasoning and are skipped.
      else if (c.type === "thinking" && c.thinking) texts.push(c.thinking);
    }
  }
  state.lastUuid = lastUuid(entries) || state.lastUuid;
  saveState(session, state);

  const spoken = clean(texts.join("\n\n"));
  if (spoken) enqueue(spoken);
  return texts.length > 0;
}

function readTranscript(file) {
  if (!file || !fs.existsSync(file)) return [];
  // Only read the end of the file: transcripts can grow to many megabytes.
  const size = fs.statSync(file).size;
  const len = Math.min(size, 2 * 1024 * 1024);
  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, size - len);
  fs.closeSync(fd);
  const lines = buf.toString("utf8").split("\n");
  if (len < size) lines.shift(); // first line is probably cut in half
  const out = [];
  for (const l of lines) {
    try { const e = JSON.parse(l); if (e && e.uuid) out.push(e); } catch {}
  }
  return out;
}

function isUserText(e) {
  if (e.type !== "user" || !e.message) return false;
  const c = e.message.content;
  if (typeof c === "string") return true;
  return Array.isArray(c) && c.some((x) => x.type === "text");
}

function lastUuid(entries) {
  return entries.length ? entries[entries.length - 1].uuid : null;
}

// ---------- turning markdown into something nice to hear ----------

function clean(md) {
  let t = md;
  t = t.replace(/```[\s\S]*?```/g, " ");                    // code blocks: on screen only
  t = t.replace(/^\s*\|.*$/gm, " ");                         // tables
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");               // images
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");             // [text](link) -> text
  t = t.replace(/https?:\/\/\S+/g, "a link");                // bare URLs
  t = t.replace(/`([^`]+)`/g, (_, code) => shortName(code)); // `code` -> code
  t = t.replace(/[A-Za-z]:\\[^\s,)]+/g, (p) => shortName(p));     // Windows paths
  t = t.replace(/(?:\.{0,2}\/)?(?:[\w.-]+\/){2,}[\w.-]+/g, (p) => shortName(p)); // long paths
  t = t.replace(/^\s{0,3}#{1,6}\s*/gm, "");                  // headings
  t = t.replace(/^\s*>\s?/gm, "");                           // quotes
  t = t.replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "");             // list markers
  t = t.replace(/(\*\*|__|\*|~~)/g, "");                     // bold, italics
  t = t.replace(/\s*(?:→|->)\s*/g, ", then ").replace(/[─━]+/g, " ");
  t = t.replace(/\s*\n\s*\n\s*/g, ". ").replace(/\s+/g, " ");
  t = t.replace(/([.!?:])\s*\.\s/g, "$1 ").replace(/\.\s*\./g, ".").trim();
  if (t.length > MAX_CHARS) {
    const cut = t.lastIndexOf(". ", MAX_CHARS);
    t = t.slice(0, cut > 0 ? cut + 1 : MAX_CHARS) + " The rest is on screen.";
  }
  return /[a-z0-9]/i.test(t) ? t : "";
}

function shortName(p) {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : p;
}

// ---------- the queue and the background speaker ----------

let counter = 0;
function enqueue(text) {
  const name = `${Date.now()}-${process.pid}-${counter++}`;
  const tmp = path.join(QUEUE, name + ".tmp");
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, path.join(QUEUE, name + ".txt")); // rename = appears all at once
  startSpeaker();
}

function startSpeaker() {
  if (speakerAlive()) return;
  const child = spawn(process.execPath, [__filename, "speak"], {
    detached: true, stdio: "ignore", windowsHide: true,
  });
  child.unref(); // let this hook exit while the speaker keeps talking
}

function speakerAlive() {
  try { return isAlive(Number(fs.readFileSync(path.join(SPEAKER_LOCK, "pid"), "utf8"))); }
  catch { return false; }
}

async function runSpeaker() {
  // Only one speaker at a time, so voices never overlap.
  try { fs.mkdirSync(SPEAKER_LOCK); }
  catch {
    if (speakerAlive()) return;
    fs.rmSync(SPEAKER_LOCK, { recursive: true, force: true }); // left over from a crash
    try { fs.mkdirSync(SPEAKER_LOCK); } catch { return; }
  }
  fs.writeFileSync(path.join(SPEAKER_LOCK, "pid"), String(process.pid));
  try {
    // With the natural voice, stay around for two minutes after the last
    // sentence so the model stays loaded and the next reply starts quickly.
    let idleSince = Date.now();
    while (Date.now() - idleSince < (usedKokoro ? 120000 : 1500)) {
      const next = fs.readdirSync(QUEUE).filter((f) => f.endsWith(".txt")).sort()[0];
      if (!next) { await sleep(300); continue; }
      const file = path.join(QUEUE, next);
      let text = "";
      try { text = fs.readFileSync(file, "utf8"); fs.unlinkSync(file); } catch { continue; }
      if (text) await say(text);
      idleSince = Date.now();
    }
  } finally {
    kokoro.closePlayer();
    fs.rmSync(SPEAKER_LOCK, { recursive: true, force: true });
  }
}

let usedKokoro = false;
let warnedFallback = false;

async function say(text) {
  const s = settings();
  const useKokoro = s.engine !== "system" && kokoro.installed();
  // Test mode: write what would be spoken to a file instead of speaking.
  if (process.env.PAIR_NARRATOR_DRY_RUN) {
    fs.appendFileSync(process.env.PAIR_NARRATOR_DRY_RUN, `[${useKokoro ? "kokoro" : "system"}] ${text}\n---\n`);
    return;
  }
  if (useKokoro) {
    try { await sayKokoro(text, s); usedKokoro = true; return; }
    catch (err) {
      // Fallback: the backup voice reads it, but says so once, so the user
      // isn't left wondering why the voice suddenly sounds different.
      logError(err);
      if (!warnedFallback) {
        warnedFallback = true;
        await saySystem("The natural voice had a problem, so I'm using the backup voice. The details are in the error log.", s);
      }
    }
  }
  await saySystem(text, s);
}

// Natural voice: make the next sentence while the current one plays,
// so there are no gaps between sentences.
async function sayKokoro(text, s) {
  const startedAt = mutedAt();
  const opts = { voice: kokoro.voiceId(s.voice) || kokoro.DEFAULT_VOICE, volume: s.volume / 100,
    speed: Math.max(0.5, Math.min(2, 1 + s.rate * 0.05)) };
  const parts = kokoro.chunk(text);
  const wav = (i) => path.join(BASE, `say-${process.pid}-${i}.wav`);
  let pending = kokoro.synthesize(parts[0], wav(0), opts);
  for (let i = 0; i < parts.length; i++) {
    await pending;
    if (i + 1 < parts.length) pending = kokoro.synthesize(parts[i + 1], wav(i + 1), opts);
    if (mutedAt() !== startedAt) break; // the user said "stop talking"
    await kokoro.play(wav(i), (pid) => fs.writeFileSync(CURRENT_TTS, String(pid)));
    fs.rm(wav(i), { force: true }, () => {});
    if (mutedAt() !== startedAt) break;
  }
  await pending.catch(() => {});
  for (let i = 0; i < parts.length; i++) fs.rm(wav(i), { force: true }, () => {});
}

function mutedAt() {
  try { return fs.readFileSync(MUTE_MARK, "utf8"); } catch { return ""; }
}

// Built-in system voice: used while the natural voice is downloading,
// or if it fails.
function saySystem(text, s) {
  const file = path.join(BASE, `say-${process.pid}.txt`);
  fs.writeFileSync(file, text, "utf8");
  const rate = s.rate;
  // Kokoro voice names like "af_heart" mean nothing to the system voice.
  const chosenVoice = kokoro.voiceId(s.voice) ? "" : s.voice;
  let cmd, args;
  if (process.platform === "win32") {
    const ps = [
      "Add-Type -AssemblyName System.Speech",
      "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
      "if ($env:PN_VOICE) { try { $s.SelectVoice($env:PN_VOICE) } catch {} }",
      `$s.Rate = ${Math.max(-10, Math.min(10, rate))}`,
      `$s.Volume = ${Math.max(0, Math.min(100, s.volume))}`,
      "$s.Speak([IO.File]::ReadAllText($env:PN_FILE, [Text.Encoding]::UTF8))",
    ].join("; ");
    cmd = "powershell"; args = ["-NoProfile", "-NonInteractive", "-Command", ps];
  } else if (process.platform === "darwin") {
    // "[[volm 0.5]]" is the say command's own way to set loudness.
    fs.writeFileSync(file, `[[volm ${(s.volume / 100).toFixed(2)}]] ` + text, "utf8");
    cmd = "say"; args = ["-f", file];
    if (chosenVoice) args.push("-v", chosenVoice);
    if (rate) args.push("-r", String(175 + rate * 15));
  } else {
    // espeak's loudness ("amplitude") goes from 0 to 200, with 100 as normal.
    cmd = "espeak-ng"; args = ["-v", chosenVoice || "en", "-a", String(s.volume * 2), "-f", file]; // falls back below
  }
  return new Promise((resolve) => {
    const run = (c, a, fallbacks) => {
      const p = spawn(c, a, { stdio: "ignore", windowsHide: true, env: { ...process.env, PN_FILE: file, PN_VOICE: chosenVoice } });
      try { fs.writeFileSync(CURRENT_TTS, String(p.pid)); } catch {}
      p.on("error", () => (fallbacks.length ? run(...fallbacks.shift(), fallbacks) : resolve()));
      p.on("exit", (code) => {
        if (code) logError(`${c} exited with code ${code}`);
        fs.rm(file, { force: true }, () => resolve());
      });
    };
    run(cmd, args, process.platform === "linux"
      ? [["espeak", ["-v", chosenVoice || "en", "-f", file]], ["spd-say", ["-w", text]]]
      : []);
  });
}

function stopSpeaking() {
  // Empty the queue, mark the moment (so sentences already being prepared
  // are dropped), then stop whatever is being said right now.
  for (const f of fs.readdirSync(QUEUE)) fs.rmSync(path.join(QUEUE, f), { force: true });
  fs.writeFileSync(MUTE_MARK, String(Date.now()));
  try {
    const pid = Number(fs.readFileSync(CURRENT_TTS, "utf8"));
    if (isAlive(pid)) process.kill(pid);
  } catch {}
}

// ---------- small helpers ----------

function stateFile(session) {
  return path.join(BASE, `session-${String(session).replace(/[^\w-]/g, "")}.json`);
}
function loadState(session) {
  try { return JSON.parse(fs.readFileSync(stateFile(session), "utf8")); } catch { return {}; }
}
function saveState(session, state) {
  fs.writeFileSync(stateFile(session), JSON.stringify(state));
}

// Two tool calls can start at the same moment; the lock stops both of them
// from speaking the same message.
async function withLock(session, fn) {
  const lock = stateFile(session) + ".lock";
  for (let i = 0; i < 40; i++) {
    try { fs.mkdirSync(lock); break; }
    catch {
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 5000) fs.rmSync(lock, { recursive: true, force: true }); } catch {}
      await sleep(50);
    }
  }
  try { return fn(); } finally { fs.rmSync(lock, { recursive: true, force: true }); }
}

function isAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}
// Errors never reach Claude, but they're kept here for debugging.
function logError(err) {
  try {
    fs.mkdirSync(BASE, { recursive: true });
    fs.appendFileSync(path.join(BASE, "errors.log"), `${new Date().toISOString()} [${mode}] ${err && err.stack || err}\n`);
  } catch {}
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    if (process.stdin.isTTY) return resolve("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => (data += d));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 3000);
  });
}

// Start at the very end of the file, once every constant above exists.
// (Starting at the top once broke the speaker: a constant wasn't defined yet.)
// Run only when started by Claude Code, not when a test file loads this one.
if (require.main === module) {
  main().catch(logError).finally(() => process.exit(0));
} else {
  module.exports = { clean };
}
