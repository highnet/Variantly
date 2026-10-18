# Pinned comment and chapters

Paste the comment below under the video and pin it. The chapter times are the script's estimates; after the take, replace them with the ones `npm run edit` writes to `out/youtube-description-<theme>.txt` (it lists the real chapter times and the commands shown). YouTube needs the first chapter at 0:00 and at least three chapters, each 10 s or longer.

## The comment

Everything I ran in the video, in order:

```
node -v                                   # Node 20.11 or newer
npx variantly                             # opens the wizard in your browser
npx variantly doctor                      # checks git, your agent, Impeccable and your stack
npx variantly --agents claude:5,gemini:5 --blind   # mix agents; hide who made what until you keep one
npx variantly clean                       # removes every variantly worktree, branch and state
git log --oneline -1                      # keeping commits nothing: your last commit is still yours
git diff --stat                           # the kept design, as an ordinary uncommitted change
git branch --list "variantly/*"           # the other variants, until you clean up
```

Not a developer? On variantly.style, open *Never used a terminal? Start here* and copy the walk-me-through prompt into any AI chat.

Free and open source (MIT). Each variant is one session on your own AI plan, plus one for its review. Docs: https://variantly.style

Chapters
0:00 Intro
0:09 Why
1:15 What you need
1:41 Will it work on yours?
2:32 Setup
3:17 What to make
3:40 Your own directions
4:07 Review and go
4:38 The run
5:51 Compare
7:52 Keep
8:54 Wrap

## Short clips to cut

1. **Honest time** (about 10 s, from this take): `lapse` from 5:19, the board at real speed under the real clock, then the speed-up and "the whole run took N minutes". Works in 16:9 and 9:16.
2. **The `--blind` reveal** (about 15 s, needs extra footage): a mixed run started with `npx variantly --agents claude:5,gemini:5 --blind`, the compare panes without agent names, then Keep and the names revealed. The main take is Claude Code only, so it only says `--blind` over the mix card.
3. **Agent mix comparison** (about 20 s, needs extra footage): the same brief from Claude Code and Gemini CLI side by side (S), each pane labelled with who made it. Film with `"mix": "claude:5,gemini:5"` in `script.json`.
