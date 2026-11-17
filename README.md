<div align="center">

# 🎙️ Pair Narrator

**Claude Code that talks you through what it's building, and why.**

Like a teammate sitting next to you, not a status log. **Out loud, if you want.**

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![Version](https://img.shields.io/badge/version-0.4.0-blue)
![Made for learners](https://img.shields.io/badge/made%20for-learners-brightgreen)

[Demo](#-demo) · [Quick start](#-quick-start) · [Modes](#-modes) · [Voice](#-voice) · [Example recap](examples/tip-calculator/RECAP.md) · [FAQ](#-faq)

</div>

---

## 🤔 Why

AI writes the code, but you're left wondering *what just happened?*
Pair Narrator makes Claude explain each step as it works: what it's doing, why, what it found, and what it'll do next. Turn on voice and you can just **listen**, like someone talking you through it while you look at the screen. When it's done, you get a document you can read later, with a diagram.

## 🎬 Demo

**Without Pair Narrator:**

```text
Updating the login handler.
```

**With `teach voice`** (real output from a test run, also read aloud):

```text
> /pair-narrator:narrate teach voice  Create hello.py that greets a person...

Teach mode is on, and I'll talk out loud.

First step: I'm going to write a tiny Python program called hello.py.
A program is just a list of instructions the computer follows from top
to bottom. This one needs two: ask for a name, then say hello using it.

...

One thing worth remembering: input always gives you text, even when
someone types a number. That matters as soon as you try to do math
with what the user types.
```

**With `/narrate later`** (real output from a test run, trimmed):

```text
> /narrate later Build a word counter script...

Got it, I'll work quietly and explain at the end.
Everything works. Now the notes and recap.

I built the word counter, and running it on the sample file prints
sample.txt: 16 words. I counted the sample by hand and got 16 too.

How it works (in plain words):
- It cuts the text wherever there's a gap and counts the pieces. It's like
  cutting a sentence with scissors at every gap and counting the strips.
```

📄 **See a full real result:** [step notes](examples/tip-calculator/log.md) → [recap with diagram](examples/tip-calculator/RECAP.md) → [the code it built](examples/tip-calculator/tip.py)

## ✨ Features

| | |
|---|---|
| 🗣️ **Explains as it works** | The what and the why before each step, and what it found after. |
| 🎚️ **Pick your level** | From no-jargon to full engineer detail. |
| 🤫 **Quiet when you want** | Say "just code" and it explains at the end instead. |
| 📝 **Step notes** | Keeps a short log of every step in `narrate-notes/log.md`. |
| 🔊 **Natural voice** | Hear Claude explain while you look at the screen, in a natural AI voice that runs on your own computer. Free, offline, no account or API key. |
| 🗺️ **Recap with diagram** | `narrate-notes/RECAP.md`: what was built, how it works, a Mermaid diagram, key ideas. |

## 🚀 Quick start

```
/plugin marketplace add Allouche-Adam/pair-narrator
/plugin install pair-narrator@pair-narrator
```

Then, in a new session:

```
/pair-narrator:narrate teach voice
```

That's teach mode, out loud. Drop `voice` if you'd rather read.

The first time you turn voice on, the natural voice downloads in the background (about 600 MB, once). Until it's ready you'll hear your computer's built-in voice, and it tells you when it switches.

Want to try it without installing? Clone the repo and run:

```bash
claude --plugin-dir ./pair-narrator
```

## 🎚️ Modes

Type these after `/pair-narrator:narrate` (shown short below). Options combine, like `teach voice`.

| Option | Best for | What you get |
|---|---|---|
| *(nothing)* or `vibe` | Building with AI, following along | Plain words, no jargon, short updates |
| `teach` | Really learning | Examples, simple definitions, step notes, a recap at the end |
| `engineer` | Understanding the code | Files, functions, trade-offs, risks |
| `later` | "Just build it" | Quiet while working, full explanation and recap after |
| `recap` | Anytime | Writes `narrate-notes/RECAP.md` now |
| `voice` | Listening instead of reading | Claude's messages read aloud |
| `voice off` | Back to reading | Stops talking, keeps the level |
| `stop` | Silence right now | Stops talking; voice stays on for the next reply |
| `voice heart` / `michael` / `emma`... | Picking a voice | Switches and remembers it |
| `louder` / `quieter` / `volume 40` | Comfort | Changes the volume and remembers it |
| `off` | Done learning | Back to normal, voice off |

You can also just talk: *"stop explaining"*, *"explain after"*, *"keep explaining"*, and *"mute"* to turn the voice off instantly. Sending any new message stops it reading the previous reply.

## 🔊 Voice

With `voice` on, the plugin reads Claude's messages aloud as it works: its explanation before each step, the final summary, and a heads-up when it needs your permission. Code blocks, tables, and links are skipped, and long file paths are shortened to the file name, so it sounds like talking rather than reading out code.

**The natural voice** is [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), a small open-source AI voice model that runs on your own computer: free, offline, nothing sent anywhere. It downloads automatically the first time you turn voice on (about 600 MB in `~/.pair-narrator`, needs [Node.js](https://nodejs.org) 18+ and npm). Until then, the plugin uses your computer's built-in voice (Windows speech, `say` on macOS, `espeak-ng` on Linux), and it also says so out loud if the natural voice ever fails and the built-in one takes over. English only.

**Voices:** Heart is the default. Switch with `voice <name>`; your choice is remembered.

| Name | Sounds like |
|---|---|
| `heart` (default), `bella`, `nicole`, `sarah`, `sky`, `nova` | American, female |
| `michael`, `adam`, `eric`, `liam`, `puck`, `onyx` | American, male |
| `emma`, `isabella`, `alice`, `lily` | British, female |
| `george`, `lewis`, `daniel`, `fable` | British, male |

**Volume:** starts at 50%. `louder` and `quieter` change it by 15, `volume 30` sets it exactly. `stop` silences it right away.

**Settings** are saved in `~/.pair-narrator/config.json`. Environment variables override them:

| Variable | What it does | Example |
|---|---|---|
| `PAIR_NARRATOR_VOICE` | Voice to use | `am_michael`, or a system voice like `Samantha` |
| `PAIR_NARRATOR_VOLUME` | Volume, 0 to 100 | `40` |
| `PAIR_NARRATOR_RATE` | Speed, from -10 (slow) to 10 (fast) | `2` |
| `PAIR_NARRATOR_ENGINE` | `auto`, or `system` to never use the natural voice | `system` |


## ❓ FAQ

**Does it slow Claude down?**
The explanations add a little reading time; use `later` when speed matters. The voice doesn't: it talks in the background, and each check takes a fraction of a second.

**The voice sounds robotic.**
That's your computer's built-in voice, used while the natural voice downloads. Check `~/.pair-narrator/setup.log` if it never switches.

**The first sentence takes a few seconds.**
The natural voice loads its model first. After that it stays loaded for two minutes after it stops talking, so replies start quickly.

**How do I remove the natural voice?**
Delete the `~/.pair-narrator` folder.

**It went back to short updates on a long task.**
That can happen on long sessions. Run the command again with your level.

**Should I commit `narrate-notes/`?**
Up to you. Add it to `.gitignore` if you don't want it in your repo.

**Where's the diagram?**
In `RECAP.md`, as Mermaid. GitHub shows it as a picture. In VS Code you may need a Mermaid preview extension.

---

<div align="center">

Made for people who want to understand what their AI is building. ⭐ Star it if it helped you learn something.

</div>
