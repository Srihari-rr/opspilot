# OpsPilot: submission pitch and judge Q&A

## 1. Problem statement (paste into the form)
Supply-chain disruptions hit 96% of organisations in 2025 (about $4M average loss, Xeneta). Teams need 8.7 hours to detect a disruption and over 40 hours to understand its impact (Sphera), then lose more time coordinating across ERP, CRM, email and approvals by hand. At the same time, 40%+ of agentic AI projects are expected to be cancelled by 2027 because of cost, unclear value and weak risk controls (Gartner), and 85% of companies lack the orchestration to connect AI agents with people and systems (Talkdesk). Businesses need an AI that does not just advise but safely acts.

## 2. Solution description (paste into the form)
OpsPilot is a crew of 7 cooperating AI agents (Planner, Analyst, Sourcing, Comms, Guardian, Executor, Reporter) plus a proactive Sentinel. The Sentinel scans threat feeds and scores each risk against the real order book. When a disruption is confirmed (by a user or the Sentinel), the Planner writes a plan, the Analyst simulates which orders will fail, Sourcing picks alternate suppliers on price / speed / reliability, Comms drafts customer emails, and the Guardian checks every action against policy. Safe actions run automatically; risky ones (large spend, low-reliability supplier, price premium, enterprise customer emails) wait for a human. The Executor then places purchase orders, updates orders, sends emails and opens escalation tickets. The Reporter measures impact.

**How AI is integrated:** Gemini (backend only, key in env vars) powers each agent's reasoning with structured JSON output; a deterministic rule engine is the fallback, so a model outage never breaks a run; the Copilot answers questions grounded on live business data; usage and cost per run are metered.

**Key features:** Sentinel proactive detection (including hidden Tier-3 risks) · supply-network risk map · 7-agent live reasoning timeline · Guardian policy engine · autonomy dial (cautious / balanced / autonomous) · human approval gate · Copilot chat with voice in and out · impact analytics (revenue protected, hours replaced, cost per incident, governance scorecard) · downloadable audit report.

## 3. Why it should win (judge's checklist)
| Judge criterion | Our answer |
|---|---|
| Real, specific pain point | Detect-to-decide gap and AI trust gap, each backed by a cited 2025-26 statistic |
| Truly agentic | Plans, uses tools, reasons across steps, agents collaborate, acts on systems, pauses for human approval |
| Minimal human intervention but safe | Guardian policy engine + autonomy dial; humans only approve risky actions |
| Measurable value | Revenue protected, hours replaced and AI cost per incident on every run; directly answers Gartner's "unclear value" failure reason |
| Governance and auditability | Every action has a risk level, reason and status; exportable audit report; governance scorecard |
| Robustness | Rule-engine fallback; tested with a simulated Gemini outage |
| Required stack | React + Vite + Router + Tailwind + Axios; Node + Express + JWT + bcrypt + Zod; SQLite; Gemini; Render |

## 4. Likely judge questions and answers
**Q: Is this just a chatbot?** No. A chatbot answers. OpsPilot acts: it placed purchase orders, updated orders, sent emails and opened tickets in the connected systems, with a visible plan and audit trail. The Copilot is only one small feature.

**Q: What if the AI makes a mistake?** The AI proposes, policy decides. The Guardian is deterministic code, not an LLM: spend over the limit, supplier reliability below 90%, price premium above 15%, and enterprise emails always need a human. The autonomy dial lets the owner tighten or loosen this.

**Q: What happens if Gemini is down or the key is missing?** Every agent has a rule-based fallback, so the run still completes. The badge shows whether you are on "Gemini AI live" or "Offline simulation".

**Q: Are the Sentinel's alerts real?** In this prototype they come from simulated feeds (weather, port, quality, supplier notices) so the demo is repeatable. The scoring uses the real order and supplier data. Plugging in real feeds (marine AIS, weather APIs, news) is a connector swap, not a redesign.

**Q: How does it make money / who is the customer?** Small and mid-size manufacturers and distributors (96% of SMBs were hit by disruptions) that cannot afford a 24/7 control tower. Subscription per connected system plus usage.

**Q: How do you prove ROI?** Each run reports revenue protected, manual hours replaced and the AI cost per incident. In our demo scenario one incident costs a few rupees of AI and replaces about 2.5 hours of manual work. The Insights page aggregates this.

**Q: How is it secure?** JWT auth, bcrypt-hashed passwords, Zod input validation, the Gemini key only in backend env vars, CORS locked to the frontend URL, and agents act only through a fixed set of tools.

**Q: How would it scale?** Move SQLite to Postgres, run agents as queued jobs, add connectors (ERP/CRM APIs). The agent and policy layers stay the same.

**Q: What is the single most original idea?** Proportional governance. Gartner says most agent governance is "all or nothing". Our Guardian plus autonomy dial gives graded, explainable control and a measurable audit trail.

## 5. Sources
- Xeneta 2026 Freight Report: https://www.xeneta.com/blog/who-pays-when-supply-chains-break-what-the-2026-freight-report-reveals
- Sphera (May 2026): https://natlawreview.com/press-releases/nearly-half-companies-lose-4-revenue-due-supply-chain-disruption
- Gartner agentic AI forecast (summary): https://lusivision.com/en/blog/agentic-ai-projects-canceled-2027-gartner
- Talkdesk State of Agentic Automation in CX (Aug 2026): https://www.talkdesk.com/news-and-press/press-releases/state-of-agentic-automation-cx-2026/
