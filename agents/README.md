# AI Agents Directory

This directory contains the definitions and prompts for the core multi-agent system:

1. **Planner Agent**: Orchestrates pipeline stage sequencing per application.
2. **Specialist (Sourcing) Agent**: Ingests raw signals from a sourcing channel and structures them into `founders.structuredProfile`.
3. **Specialist (Screening) Agent**: Scores the 3 screening axes independently (Founder, Market, Idea vs Market).
4. **Verifier (Diligence) Agent**: Cross-checks claims using Tavily web search and computes a per-claim Trust Score.
5. **Synthesizer (Decision) Agent**: Generates the investment memo and flags gaps/contradictions.
