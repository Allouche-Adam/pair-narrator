# Decisions

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
