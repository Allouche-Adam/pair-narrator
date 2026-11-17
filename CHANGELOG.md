# Changelog

## 0.4.1 (2026-11-17)
- Fixed: in interactive sessions the narrate command reaches the hook wrapped in <command-name>/<command-args> tags, so `voice` never turned on. Both forms are recognised now.
- Fixed: on newer models (Opus 5.5) the updates between steps are stored as thinking-block summaries, so only the final message was spoken. Those summaries are read aloud now; empty (hidden) reasoning is still skipped.

## 0.4.0 (2026-11-16)
- **Natural voice by default:** turning voice on the first time downloads Kokoro, a local open-source AI voice (about 580 MB, once, into `~/.pair-narrator`). Default voice Heart; `voice <name>` picks one of 28 and remembers it. Sentences are generated while the previous one plays, and the model stays loaded for two minutes.
- **Volume:** default 50%; `louder`, `quieter`, `volume N`, saved in `~/.pair-narrator/config.json`.
- **Voice:** new `voice` option reads Claude's messages aloud; the system's own text-to-speech (Windows, macOS, Linux) is the fallback. A queue means voices never overlap. Says when Claude needs permission. "stop talking" mutes instantly.
- **English only:** language detection removed to keep things simple.
- **Stop:** `stop` silences the voice right away. Any new message stops reading the previous reply and skips text left over from an interrupted turn.
- **Loud fallback:** if the natural voice fails, the backup voice says so once. `voice <unknown name>` now says it doesn't know that voice.
- **Fixed:** teach mode announced topics ("covering X, Y and Z") instead of explaining them. Added an "explain, don't announce" rule with a bad/good example.
- Options now combine (`teach voice`). Skill reorganised; at most one comparison per update in vibe level.
- README: real teach+voice demo, Voice section, correct `/pair-narrator:narrate` command name.
- Fixed: `->` was read aloud as "to"; it now says ", then".
- Fixed: the speaker crashed before saying anything (`STOPWORDS` used before it was defined, because the script started at the top of the file). Dry-run tests missed it because they skipped that code; they now run it.
- Errors are now logged to `pair-narrator/errors.log` in the temp folder instead of disappearing.
- README redesigned: badges, demo, features table, modes table, FAQ.
- Added `examples/tip-calculator/` with real output from a teach-mode test run (code, step notes, recap).

## 0.3.0 (2026-11-16)
- New `later` mode: quiet while working, notes kept, full explanation and recap at the end.
- Plain-language switching: "stop explaining", "just code", "keep explaining" work without the command.
- Made explicit that narrating while working is the default.
- Tested 0.2.0 teach + recap in a headless session: notes and recap generated correctly.

## 0.2.0 (2026-11-16)
- New `teach` level: more explaining, examples, and simple definitions.
- Teach level keeps step notes in `narrate-notes/log.md`.
- New `/narrate recap`: writes `narrate-notes/RECAP.md` with a Mermaid diagram.
- Added a marketplace description (fixes a validation warning).

## 0.1.0 (2026-11-16)
- First version: `/narrate` skill with `vibe`, `engineer`, and `off` levels.
- Plugin manifest and marketplace file so it installs from a GitHub repo.
