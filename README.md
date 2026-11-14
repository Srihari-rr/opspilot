# OpsPilot - an autonomous AI crew for supply-chain disruptions

> Theme: **Agentic AI & Intelligent Systems**

## The problem (with real 2025 / 2026 data)
When a supplier is delayed, a recall happens or a factory goes down, operations teams scramble: spreadsheets, supplier calls, copy-pasted
customer emails, approvals over chat. It is slow, inconsistent and expensive.

* **96%** of organisations suffered moderate or significant supply-chain disruption in 2025, with an average loss of about **$4 million** ([Xeneta 2026 Freight Report](https://www.xeneta.com/blog/who-pays-when-supply-chains-break-what-the-2026-freight-report-reveals)).
* Companies take on average **8.7 hours to detect** a disruption and **40+ hours to understand its impact**; only **12%** can see beyond Tier-2 suppliers ([Sphera, May 2026](https://natlawreview.com/press-releases/nearly-half-companies-lose-4-revenue-due-supply-chain-disruption)).
* Agentic AI is not yet delivering: **40%+ of agentic AI projects will be cancelled by 2027** because of cost, unclear value and weak risk controls ([Gartner](https://lusivision.com/en/blog/agentic-ai-projects-canceled-2027-gartner)); **85%** of companies lack the orchestration to connect AI agents, people and systems, and staff lose **28%** of their time switching tools ([Talkdesk, Aug 2026](https://www.talkdesk.com/news-and-press/press-releases/state-of-agentic-automation-cx-2026/)).

**The pain point we target:** the *detect-to-decide gap* in supplier disruptions, and the *trust gap* that stops companies from letting AI act.

## The solution
OpsPilot is a crew of **7 autonomous AI agents** that turn one sentence ("Port strike delays Apex Components by 9 days") into a finished
resolution, with a human approving only the risky steps.

| Agent | Job |
|---|---|
| Planner | Understands the incident, picks the affected supplier, writes a plan |
| Analyst | Reads orders and inventory, simulates the disruption, finds which orders will be late |
| Sourcing | Compares alternate suppliers (price / speed / reliability) and decides what to buy |
| Comms | Writes personalised, honest customer emails |
| Guardian | Deterministic **policy engine**: auto-approves safe actions, escalates risky ones to a human |
| Executor | Places purchase orders, updates orders, sends emails, opens escalation tickets |
| Reporter | Summarises business impact (orders saved, revenue protected, hours saved) |

**Why it is "agentic"**: it plans, uses tools (inventory, orders, supplier catalogue), reasons across steps, collaborates between agents,
acts on real systems, and pauses for human approval (human-in-the-loop) - with minimal human intervention.

**Safety by design**: the AI proposes, but policy rules (spend limit, supplier reliability, price premium, enterprise customer comms) decide
what needs a human. If the AI is unavailable the crew falls back to a rule engine, so it never breaks.

### Advanced features
| Feature | What it does |
|---|---|
| **Sentinel agent** (proactive) | Scans simulated weather / port / quality / supplier feeds 24/7, scores each threat against the real order book (AI confidence, orders and rupees at risk) and lets you hand any threat to the crew in one click. The crew does not wait to be told. |
| **Live supply-network map** | SVG graph of suppliers -> factory -> customers. Node colour = AI risk score; pulsing rings = active signals; flows show where purchase orders were placed. |
| **Autonomy dial** | Cautious / Balanced / Autonomous. Changes the Guardian's auto-approval limit (Rs 0 / 50,000 / 1,00,000). Shows human-in-the-loop is a *policy*, not a hack. |
| **Copilot ("Ask the Crew")** | Chat with your live business data: risks, suppliers, stock, customers, any order id. Uses Gemini when the key is set (grounded on a compact JSON context), otherwise a rule engine. |
| **Voice in / voice out** | Speak an incident or a Copilot question (Web Speech API); have answers and the final run briefing read aloud. |
| **Impact analytics** | Revenue protected, orders saved, hours replaced, speed-up vs manual, per-run charts, supplier risk board. |
| **Audit report export** | One click downloads an incident report (plan, every action, status, Guardian reason, next steps). Print to PDF. |
| **Installable app (PWA)** | The website installs like a phone/desktop app (Android/Chrome/Edge: "Install app" button; iPhone: Share -> Add to Home Screen). Works from the same deployed link, so one deploy gives you the website AND the app. |
| **Resilient AI** | Every agent has a rule-based fallback, so a Gemini outage never breaks a run. |

## Tech stack
- **Frontend**: React + Vite, React Router, Tailwind CSS, Axios, Lucide icons
- **Backend**: Node.js, Express, JWT auth, bcrypt (bcryptjs), Zod validation, Server-Sent Events for live agent streaming
- **Database**: SQLite (better-sqlite3)
- **AI**: Google Gemini API (key stays in backend env variables only)

## Run locally
```bash
npm run setup                               # installs backend + frontend
cp backend/.env.example backend/.env        # then paste your key:  GEMINI_API_KEY=your_key
npm run build && npm start                  # open http://localhost:5000
```
Dev mode (two terminals): `npm run dev:backend` and `npm run dev:frontend` -> http://localhost:5173.
Demo login: `demo@opspilot.ai` / `demo1234` (or create your own account).
Without a Gemini key the app still works in "offline simulation" mode (rule-based agents). If Gemini is down mid-run, each agent falls back to its rule engine automatically.

## Deploy
See **DEPLOYMENT.md**. Easiest: one Render web service (build `npm run build`, start `npm start`) serves both API and UI.
Or backend on Render + frontend on Vercel.

## API overview
`POST /api/auth/register|login` · `GET /api/systems` · `POST /api/runs` (optional `autonomy`) · `GET /api/signals` · `GET /api/insights` · `POST /api/ask` · `GET /api/runs/:id/stream` (SSE) · `POST /api/runs/:id/decision` · `POST /api/reset`

## Android app (APK)

`OpsPilot.apk` is a prebuilt Android app (Capacitor wrapper around the offline demo build, no server needed). Install: copy it to your phone, open it, allow "install unknown apps".
