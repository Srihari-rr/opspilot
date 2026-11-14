# OpsPilot: final submission sheet (everything in one place)

Fill the three `<...>` links, then paste each part into the form.

## 1. Problem statement (brief)
See `PITCH.md` section 1 (paste as is).

## 2. Solution description (how AI is integrated, key features)
See `PITCH.md` section 2 (paste as is). One-line version:
OpsPilot is a crew of 7 AI agents (Planner, Analyst, Sourcing, Comms, Guardian, Executor, Reporter) plus a proactive Sentinel. Gemini does the reasoning and writing; a deterministic Guardian policy engine and a human approval gate control risky actions; every step is visible and audited.

## 3. GitHub repo (public, full frontend + backend + README)
`<your-repo-link>`  (steps: DEPLOYMENT.md, "Put the code on GitHub")

## 4. Deployed link (public)
`<your-render-link>`  (check `<link>/api/health` shows `"ai":"gemini"`; open it 2-3 minutes before judging because the free server sleeps)

## 5. Demo video (3-5 minutes)
`<your-video-link>`  (script: DEMO_SCRIPT.md, aim for 4 minutes)

## Rules checklist (all met except the three links above)
- [x] Frontend: React + Vite + React Router + Tailwind + Axios
- [x] Backend: Node.js + Express + JWT + bcrypt + Zod
- [x] Database: SQLite
- [x] AI: Gemini, key only in backend env var, never in the frontend or the repo
- [x] README with setup and run steps
- [x] Extras: Android APK (`OpsPilot.apk`), installable PWA, pitch deck (`docs/OpsPilot_Pitch_Deck.pptx`)
- [ ] Public GitHub repo, deployed link, demo video (you)
