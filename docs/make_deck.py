from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

INK=RGBColor(0x2b,0x28,0x24); BG=RGBColor(0xe9,0xe5,0xdf); PAPER=RGBColor(0xf3,0xf0,0xeb); SAND=RGBColor(0xd9,0xd3,0xc7)
BAR=RGBColor(0x4a,0x48,0x44); MUTED=RGBColor(0x6b,0x64,0x5a); GOLD=RGBColor(0x8a,0x7a,0x62); RED=RGBColor(0xa8,0x45,0x3f)
SERIF='Georgia'; SANS='Calibri'
prs=Presentation(); prs.slide_width=Inches(13.333); prs.slide_height=Inches(7.5)
blank=prs.slide_layouts[6]

def rect(s,x,y,w,h,fill,line=None):
    r=s.shapes.add_shape(MSO_SHAPE.RECTANGLE,Inches(x),Inches(y),Inches(w),Inches(h))
    r.fill.solid(); r.fill.fore_color.rgb=fill
    if line: r.line.color.rgb=line; r.line.width=Pt(1)
    else: r.line.fill.background()
    r.shadow.inherit=False; return r
def text(s,x,y,w,h,t,size=18,font=SANS,color=INK,bold=False,italic=False,align=PP_ALIGN.LEFT,anchor=MSO_ANCHOR.TOP):
    tb=s.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h)); tf=tb.text_frame; tf.word_wrap=True; tf.vertical_anchor=anchor
    tf.margin_left=tf.margin_right=Inches(0.05); tf.margin_top=tf.margin_bottom=Inches(0.03)
    lines=t if isinstance(t,list) else [t]
    for i,l in enumerate(lines):
        p=tf.paragraphs[0] if i==0 else tf.add_paragraph(); p.alignment=align; p.space_after=Pt(6)
        r=p.add_run(); r.text=l; f=r.font; f.size=Pt(size); f.name=font; f.color.rgb=color; f.bold=bold; f.italic=italic
    return tb
def slide(title,kicker=None,dark=False):
    s=prs.slides.add_slide(blank); rect(s,0,0,13.333,7.5,BAR if dark else BG)
    rect(s,0,0,13.333,0.42,BAR if not dark else INK)
    text(s,0.6,0.07,8,0.3,'OPSPILOT  ·  AGENTIC AI & INTELLIGENT SYSTEMS',10,SANS,PAPER)
    if kicker: text(s,0.7,0.8,10,0.35,kicker.upper(),12,SANS,SAND if dark else GOLD,True)
    text(s,0.7,1.1,12,1.0,title,34,SERIF,PAPER if dark else INK)
    return s
def card(s,x,y,w,h,big,small,src=None,dark=False):
    rect(s,x,y,w,h,PAPER,RGBColor(0xbb,0xb5,0xa8))
    text(s,x+0.2,y+0.15,w-0.4,0.9,big,34,SERIF,INK)
    text(s,x+0.2,y+1.05,w-0.4,h-1.5,small,13,SANS,MUTED)
    if src: text(s,x+0.2,y+h-0.45,w-0.4,0.35,src,9,SANS,GOLD,True)

