# How to use this package with Claude Code

This is a documentation-first, autonomous build package. You don't write the code — Claude Code does, using the docs as its spec.

## Order of operations

### 1. Create the git repository

```bash
mkdir vecini-online
cd vecini-online
git init
```

Copy all the files from this package into the folder. Then:

```bash
git add .
git commit -m "docs: initial specification"
```

Push to GitHub:

```bash
git remote add origin git@github.com:<your-username>/vecini-online.git
git push -u origin main
```

### 2. Launch Claude Code

Open a terminal in the repo root and run:

```bash
claude
```

(Or whatever your Claude Code launch command is.)

### 3. Paste the master prompt

Open `CLAUDE_CODE_PROMPT.md`, copy its entire contents, paste into Claude Code.

### 4. Walk away

Claude Code will:
1. Read all the docs in `/docs`
2. Scaffold the project
3. Build features one at a time, committing after each
4. Run tests and fix anything broken
5. Iterate until everything works

This will take many hours. It is meant to run unattended. Check back periodically.

### 5. When it's done

Claude Code stops when:
- All 65 features show ✅ in `docs/FEATURES.md`
- All tests pass
- Lint and typecheck are clean
- Build succeeds
- Lighthouse scores meet the thresholds

At that point, you do these things, in this order:

1. Read `BOT_SETUP.md` and follow it to create your Telegram bot
2. Read `docs/DEPLOYMENT.md` and follow it to set up Supabase + Netlify
3. Deploy
4. Onboard your first asociație through the in-app wizard
5. Generate invite codes and distribute them

### 6. If Claude Code stops or fails

If at any point Claude Code stops or asks you a question instead of continuing:

- Tell it: "Continue with the autonomous loop as defined in CLAUDE_CODE_PROMPT.md. Make decisions and document them in DECISIONS.md."
- If a specific test or build is failing, tell it: "Fix this and continue. Do not pause."
- If it claims a feature is too complex, tell it: "Simplify the implementation but ship it. The admin can disable it if not useful."

## Customization

If you want to remove or add features, edit `docs/FEATURES.md` **before** launching Claude Code. Don't add features mid-build — finish the build, then add new ones as a separate task.

If you want to change the tech stack, edit `docs/ARCHITECTURE.md` **before** launching. Be careful: the dependencies are chosen to work together. Don't swap Supabase for Firebase without rewriting the data model doc too.

## Cost expectations

A complete build of this scope on Claude Code with Opus or Sonnet will consume a substantial amount of Claude usage. Plan for:
- Several hours of wall-clock time
- Many context refreshes
- A meaningful amount of API spend

If budget is tight, consider:
- Building only Category 1-3 features first (24 features, the most useful baseline)
- Reviewing and committing manually after each category so you can pause/resume cleanly

## After it's done

Treat the generated code as **yours**. Review it, learn it, improve it. The autonomous build gets you 90% of the way. The last 10% — polishing UX, fixing edge cases, integrating real customer feedback — is human work.
