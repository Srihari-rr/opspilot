# OpsPilot explained in very simple words

## What is it?
Imagine a shop owner. One morning the supplier calls: "Your goods will be 9 days late." Normally the owner panics: checks which customers will be hurt, finds another supplier, writes emails, asks the boss for approval. That takes many hours.

**OpsPilot does all of that by itself in about 25 seconds.** It is a team of 7 AI helpers (we call them agents). A human only says "yes" or "no" to the risky decisions.

## The 7 helpers (agents)
| Helper | Simple job |
|---|---|
| Planner | Reads the problem and makes a to-do list |
| Analyst | Checks which customer orders will be late |
| Sourcing | Finds a backup supplier (price, speed, trust) |
| Comms | Writes polite emails to customers |
| Guardian | The safety guard. Safe things go ahead. Risky things wait for a human |
| Executor | Does the work: orders goods, updates orders, sends emails |
| Reporter | Tells the owner how much money and time was saved |
Extra helper: **Sentinel** keeps watching the world (weather, ports, suppliers) and warns you before you even notice.

## The screens
- **Command Center (home):** the problem statistics, the Sentinel warnings, the network map, and the buttons to start a scenario.
- **Run page:** you watch the helpers think and work, step by step. When risky things appear, you click Approve or Reject.
- **Insights:** charts showing money and time saved, and how the Guardian behaved.
- **Business Systems:** the shop's data (orders, stock, purchase orders, emails sent, tickets).
- **Run History:** all past runs.
- **Ask the Crew (bottom right):** chat with your data, by typing or speaking.

## The words judges may use
- **Agentic AI:** AI that does not only talk. It plans, decides and acts.
- **Human in the loop:** a person approves the risky steps.
- **Guardian / policy:** fixed rules. Example: spending above ₹50,000 needs a human.
- **Autonomy dial:** you choose how much the AI may do alone (Cautious, Balanced, Autonomous).
- **Fallback:** if the AI (Gemini) is down, simple rules take over, so the app never breaks.
- **Audit trail:** a record of every action and who approved it.

## What is inside the folder (for you to know)
- `frontend/` is what people see (React). `backend/` is the brain and database (Node.js + Express + SQLite).
- `README.md` explains how to run it. `DEPLOYMENT.md` explains how to put it online. `DEMO_SCRIPT.md` is what to say in the video. `PITCH.md` has the form text and judge answers. `docs/OpsPilot_Pitch_Deck.pptx` is the slide deck.
- The Gemini key goes ONLY in `backend/.env`. Never share it and never upload that file.

## One-line answers if a judge asks you something
- *What did you build?* "A crew of AI agents that solves supplier disruptions on its own, safely."
- *Why is it special?* "It acts, it is safe, and it proves the money it saves."
- *Is the AI trusted blindly?* "No. A rule-based Guardian checks every action and humans approve the risky ones."
