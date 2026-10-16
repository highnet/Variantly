# Tallyboard (example)

A fictional SaaS for team timesheets whose landing page is a cluttered,
try-hard 2016–2022 template mashup: a fake countdown banner and a
marquee-style announcement bar, a nav with thirteen items, Lobster, Pacifico,
Comic Neue, Poppins and Bebas Neue all at once, clashing neon gradients,
rainbow buttons, drop shadows on everything, mismatched border radii,
grey-on-grey text, a tilted dashboard made of divs, an "As featured in" row,
a cookie banner, a newsletter pop-up and a chat bubble crowding the hero.
Every company, person and number on it is invented.

It is the "before" in variantly's product demo video (`demo/`).

Try it without an agent:

```sh
cp -r examples/tallyboard /tmp/tallyboard && cd /tmp/tallyboard
git init -q && git add -A && git commit -qm "before"
npx variantly --demo
```
