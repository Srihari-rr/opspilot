# OpsPilot - Deployment guide (follow in order)

Free accounts needed: **GitHub**, **Render**, **Google AI Studio** (and optionally **Vercel**).
OpsPilot uses SQLite, so there is **no database to set up**.

---
## Step 1 - Get the Gemini key (2 min)
https://aistudio.google.com/app/apikey -> Create API key -> copy it (starts with `AIza`). Keep it in Notepad.

## Step 2 - Run it on your laptop first (5 min, optional but recommended)
Needs Node.js 18+ (https://nodejs.org).
```
npm run setup
cp backend/.env.example backend/.env      # Windows: copy backend\.env.example backend\.env
# open backend/.env and paste your key after GEMINI_API_KEY=
npm run build
npm start
```
Open http://localhost:5000 -> "Try the live demo account" -> run a scenario.
(For live-editing mode use two terminals: `npm run dev:backend` and `npm run dev:frontend`, then open http://localhost:5173.)

## Step 3 - Push to GitHub (5 min)
Create an empty **public** repo on github.com (name it `opspilot`, do not add a README). Then, inside the project folder:
```
git remote add origin https://github.com/<your-username>/opspilot.git
git branch -M main
git push -u origin main
```
If Git asks who you are: `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.

---
## OPTION A (easiest): everything on ONE Render service - one link
Render -> New + -> Web Service -> pick your repo, then fill in:

| Setting | Value |
|---|---|
| Root Directory | *(leave empty)* |
| Runtime | Node |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Instance type | Free |

Environment variables (Add Environment Variable):

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | your Gemini key |
| `JWT_SECRET` | any long random text |
| `NODE_VERSION` | `20` |

Click **Create Web Service**, wait for **Live** (3-5 min). Your link is `https://<name>.onrender.com` - that is your **Deployed Application Link**.
Test: open `<link>/api/health` -> `{"ok":true,"ai":"gemini",...}`.

## OPTION B (organizer's layout): backend on Render + frontend on Vercel
**Backend (Render)** - same as above but: Root Directory `backend`, Build `npm install`, Start `npm start`.
Env vars: `GEMINI_API_KEY`, `JWT_SECRET`, `NODE_VERSION=20`, `FRONTEND_URL` = your Vercel URL (set after the next step, no trailing slash).

**Frontend (Vercel)** - Add New -> Project -> import repo:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Env var `VITE_API_BASE_URL` | your Render backend URL (no trailing slash) |

Then go back to Render and set `FRONTEND_URL` to the Vercel URL (it redeploys).

---
## Final test checklist
- [ ] Link opens the login page
- [ ] "Try the live demo account" logs in
- [ ] Port-strike scenario runs, approval box appears, "Approve all" works
- [ ] Business Systems page shows purchase orders, emails and a ticket
- [ ] Top-right badge says **Gemini AI live** (if it says "Offline simulation", the key is missing on Render)

## Before the judges / before recording the video
1. Open `<your link>/api/health` 2-3 minutes early (Render free tier sleeps and needs ~50 s to wake).
2. Business Systems -> **Reset demo data**.

## Troubleshooting
- **Build fails on better-sqlite3**: set `NODE_VERSION` to `20` and redeploy.
- **Login fails in Option B**: `VITE_API_BASE_URL` or `FRONTEND_URL` is wrong. Redeploy the frontend after changing env vars.
- **Badge says Offline simulation**: add `GEMINI_API_KEY` in Render -> Environment.
- **Data disappears after a while**: free-tier disk is temporary. Demo account and demo data are re-created automatically.