# 1 title
s=prs.slides.add_slide(blank); rect(s,0,0,13.333,7.5,BG); rect(s,0,0,13.333,0.42,BAR); rect(s,7.9,0.42,5.433,7.08,SAND)
text(s,0.6,0.07,8,0.3,'HACKATHON SUBMISSION  ·  THEME: AGENTIC AI & INTELLIGENT SYSTEMS',10,SANS,PAPER)
text(s,0.8,2.0,7,1.3,'OPS',72,SERIF,INK); text(s,0.8,3.1,7,1.3,'pilot',72,SERIF,GOLD,italic=True)
text(s,0.8,4.6,6.8,1.2,'An autonomous crew of AI agents that resolves supply-chain disruptions in seconds, with a human approving only the risky moves.',20,SERIF,MUTED,italic=True)
text(s,8.4,2.2,4.5,3,['7 AI agents','+ a proactive Sentinel','~25 seconds','instead of 48.7 hours'],26,SERIF,INK)
# 2 problem
s=slide('The problem is real, and growing','Why this matters · 2025 / 2026 data')
card(s,0.7,2.4,2.85,3.9,'96%','of organisations suffered supply-chain disruption in 2025. Average loss: about $4 million.','XENETA 2026 FREIGHT REPORT')
card(s,3.75,2.4,2.85,3.9,'48.7 h','to detect a disruption (8.7 h) and understand its impact (40+ h). Only 12% see beyond Tier-2 suppliers.','SPHERA, MAY 2026')
card(s,6.8,2.4,2.85,3.9,'40%+','of agentic AI projects will be cancelled by 2027: cost, unclear value, weak risk controls.','GARTNER FORECAST')
card(s,9.85,2.4,2.85,3.9,'85%','lack the orchestration to connect AI agents, people and systems. Staff lose 28% of time switching tools.','TALKDESK, AUG 2026')
text(s,0.7,6.55,12,0.5,'Pain point: the detect-to-decide gap, and the trust gap that stops companies letting AI act.',16,SERIF,MUTED,italic=True)
# 3 solution
s=slide('One sentence in. A finished resolution out.','Our solution')
steps=[('1','Detect','Sentinel spots the threat, or a user types one sentence'),('2','Plan & analyse','Planner + Analyst find which orders will break'),('3','Decide','Sourcing picks suppliers, Comms drafts emails'),('4','Approve','Guardian checks policy; humans approve only risky actions'),('5','Act','Executor places orders, emails customers, opens tickets'),('6','Prove','Reporter measures revenue protected and hours saved')]
for i,(n,t,d) in enumerate(steps):
    x=0.7+(i%3)*4.1; y=2.5+(i//3)*2.2
    rect(s,x,y,3.8,1.95,PAPER,RGBColor(0xbb,0xb5,0xa8)); text(s,x+0.2,y+0.1,0.8,0.7,n,32,SERIF,GOLD)
    text(s,x+0.9,y+0.18,2.8,0.5,t,20,SERIF,INK); text(s,x+0.2,y+0.95,3.4,0.95,d,13,SANS,MUTED)
# 4 crew
s=slide('Meet the crew','7 specialised agents that hand work to each other')
crew=[('Planner','Understands the incident and writes the plan'),('Analyst','Simulates which orders will be late'),('Sourcing','Compares backup suppliers: price, speed, reliability'),('Comms','Writes honest, personal customer emails'),('Guardian','Policy engine: auto-approves safe, escalates risky'),('Executor','Places POs, updates orders, sends emails, opens tickets'),('Reporter','Measures and explains the business impact')]
for i,(n,d) in enumerate(crew):
    x=0.7+(i%4)*3.05; y=2.4+(i//4)*2.3
    rect(s,x,y,2.85,2.05,PAPER,RGBColor(0xbb,0xb5,0xa8)); text(s,x+0.15,y+0.15,2.6,0.5,n,22,SERIF,INK); text(s,x+0.15,y+0.8,2.6,1.2,d,13,SANS,MUTED)
rect(s,0.7+3*3.05,2.4+2.3,2.85,2.05,BAR); text(s,0.7+3*3.05+0.15,2.4+2.3+0.15,2.6,1.8,['+ Sentinel','Scans threats 24/7 and hands the worst to the crew'],14,SERIF,PAPER)
# 5 safe
s=slide('Safe by design: proportional control','Governance that avoids "all or nothing"',dark=True)
pol=[('₹50,000','Spend above this needs a human'),('90%','Supplier reliability below this needs a human'),('15%','Price premium above this needs a human'),('Always','Enterprise customer emails get reviewed')]
for i,(b,d) in enumerate(pol):
    x=0.7+i*3.05; rect(s,x,2.5,2.85,2.0,INK); text(s,x+0.2,2.65,2.5,0.8,b,32,SERIF,PAPER); text(s,x+0.2,3.5,2.5,1.0,d,13,SANS,SAND)
text(s,0.7,4.9,12,0.5,'Autonomy dial: Cautious (every PO needs approval)  ·  Balanced (up to ₹50,000)  ·  Autonomous (up to ₹1,00,000)',17,SERIF,PAPER)
text(s,0.7,5.6,12,1.3,['The Guardian is deterministic code, not an LLM: the AI proposes, policy decides.','Every action is logged with risk, reason and status. A full audit report can be downloaded.'],15,SANS,SAND)
# 6 features
s=slide('Advanced features','Beyond a chatbot')
feats=[('Sentinel agent','Proactive detection, AI confidence, rupees at risk, hidden Tier-3 alerts'),('Supply-network map','Live graph of suppliers, factory and customers with AI risk scores'),('Copilot + voice','Ask your data anything; speak questions, hear answers'),('Impact analytics','Revenue protected, hours replaced, cost per incident'),('Governance scorecard','Auto-approved vs human-approved vs rejected'),('Audit report','One-click incident report: plan, actions, approvals')]
for i,(t,d) in enumerate(feats):
    x=0.7+(i%3)*4.1; y=2.5+(i//3)*2.2
    rect(s,x,y,3.8,1.95,PAPER,RGBColor(0xbb,0xb5,0xa8)); text(s,x+0.2,y+0.15,3.4,0.5,t,20,SERIF,INK); text(s,x+0.2,y+0.85,3.4,1.0,d,13,SANS,MUTED)
# 7 results
s=slide('Measured results','Demo scenario: port strike at Apex Components (9 days late)')
res=[('5','orders saved from delay'),('₹1,73,250','revenue protected'),('2.5 hrs','of manual work replaced'),('~25 s','crew time, instead of 48.7 h industry average')]
for i,(b,d) in enumerate(res):
    x=0.7+i*3.05; rect(s,x,2.5,2.85,2.3,PAPER,RGBColor(0xbb,0xb5,0xa8)); text(s,x+0.15,2.7,2.6,0.9,b,32,SERIF,INK); text(s,x+0.15,3.7,2.6,1.0,d,14,SANS,MUTED)
text(s,0.7,5.2,12,1.5,['Also in this run: 2 purchase orders placed, 4 customers informed, 1 escalation ticket for an order no supplier could save.','Every run reports its own ROI and AI cost, answering Gartner\'s "unclear value" failure reason.'],15,SANS,MUTED)
# 8 tech
s=slide('Built with the required stack','Architecture')
tech=[('Frontend','React + Vite, React Router, Tailwind CSS, Axios'),('Backend','Node.js + Express, JWT, bcrypt, Zod validation'),('Database','SQLite (orders, suppliers, runs, events, actions)'),('AI','Google Gemini, key only in backend env vars, rule-engine fallback'),('Live updates','Server-Sent Events stream every agent step'),('Deploy','Render (one service) or Vercel + Render')]
for i,(t,d) in enumerate(tech):
    x=0.7+(i%3)*4.1; y=2.5+(i//3)*2.0
    rect(s,x,y,3.8,1.75,PAPER,RGBColor(0xbb,0xb5,0xa8)); text(s,x+0.2,y+0.15,3.4,0.5,t,20,SERIF,INK); text(s,x+0.2,y+0.8,3.4,0.9,d,13,SANS,MUTED)
# 9 close
s=slide('Why OpsPilot wins','',dark=True)
pts=['A real, cited problem: the detect-to-decide gap and the AI trust gap','Truly agentic: plans, reasons, uses tools, collaborates, acts, asks for approval','Safe and explainable: proportional governance and a full audit trail','Measurable: revenue protected, hours saved and cost per incident on every run','Robust: never breaks, even when the AI is offline']
text(s,0.7,2.3,11.8,3.5,['•  '+p for p in pts],20,SERIF,PAPER)
text(s,0.7,6.0,12,0.9,['GitHub: <your-repo-link>        Live app: <your-render-link>','Thank you'],16,SANS,SAND)
prs.save('/home/user/opspilot/docs/OpsPilot_Pitch_Deck.pptx')
print('saved',len(prs.slides.__iter__.__self__._sldIdLst))
