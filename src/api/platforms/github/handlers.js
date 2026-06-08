import crypto from 'crypto';
import { insertOrUpdatePlatformConnection } from '../../../db/platforms.js';
import { fetchPlatformsByInstallationId } from '../../../db/platforms.js';
import { generateGitHubAppJWT } from './utils.js';
import {
  fetchGitHubTokens,
  fetchGitHubEmails,
  fetchGitHubInstallationDetails,
} from './github_auth.js';
import {
  pushGithubWebhookEntry,
  countGithubWebhookEntries,
} from '../../../redis/client.js';
import { insertGitHubActivity } from '../../../firestore/github_activities.js';
import { GITHUB_WEBHOOK_SECRET } from '../../env_variables.js';
import { parseGitHubWebhookPayload } from './parser.js';
import { generateActivitySummary } from './llm_tasks.js';

function verifySignature(rawBody, signature) {
  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function shouldProcessWebhook(rawPayload, headers) {
  try {
    const hook_id = headers['x-github-hook-id'] || 'unknown';
    const eventType = headers['x-github-event'] || 'unknown';

    const isValid = verifySignature(
      JSON.stringify(rawPayload),
      headers['x-hub-signature-256']
    );

    if (!isValid) {
      console.log(`Invalid GitHub webhook payload for headers:`, headers);
      return null;
    }

    if (!rawPayload.installation || !rawPayload.installation.id) {
      console.log(
        `GitHub webhook payload missing installation information for hook_id ${hook_id}, event type ${eventType}.`
      );
      return null;
    }

    let platforms = null;
    try {
      const result = await fetchPlatformsByInstallationId(
        rawPayload.installation.id
      );
      platforms = result.platforms;
      if (result.error) {
        console.log(
          `Error fetching platform for installation_id ${rawPayload.installation.id}:`,
          result.error
        );
      }
    } catch (dbErr) {
      console.log(
        `Database error fetching platform for installation_id ${rawPayload.installation.id}:`,
        dbErr
      );
      return null;
    }

    if (!platforms || platforms.length === 0) {
      console.log(
        `No platform found for installation_id ${rawPayload.installation.id}, hook_id ${hook_id}.`
      );
      return null;
    }

    if ((await countGithubWebhookEntries(hook_id)) > 0) {
      console.log(
        `Duplicate GitHub webhook received for hook_id ${hook_id}, skipping processing.`
      );
      return null;
    }

    return platforms;
  } catch (e) {
    console.log('Error in shouldProcessWebhook:', e);
    return null;
  }
}

export async function handleWebhookPayload(rawPayload, headers = {}) {
  try {
    console.log(`GitHub webhook payload: ${JSON.stringify(rawPayload)}`);
    const hook_id = headers['x-github-hook-id'] || 'unknown';
    const eventType = headers['x-github-event'] || 'unknown';

    const platforms = await shouldProcessWebhook(rawPayload, headers);
    if (!platforms) {
      return;
    }
    await pushGithubWebhookEntry(rawPayload, headers);

    const document = parseGitHubWebhookPayload(eventType, rawPayload);

    if (document) {
      console.log(
        `Parsed GitHub webhook document for hook_id: ${hook_id}, event type: ${eventType}:`,
        JSON.stringify(document)
      );

      const llmSummary = await generateActivitySummary(document);
      document.summary = llmSummary ?? document.summary ?? null;

      for (const platform of platforms) {
        if (
          platform.user_metadata?.user_association !== 'owner' &&
          platform.user_metadata?.github_user_id !== document.actor?.id
        ) {
          console.log(
            `Skipping activity insertion for platform_id: ${platform.id} and user_id: ${platform.user_id} due to user association and actor mismatch.`
          );
          continue;
        }
        await insertGitHubActivity({
          ...document,
          sky_deck_user_id: platform.user_id,
          platform_id: platform.id,
        });
      }
    } else {
      console.log(
        `Something went wrong extracting document for hook_id: ${hook_id}, event type: ${eventType}.`
      );
    }
  } catch (e) {
    console.log('Error in handleWebhookPayload:', e);
  }
}

export async function handleInstallation(userId, code, installation_id) {
  console.log(
    `Handling GitHub installation for user ${userId} with installation_id ${installation_id}`
  );
  try {
    if (!installation_id) {
      return { data: null, error: 'Missing installation_id', status: 400 };
    }

    const { data: tokens, error: tokenErr } = await fetchGitHubTokens(code);
    if (tokenErr) return { data: null, error: tokenErr, status: 400 };
    const { accessToken, refreshToken } = tokens;

    const { data: emails, error: emailErr } =
      await fetchGitHubEmails(accessToken);
    if (emailErr) {
      console.log(`Error fetching GitHub emails for user ${userId}:`, emailErr);
      return { data: null, error: emailErr, status: 502 };
    }

    const primaryEmail = Array.isArray(emails)
      ? (emails.find((e) => e.primary && e.verified) ?? emails[0])
      : null;

    const {
      data: installation,
      error: instErr,
      status: instStatus,
    } = await fetchGitHubInstallationDetails(installation_id);
    if (instErr) return { data: null, error: instErr, status: instStatus };

    const userMetadata = {
      primary_email: primaryEmail,
      login: installation.account?.login ?? null,
      avatar_url: installation.account?.avatar_url ?? null,
      html_url: installation.account?.html_url ?? null,
      account_type: installation.account?.type ?? null,
      user_association: 'owner',
    };

    const platformMetadata = {
      installation_id: installation.id,
      installation_details: installation,
    };

    const primaryId = String(installation.account?.id ?? '');
    const { error: dbErr } = await insertOrUpdatePlatformConnection(
      userId,
      'github',
      primaryId,
      accessToken,
      refreshToken,
      userMetadata,
      platformMetadata
    );

    if (dbErr) {
      console.log('Error saving GitHub platform connection to DB:', dbErr);
      const appJWT = generateGitHubAppJWT();
      await fetch(
        `https://api.github.com/app/installations/${installation_id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: 'application/vnd.github+json',
          },
        }
      ).catch(() => {});
      return {
        data: null,
        error: 'Failed to save platform connection.',
        status: 500,
      };
    }

    return { data: { github_user: userMetadata }, error: null, status: 200 };
  } catch (e) {
    console.log('Error in handleInstallation:', e);
    return {
      data: null,
      error: 'Something went wrong during installation.',
      status: 500,
    };
  }
}

export async function handleDisconnect(installationId) {
  try {
    const appJWT = generateGitHubAppJWT();
    const uninstallRes = await fetch(
      `https://api.github.com/app/installations/${installationId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${appJWT}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2026-03-10',
        },
      }
    );

    if (!uninstallRes.ok && uninstallRes.status !== 204) {
      const body = await uninstallRes.json().catch(() => ({}));
      console.log(
        `Failed to uninstall GitHub App for installationId ${installationId}. Status: ${uninstallRes.status}. Response body:`,
        body
      );
      return {
        success: false,
        error: body.message ?? 'Failed to uninstall GitHub App.',
        status: uninstallRes.status,
      };
    }

    return { success: true, error: null, status: 200 };
  } catch (e) {
    console.log(
      `Error uninstalling GitHub App for installationId ${installationId}:`,
      e
    );
    return {
      success: false,
      error: 'Something went wrong while uninstalling GitHub App.',
      status: 500,
    };
  }
}
