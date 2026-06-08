import { SKY_DECK_GROQ_API_KEY } from '../../env_variables.js';
import { ActivityTypes } from './constants.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const MAX_SUMMARY_CHARS = 500;

const PULL_REQUEST_SYSTEM_PROMPT = `You are a technical summariser for a developer activity dashboard.
You will receive a JSON object representing a GitHub pull request event (any field may be null or 0 if unavailable).
The object contains an "action" field that tells you what happened. It is the primary signal — use it to determine the required opening of your summary.

Action → required opening:
- "opened"      → must start with "Opened a pull request …"
- "closed" + is_merged=true  → must start with "Merged a pull request …"
- "closed" + is_merged=false → must start with "Closed a pull request …"
- "reopened"    → must start with "Reopened a pull request …"
- "synchronize" → must start with "Updated a pull request with new commits …"
- "edited"      → must start with "Edited a pull request …"
- anything else → must start with "Updated a pull request …"

For action="edited", the object also contains a "changes" field describing what was modified:
- "changes.title": { "from": "<old title>" } — if the title was renamed.
- "changes.body":  { "from": "<old body>" }  — if the description was changed.
- "changes.base":  { "ref": { "from": "<old base branch>" } } — if the base branch was retargeted.
Any field absent from "changes" was not modified.

Rules:
- Hard limit: ${MAX_SUMMARY_CHARS} characters. Truncate with "…" if needed.
- Plain text only — no markdown, no bullet points, no line breaks.
- For action="edited": describe WHAT changed — title renamed (old → new), description updated, base branch retargeted. Name old and new values when both are available and meaningful. List all changed fields in one sentence.
- For all other actions: after the opening verb, describe the WORK using title, body (if present), and labels.
- If body is null or empty, infer from the title alone — never say the body is missing.
- Do NOT mention the author, PR number, branch names (except base retarget for edited), or raw URLs.
- Do NOT mention null values, zero-value stats, or unchanged fields.

Example outputs:
Opened a pull request replacing session-based authentication with stateless JWT tokens.
Merged a pull request fixing an unbounded memory growth issue in the Redis cache layer.
Closed a pull request that added experimental gRPC support without merging.
Reopened a pull request adding dark-mode support after resolving the CSS conflicts.
Updated a pull request with new commits addressing the review feedback on input validation.
Edited a pull request, renaming it from "Fix login bug" to "Fix OAuth token expiry on login".
Edited a pull request, retargeting the base branch from "main" to "release/v2" and updating the description.`;

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

const PULL_REQUEST_REVIEW_SYSTEM_PROMPT = `You are a technical summariser for a developer activity dashboard.
You will receive a JSON object representing a GitHub pull request review event with these fields (any may be null):
- "action": what happened — exactly one of: "submitted", "dismissed", "edited".
- "state": the review verdict (only relevant when action="submitted") — one of: "approved", "changes_requested", "commented".
- "body": the current review text (may be null or empty).
- "pull_request_title": the title of the pull request being reviewed (may be null).
- "changes": present only when action="edited". May contain:
  - "body": { "from": "<old review text>" } — if the review body was changed.

The "action" field is the primary signal — it MUST determine the required opening:
- action="submitted" + state="approved"           → must start with "Approved …"
- action="submitted" + state="changes_requested"  → must start with "Requested changes to …"
- action="submitted" + state="commented"          → must start with "Left a comment on …"
- action="dismissed"                              → must start with "Dismissed a review on …"
- action="edited"                                 → must start with "Edited a review on …"

Rules:
- Hard limit: ${MAX_SUMMARY_CHARS} characters. Truncate with "…" if needed.
- Plain text only — no markdown, no bullet points, no line breaks.
- After the mandatory opening, always reference the pull request using "pull_request_title".
- For action="submitted" or "dismissed": if "body" is informative, incorporate the key feedback point.
- For action="edited": describe what changed using "changes.body.from" (old text) vs "body" (new text). If "changes.body.from" is null or empty, simply note the review body was updated.
- If "body" is null or empty and no changes context is available, base the summary on "action", "state", and "pull_request_title" alone — never say any field is missing.
- Do NOT mention reviewer name, review ID, commit SHAs, raw URLs, or author_association.
- Do NOT mention null values or empty strings.

Example outputs:
Approved the pull request replacing session-based auth with stateless JWT tokens.
Requested changes to the database migration runner, noting the rollback path handles only happy-path exits.
Left a comment on the rate-limiter PR questioning whether the exponential backoff caps at a safe ceiling.
Dismissed a review on the caching layer refactor.
Edited a review on the JWT migration PR, updating the feedback to clarify that the refresh token rotation logic also needs testing.`;

async function callGroq(systemPrompt, userMessage) {
  try {
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
  try {
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
    } else if (document.activity_type === ActivityTypes.PUSH) {
      if (!document.push_event) {
        console.warn(
          '[llm_tasks] generateActivitySummary called with null push_event'
        );
        return null;
      }

      const userMessage = JSON.stringify(document.push_event);
      summary = await callGroq(PUSH_SYSTEM_PROMPT, userMessage);
    } else if (document.activity_type === ActivityTypes.PULL_REQUEST_REVIEW) {
      if (!document.pull_request_review) {
        console.warn(
          '[llm_tasks] generateActivitySummary called with null pull_request_review'
        );
        return null;
      }

      const userMessage = JSON.stringify(document.pull_request_review);
      summary = await callGroq(PULL_REQUEST_REVIEW_SYSTEM_PROMPT, userMessage);
    } else {
      console.log(
        `[llm_tasks] No LLM task defined for activity_type: ${document.activity_type}`
      );
    }
    return summary;
  } catch (err) {
    console.error('[llm_tasks] generateActivitySummary failed:', err);
    return null;
  }
}
