import { OpenAI } from 'openai';

const groqApiKey = process.env.GROQ_API_KEY || '';
const client = new OpenAI({
  apiKey: groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODELS = ['gpt-oss-120b', 'llama-3.3-70b-versatile'];

async function callGroqWithFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  let lastError: any = null;
  for (const model of MODELS) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });
      return response.choices[0].message?.content || '{}';
    } catch (err: any) {
      lastError = err;
    }
  }
  throw lastError || new Error('All Groq models failed');
}

export interface TranslationResult {
  filter: Record<string, any>;
  explanation: string;
  unsupported: string[];
}

export async function translateNLQuery(query: string): Promise<TranslationResult> {
  const systemPrompt = `You are a MongoDB query translator for ScoutLayer, a venture capital founder sourcing database.
Your task is to translate a natural language investment scouting query into a valid MongoDB query object.
The query object will run against the "founders" collection (which is joined with "applications" and "screenings").

Below is the database schema description of fields you can search against:
1. "name": Founder's name (string)
2. "company": Company name (string)
3. "source": 'inbound' | 'outbound' (string)
4. "channel": Sourcing channel (string)
5. "createdAt": Date
6. "founderScore.value": Persistent overall founder score (number, 0-100)
7. "structuredProfile.oneLiner": Pitch one-liner (string)
8. "structuredProfile.description": Detailed description (string)
9. "structuredProfile.sectors": Array of sectors or primary programming languages/technologies (array of strings, e.g. ["TypeScript", "AI", "Rust"])
10. "structuredProfile.location": Location / city / country (string)
11. "structuredProfile.followers": GitHub follower count (number)
12. "structuredProfile.publicRepos": GitHub repo count (number)
13. "structuredProfile.coldStart": True if profile is sparse (boolean)
14. "structuredProfile.topRepos": Array of repo objects containing: "name", "description", "stars" (number), "language"
15. "application.deck": URL to deck (string)
16. "application.status": 'sourced' | 'screening' | 'diligence' | 'decided'
17. "screening.founderAxis.score": Founder screening score (number, 0-100)
18. "screening.marketAxis.score": Market screening score (number, 0-100)
19. "screening.ideaVsMarketAxis.score": Idea vs market screening score (number, 0-100)

RULES FOR THE MONGO FILTER:
- Keep the MongoDB filters simple and realistic.
- For string search, use regex where appropriate, e.g. {"structuredProfile.location": {"$regex": "Berlin", "$options": "i"}}.
- To match sectors or topics, query "structuredProfile.sectors". E.g., for "AI infra", search {"structuredProfile.sectors": {"$regex": "AI", "$options": "i"}}, or check if any top repo contains "AI" or "infrastructure" in its description or name. Or search "structuredProfile.description" / "structuredProfile.oneLiner" with regexes.
- To check "no prior VC backing", you can look at the lack of funding history or structured profile indicators. Since we don't have a direct "vc_backed" boolean, you can either assume "no VC backing" is the default or check if "structuredProfile.coldStart" is true or if funding is not mentioned in bios. Please loosely match by searching that the bio/description does not contain "VC", "venture backed", "funded by", "raised" OR mention this in "unsupported".
- If the query mentions something that cannot be strictly modeled in MongoDB filters (e.g. "top-tier accelerator" because there's no accelerator field, or "no prior VC backing" since there's no VC backing flag), DO NOT invent fields. Instead:
  1. Add a regex text search against bio, repo descriptions, or one-liner if possible.
  2. Put the criterion into the "unsupported" array in the JSON response explaining why it's not strictly filterable.
- Never output MongoDB operators that aren't valid in Mongo (like $like).

You MUST output exactly a JSON object in this format:
{
  "filter": <valid MongoDB filter object>,
  "explanation": "<short plain-language explanation of how the query was interpreted>",
  "unsupported": ["<unsupported criteria 1>", "<unsupported criteria 2>", ...]
}`;

  try {
    const rawResult = await callGroqWithFallback(systemPrompt, JSON.stringify({ query }));
    const parsed = JSON.parse(rawResult);
    return {
      filter: parsed.filter || {},
      explanation: parsed.explanation || 'No translation explanation generated.',
      unsupported: Array.isArray(parsed.unsupported) ? parsed.unsupported : [],
    };
  } catch (error) {
    console.error('Translation error:', error);
    return {
      filter: {},
      explanation: 'Fallback: Failed to translate natural language query. Performing empty search.',
      unsupported: [query],
    };
  }
}
