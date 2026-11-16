# Changelog

## Unreleased
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
