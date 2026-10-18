<!-- variantly {"variant":15,"count":20,"approach":"redesign","direction":"Editorial magazine: a weekend-supplement feature spread: big serif headlines, pull quotes, drop caps, generous whitespace, one ink colour","appRel":"","stack":"static"} -->
# variantly brief: variant 15 of 20

You are one of 20 agents each producing a different design for the same
site, in parallel, in separate git worktrees. A person will flick between all
20 in a browser and keep one. The current working directory is your own
isolated copy; edit anything in it.

## Task

Use the **Impeccable** skill for all of the design work
(`/impeccable`; load the skill before you start). Redesign the home page (`/`) only. Follow Impeccable's new-work flow and commit to one replacement visual world in the direction the owner pinned for this variant: **Editorial magazine: a weekend-supplement feature spread: big serif headlines, pull quotes, drop caps, generous whitespace, one ink colour**.

Shared layout, header, footer and global styles may change so these pages
work; leave the content of other pages alone.


## The project

- Stack: Static HTML. The app lives at the root of this repository.
- Where the look lives: *.html, *.css.
- PRODUCT.md exists: it is the product truth. Honour it and do not rewrite it.
- There is no DESIGN.md yet.
- When you are done, write DESIGN.md for the world you built, as Impeccable's finish step does.

## Rules

1. This run is **non-interactive**. Never ask a question or wait for an answer;
   make the call a senior designer would and note it in your summary.
2. Change presentation, not behaviour. Keep every route, every piece of copy
   and data, every form field and handler. Markup structure, styles, tokens,
   fonts, images and motion are yours to change.
3. **Do not install packages or touch lockfiles.** Installed dependencies are
   shared with other variants. Load fonts with CSS (`@import`, `@font-face`)
   or the framework's built-in font loader; use what is already installed.
4. **Do not start, stop or restart any server.** variantly runs one dev server
   per variant and is already previewing yours; it reloads on its own.
5. **Do not commit, branch or push.** variantly commits your work for you.
6. Stay inside this working directory.
7. Verify by reading your code, not by screenshots: there is no browser for
   you here. Run the project's type check or linter if it is quick.

## As soon as you have chosen the world

Print one line that starts with `DIRECTION:` and names it in two to four words
(for example `DIRECTION: Night-shift field manual`). The person watching the
board sees it right away.

## When you are done

End your final message with one line that starts with `SUMMARY:` and says, in
under 30 words, what your variant is (the world, the type, the colour), so the
person choosing can tell it apart.
