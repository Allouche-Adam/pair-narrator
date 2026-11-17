# Decisions

## 2026-11-17: Natural voice by default, English only, and a stop command
- **Chosen:** the natural voice downloads automatically the first time voice is turned on (and says so out loud). English only: language detection removed. New `stop` command, and any new message stops the old talk and skips text left over from an interrupted turn. If the natural voice fails, the backup voice says so once instead of silently taking over.
- **Why:** the user wants the best voice without an extra step, and wants the project kept simple. Interrupting and changing topic kept the old narration playing.
- **Rejected:** the separate `voice setup` step (extra step people miss); keeping multi-language support (more code than value right now).
- **Affects:** replaces "installed on request" in the Kokoro decision below, and drops the multi-language part of the earlier voice decision. Turning voice on now starts a ~600 MB download.

## 2026-11-16: Kokoro (local AI voice) as the natural voice
- **Chosen:** Kokoro-82M through `kokoro-js` 1.2.1, installed on request (`voice setup`) into `~/.pair-narrator`, full-precision (fp32) model, default voice Heart, volume 50%. System voices stay as the fallback.
- **Why:** the system voices sounded robotic and scary at full volume. Kokoro sounds natural, is free, works offline and keeps text on the machine. fp32 measured fastest on a normal CPU (about 3.5x talking speed warm, vs about 1x for the compressed q8 version).
- **Rejected:** Claude app voices (not available to third-party programs: the Claude API has no text-to-speech); cloud voices like OpenAI/ElevenLabs (API key, cost, text leaves the machine; could be an opt-in later); bundling Kokoro in the plugin (580 MB for everyone, even people who never use voice); downloading automatically (surprise 600 MB download).
- **Affects:** about 580 MB disk and roughly 400 MB of memory while the speaker is running. English only for now. Needs npm. Mac/Linux playback (afplay, paplay/aplay) is written but untested.

## 2026-11-16: Voice through a hook and the system's own TTS (system voice is now the fallback, see Kokoro above)
- **Chosen:** a Node.js hook (`hooks/voice.js`) that reads new assistant text from the transcript and speaks it with built-in voices (Windows System.Speech, macOS `say`, Linux `espeak-ng`). A file queue plus a single background speaker keeps voices in order and never blocks Claude. Voice state is per session.
- **Why:** voice is the selling point ("listen while you look at the screen"). Built-in voices need no account, API key, or cost, and send nothing off the machine.
- **Rejected:** cloud TTS (nicer voices, but costs money and sends text to a third party; could be an option later); Windows' newer neural voices (not visible to System.Speech, needs WinRT); PowerShell- or Python-only scripts (not cross-platform).
- **Affects:** this reverses "voice hook rejected" in the first decision below. Users need Node 18+. Every tool call now starts a short Node process (about a quarter second, nothing happens when voice is off).

## 2026-11-16: Explain, don't announce
- **Chosen:** one top rule with a bad/good example: the message itself must contain the explanation, not a list of topics or code comments.
- **Why:** in a real session teach mode said "covering event listeners, preventDefault..." without explaining any of it.
- **Rejected:** only rewording each level (the failure was the same at every level).

## 2026-11-16: Demo with real output, not invented text
- **Chosen:** the README demo uses real test-run output where possible, and labels the one written illustration. A full real example lives in `examples/tip-calculator/`.
- **Why:** people trust a demo more when they can open the actual files it produced.
- **Rejected:** a GIF/video for now (needs a screen recording; good to add later); fully invented demos (could oversell the plugin).
- **Affects:** when the skill changes a lot, the example should be regenerated so it stays honest.

## 2026-11-16: Narrate live by default, `later` is opt-in
- **Chosen:** live narration stays the default. `later` works quietly, keeps notes, and explains at the end. Plain phrases like "just code" switch modes too.
- **Why:** live narration is the point of the plugin, but sometimes users just want the code first. Notes keep the end explanation accurate.
- **Rejected:** "later" as default (loses the learning-as-it-happens idea); only an exact command (people say "stop" naturally when annoyed).
- **Affects:** Claude has to recognise mode-switch phrases, which is less predictable than a command.

## 2026-11-16: Add a third level, `teach`, plus a recap document
- **Chosen:** `teach` level (examples, definitions, patient but not babyish), step notes in `narrate-notes/log.md`, and `/narrate recap` writing `narrate-notes/RECAP.md` with a Mermaid diagram.
- **Why:** some learners want more than vibe-level talk, and a document to reread later. Notes during the work make the recap accurate instead of rebuilt from memory.
- **Rejected:** keeping only two levels (replaces the earlier "two levels" decision below); image diagrams (Mermaid is text and renders on GitHub and in VS Code); notes in every level (adds files the vibe/engineer users didn't ask for).
- **Affects:** the plugin now writes files into the user's project, in `narrate-notes/`. Users may want to add it to `.gitignore`.

## 2026-11-16: Use a skill, not an output style
- **Chosen:** one `/narrate` skill that takes a level word.
- **Why:** people can switch it on, change level, or turn it off mid-session with one command. Easy to understand and share.
- **Rejected:** output styles (need a settings change to switch, less beginner-friendly); a voice hook (useful later, but adds setup).
- **Affects:** instructions live inside the conversation, so on very long sessions Claude can drift; users re-run the command.

## 2026-11-16: Two levels, vibe and engineer (replaced by the `teach` decision above)
- **Chosen:** `vibe` (default, no jargon) and `engineer` (technical, trade-offs).
- **Why:** covers the two main audiences without making people pick from many options.
- **Rejected:** a 1–5 detail scale (harder to explain, levels blur together).
