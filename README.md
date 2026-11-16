<div align="center">

# 🎙️ Pair Narrator

**Claude Code that talks you through what it's building, and why.**

Like a teammate sitting next to you, not a status log.

![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)
![Version](https://img.shields.io/badge/version-0.3.0-blue)
![Made for learners](https://img.shields.io/badge/made%20for-learners-brightgreen)

[Demo](#-demo) · [Quick start](#-quick-start) · [Modes](#-modes) · [Example recap](examples/tip-calculator/RECAP.md) · [FAQ](#-faq)

</div>

---

## 🤔 Why

AI writes the code, but you're left wondering *what just happened?*
Pair Narrator makes Claude explain each step as it works: what it's doing, why, what it found, and what it'll do next. When it's done, you get a document you can read later, with a diagram.

## 🎬 Demo

**Without Pair Narrator:**

```text
Updating the login handler.
```

**With `/narrate teach`** (illustration):

```text
The login fails because the password check runs before we load the user,
so it compares against nothing. I'm going to swap the order.

Example: if someone types the right password, today they still get
"wrong password", because there's no user loaded yet to compare it to.

In short: load first, then check.
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
| 🗺️ **Recap with diagram** | `narrate-notes/RECAP.md`: what was built, how it works, a Mermaid diagram, key ideas. |

## 🚀 Quick start

```
/plugin marketplace add Allouche-Adam/pair-narrator
/plugin install pair-narrator@pair-narrator
```

Then, in any session:

```
/narrate teach
```

Want to try it without installing? Clone the repo and run:

```bash
claude --plugin-dir ./pair-narrator
```

## 🎚️ Modes

| Command | Best for | What you get |
|---|---|---|
| `/narrate` or `/narrate vibe` | Building with AI, following along | Plain words, no jargon, short updates |
| `/narrate teach` | Really learning | Examples, simple definitions, step notes, a recap at the end |
| `/narrate engineer` | Understanding the code | Files, functions, trade-offs, risks |
| `/narrate later` | "Just build it" | Quiet while working, full explanation and recap after |
| `/narrate recap` | Anytime | Writes `narrate-notes/RECAP.md` now |
| `/narrate off` | Done learning | Back to normal |

You can also just talk: *"stop explaining"*, *"explain after"*, *"keep explaining"*.

## ❓ FAQ

**Does it slow Claude down?**
A little, because there's more to read. Use `later` when speed matters.

**It went back to short updates on a long task.**
That can happen on long sessions. Run `/narrate <level>` again.

**Should I commit `narrate-notes/`?**
Up to you. Add it to `.gitignore` if you don't want it in your repo.

**Where's the diagram?**
In `RECAP.md`, as Mermaid. GitHub shows it as a picture. In VS Code you may need a Mermaid preview extension.

---

<div align="center">

Made for people who want to understand what their AI is building. ⭐ Star it if it helped you learn something.

</div>
