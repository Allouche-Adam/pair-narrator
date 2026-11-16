# Pair Narrator

Makes Claude Code talk you through what it's building and why, like a teammate sitting next to you, not a status log.

## Install

In Claude Code:

```
/plugin marketplace add YOUR-GITHUB-NAME/pair-narrator
/plugin install pair-narrator@pair-narrator
```

## Use

| Command | What happens |
|---|---|
| `/narrate` or `/narrate vibe` | Plain words, no jargon. Great if you build with AI and just want to follow along. |
| `/narrate teach` | More explaining, with examples, without baby talk. Keeps step notes in `narrate-notes/log.md` and writes a recap at the end. |
| `/narrate later` | Works quietly, keeps notes, then explains everything at the end with a recap. Saying "just code" or "explain after" does the same. |
| `/narrate recap` | Writes `narrate-notes/RECAP.md`: what was built, how it works, step by step, a diagram, and key ideas. Works at any level. |
| `/narrate engineer` | Real technical terms, files, trade-offs, and risks. Great if you want to learn the code. |
| `/narrate off` | Back to Claude's normal short updates. |

It lasts for the rest of the session. If Claude drifts back to short updates on a long task, run the command again.
