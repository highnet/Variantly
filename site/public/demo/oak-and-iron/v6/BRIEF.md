<!-- variantly {"variant":6,"count":6,"approach":"redesign","direction":"quiet","appRel":"","stack":"static"} -->
# variantly brief: variant 6 of 6

You are one of 6 agents each producing a different design for the same
site, in parallel, in separate git worktrees. A person will flick between all
6 in a browser and keep one. The current working directory is your own
isolated copy; edit anything in it.

## Task

Use the **Impeccable** skill for all of the design work (`/impeccable`; load
the skill before you start). Redesign the site's main pages, starting with the home page. This is a redesign, not a polish: follow Impeccable's new-work flow, treat the current look as evidence of what to replace, and commit to one replacement visual world. Your direction is **Quiet minimal**: distilled to essentials: few elements, lots of air, one accent, restrained motion. Push it far enough that someone flicking between the 6 variants can name yours at a glance.


## The project

- Stack: Static HTML. The app lives at the root of this repository.
- Where the look lives: *.html, *.css.
- There is no PRODUCT.md. Do not run `/impeccable init` and do not ask questions; infer the product from the code and content.
- There is no DESIGN.md.

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

## When you are done

End your final message with one line that starts with `SUMMARY:` and says, in
under 30 words, what your variant is (the world, the type, the colour), so the
person choosing can tell it apart.
