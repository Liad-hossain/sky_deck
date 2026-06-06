import { SKY_DECK_GROQ_API_KEY } from '../../env_variables.js';
import { ActivityTypes } from './constants.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const MAX_SUMMARY_CHARS = 300;

const PULL_REQUEST_SYSTEM_PROMPT = `You are a technical summariser for a developer activity dashboard.
You will receive a JSON object representing a GitHub pull request (any field may be null or 0 if unavailable).
Write one plain-text sentence describing what was done in the pull request — focus purely on the engineering work, not who did it.

Rules:
- Hard limit: ${MAX_SUMMARY_CHARS} characters. Truncate with "…" if needed.
- Plain text only — no markdown, no bullet points, no line breaks.
- Describe the WORK: use the title, body (if present), and labels to explain what was changed or fixed.
- If body is present and informative, use it to elaborate the task (e.g. "replaced session auth with JWT", "fixed unbounded memory growth in the cache layer").
- If body is null or empty, infer the purpose from the title alone — silently, never say the body is missing.
- Do NOT mention the author, PR number, branch names, or who submitted it.
- Do NOT mention raw URLs, null values, or zero-value stats.
- Omit diff stats unless they strongly convey scope (e.g. a massive rewrite).

Example outputs:
Replaced session-based authentication with stateless JWT tokens, removing over 400 lines of legacy middleware.
Fixed an unbounded memory growth issue in the Redis cache layer under high write load.
Updated the README with clearer setup instructions and added a contributing guide.`;

const PUSH_SYSTEM_PROMPT = `You are a technical summariser for a developer activity dashboard.
You will receive a JSON object representing a GitHub push event. It contains a "ref" (the branch ref), a "commits" array (each with a "message" and lists of "added", "removed", "modified" files), and flags like "forced", "created", "deleted" (any field may be null or empty).
Write one plain-text sentence summarising what was pushed — focus on the engineering work derived from the commit messages and changed files.

Rules:
- Hard limit: ${MAX_SUMMARY_CHARS} characters. Truncate with "…" if needed.
- Plain text only — no markdown, no bullet points, no line breaks.
- Derive the summary from commit messages (and file names if they add clarity). Aggregate multiple commits into one coherent sentence.
- If "created" is true, note a new branch was created; if "deleted" is true, note a branch was deleted; if "forced" is true, note it was a force-push.
- Do NOT mention the author, branch name, commit SHAs, or raw URLs.
- Do NOT mention null values, empty arrays, or zero-value fields.
- If there is only one commit, summarise that commit's work directly.
- If there are multiple commits, describe the overall theme of the changes.

Example outputs:
Added user profile endpoints and updated the OpenAPI spec to reflect the new routes.
Refactored the database migration runner to support rollback and dry-run modes across three files.
Force-pushed a fix for the broken CI pipeline configuration.
Initialised the project with base scaffolding, linting config, and a starter README.`;

async function callGroq(systemPrompt, userMessage) {
  const apiKey = SKY_DECK_GROQ_API_KEY;
  if (!apiKey) {
    console.warn(
      '[llm_tasks] SKY_DECK_GROQ_API_KEY is not set — skipping LLM summary.'
    );
    return null;
  }

  const body = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3, // low variance for consistent one-liners
    max_tokens: 180, // headroom for a richer ~300-char descriptive sentence
    stream: false,
  };

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[llm_tasks] Groq API error ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() ?? null;
    if (!raw) return null;

    return raw.length > MAX_SUMMARY_CHARS
      ? raw.slice(0, MAX_SUMMARY_CHARS - 1) + '…'
      : raw;
  } catch (err) {
    console.error('[llm_tasks] Groq fetch failed:', err);
    return null;
  }
}

export async function generateActivitySummary(document) {
  if (!document) return null;
  if (!document.activity_type) return null;
  let summary = null;

  if (document.activity_type === ActivityTypes.PULL_REQUEST) {
    if (!document.pull_request) {
      console.warn(
        '[llm_tasks] generateActivitySummary called with null pull_request'
      );
      return null;
    }

    const userMessage = JSON.stringify(document.pull_request);
    summary = await callGroq(PULL_REQUEST_SYSTEM_PROMPT, userMessage);
    console.log(`[llm_tasks] Generated PR summary: ${summary}`);
  } else if (document.activity_type === ActivityTypes.PUSH) {
    if (!document.push_event) {
      console.warn(
        '[llm_tasks] generateActivitySummary called with null push_event'
      );
      return null;
    }

    const userMessage = JSON.stringify(document.push_event);
    summary = await callGroq(PUSH_SYSTEM_PROMPT, userMessage);
    console.log(`[llm_tasks] Generated Push summary: ${summary}`);
  }

  console.log(
    `[llm_tasks] No LLM task defined for activity_type: ${document.activity_type}`
  );
  return summary;
}
