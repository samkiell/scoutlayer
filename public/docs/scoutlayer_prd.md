# ScoutLayer — PRD
**Challenge:** Hack-Nation 6th Global AI Hackathon · Challenge 02 · The VC Brain (Maschmeyer Group)
**Builder:** SAMKIEL (solo)
**Deadline:** Sunday, 2:00 PM WAT

---

## 1. Vision

An AI-first sourcing and screening system that surfaces exceptional founders on evidence, not
network access. Founders apply directly; investors can also run outbound scouting to discover
founders before they start fundraising. Every score and recommendation traces back to a real
source. Goal: a $100K investment decision an investor could act on within 24 hours.

## 2. Users & Roles

| Role | Can do |
|---|---|
| **Founder** | Sign up, apply (deck + company info + optional extra fields), track own application status and Founder Score |
| **Investor** | View inbound applications, trigger outbound scouting (sourcing agent scans GitHub etc.), review screening results, Trust Scores, and memos, make investment calls |

Both roles authenticate via Google (NextAuth), routed to separate dashboards based on role
selected at signup.

Inbound and outbound founders converge into the same screening pipeline.

## 3. Core Pipeline

```
Sourcing → Screening → Diligence → Decision
```

1. **Sourcing** *(highest priority — 30% of judging weight)*
   Inbound: founder applies directly.
   Outbound: investor triggers a scan of the chosen sourcing channel (GitHub primary, pending
   quick evaluation test across GitHub / Hacker News / ProductHunt / Devpost / arXiv).

2. **Screening**
   Multi-agent scoring on 3 independent axes — **not averaged**:
   - Founder (track record, background)
   - Market (sizing, competitors — bullish/neutral/bear)
   - Idea vs. Market (does it survive scrutiny, or could the team pivot)
   Each axis shows a trend (improving/declining/stable).

3. **Diligence**
   Verifier agent cross-checks every claim (traction, revenue, team background) against real
   evidence via Tavily web search. Produces a **Trust Score per claim**, not per company, with
   flagged contradictions.

4. **Decision**
   Investment memo generated: Company snapshot, Investment hypotheses, SWOT, Problem &
   Product, Traction & KPIs (required sections per brief). Missing data explicitly flagged, never
   fabricated.

**Founder Score:** persists across applications, lives in Mongo, never resets, one input into the
Founder axis (not a replacement for it).

**Cold-start handling:** founders with no GitHub/funding history must still get a real, documented
scoring path — not silently deprioritized.

## 4. MVP Scope

**In scope:**
- Full 4-stage pipeline, functional end-to-end
- Google auth, Founder + Investor roles
- Inbound application flow
- Outbound scouting on one primary channel (post quick-test decision)
- 3-axis screening with trend
- Trust Score with Tavily-backed citations
- Investment memo generation
- Natural-language query (e.g. "technical founder, Berlin, AI infra") via Groq → structured Mongo filter
- Live pipeline progress via SSE

**Out of scope (per brief):**
- Portfolio monitoring, follow-on, fund ops, exit stages
- Averaging the 3 screening axes into one score

**Cut list if behind schedule (in order of what to drop first):**
1. Natural-language query → fall back to manual filters
2. Outbound scouting → inbound-only demo
3. Trend direction per axis → static scores only
4. Multiple sourcing channels evaluated → GitHub only, skip comparison step

## 5. Tech Stack

- **Frontend/Backend:** Next.js (App Router), TypeScript, full-stack
- **DB:** MongoDB Atlas
- **Styling:** Tailwind + shadcn/ui, Lucide icons, Sonner (toasts)
- **Auth:** NextAuth, Google only
- **Pipeline execution:** SSE streaming + Mongo status field (works within Vercel's serverless limits, doubles as live agentic traceability)
- **LLM:** Groq — `openai/gpt-oss-120b` (screening, verification, memo), `openai/gpt-oss-20b` (lightweight parsing); OpenAI credits reserved for select reasoning-heavy calls
- **Web verification:** Tavily
- **Hosting:** Vercel

## 6. Data Model (high-level)

**`users`** — `{ _id, email, role: 'founder' | 'investor', name, createdAt }`

**`founders`** — `{ _id, userId?, name, company, source: 'inbound' | 'outbound', channel, rawSignals: [...], structuredProfile: {...}, founderScore: { value, history: [...] }, createdAt }`

**`applications`** — `{ _id, founderId, deck, companyInfo, status: 'sourced'|'screening'|'diligence'|'decided', createdAt }`

**`screenings`** — `{ _id, applicationId, founderAxis: { score, trend, evidence }, marketAxis: {...}, ideaVsMarketAxis: {...} }`

**`trustClaims`** — `{ _id, applicationId, claim, evidenceUrl, confidence, verifiedBy: 'tavily'|'unverified' }`

**`memos`** — `{ _id, applicationId, companySnapshot, investmentHypotheses, swot, problemProduct, tractionKpis, gapsFlagged: [...] }`

**`pipelineRuns`** — `{ _id, applicationId, stage, status: 'pending'|'running'|'done'|'error', log: [...] }` (drives SSE progress)

## 7. Route Map

### Founder
- `/founder/apply` — application form (deck upload, company info)
- `/founder/dashboard` — application status, Founder Score, history

### Investor
- `/investor/dashboard` — inbound applications, ranked list
- `/investor/scout` — trigger outbound sourcing run
- `/investor/founder/[id]` — full profile: screening axes, Trust Score claims, memo
- `/investor/search` — natural-language query interface

### Shared
- `/login` — Google auth entry
- `/` — role-aware redirect

### API (App Router route handlers)
- `POST /api/applications` — founder submits application
- `POST /api/scout` — trigger outbound sourcing (SSE stream)
- `GET /api/pipeline/[applicationId]` — SSE progress stream
- `POST /api/screen/[applicationId]` — run screening agents
- `POST /api/diligence/[applicationId]` — run verifier agent
- `POST /api/memo/[applicationId]` — generate memo
- `POST /api/query` — natural-language → structured filter

## 8. Agent Architecture

- **Planner** — orchestrates pipeline stage sequencing per application
- **Specialist (Sourcing)** — ingests raw signals from chosen channel, structures into `founders.structuredProfile`
- **Specialist (Screening)** — scores 3 axes independently
- **Verifier (Diligence)** — Tavily-backed claim checking, produces Trust Score
- **Synthesizer (Decision)** — compiles memo from all prior stage outputs, flags gaps

## 9. Judging Alignment

| Criterion | Weight | What we're building for it |
|---|---|---|
| Data Architecture & Intelligence | 30% | Deep sourcing on one channel, honest cold-start handling |
| Intelligent Analysis & Trust | 25% | Per-claim Trust Score, transparent uncertainty |
| Investment Utility & Execution | 30% | End-to-end working pipeline, real 24hr-actionable memo |
| UX & Design | 15% | Clean investor dashboard, shadcn, no unnecessary complexity |

## 10. Open Risks

- Solo build, full 4-stage depth — cut list above exists for this reason
- Vercel timeout risk on long agent chains — mitigated via SSE + status polling
- Sourcing channel not yet finalized — pending quick scoring test across candidates
