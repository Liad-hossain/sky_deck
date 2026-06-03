import { createSign, createPrivateKey } from 'crypto';
import { GITHUB_APP_PRIVATE_KEY, GITHUB_APP_ID } from '../../env_variables';

function normalizePem(raw) {
  if (!raw) return '';
  let s = raw.trim();
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim();
  }

  s = s.replace(/\\n/g, '\n');

  if (!/-----BEGIN [A-Z ]+-----/.test(s)) {
    try {
      const decoded = Buffer.from(s, 'base64').toString('utf8');
      if (/-----BEGIN [A-Z ]+-----/.test(decoded)) {
        s = decoded.replace(/\\n/g, '\n');
      }
    } catch (e) {}
  }

  return s;
}

export function generateGitHubAppJWT() {
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60, // issued 60s ago to cover clock skew
      exp: now + 600, // valid for 10 minutes (GitHub maximum)
      iss: GITHUB_APP_ID,
    })
  ).toString('base64url');

  const signingInput = `${header}.${payload}`;

  const pem = normalizePem(GITHUB_APP_PRIVATE_KEY);

  if (!pem) {
    throw new Error(
      'GITHUB_APP_PRIVATE_KEY is not set or invalid. Provide a PEM-formatted RSA private key in the GITHUB_APP_PRIVATE_KEY environment variable (with newlines as \n or a base64-encoded string).'
    );
  }

  let keyObject;
  try {
    keyObject = createPrivateKey({ key: pem, format: 'pem' });
  } catch (e) {
    try {
      const der = Buffer.from(pem, 'base64');
      keyObject = createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
    } catch (e2) {
      throw new Error(
        'Failed to parse GITHUB_APP_PRIVATE_KEY. Ensure it is a valid PEM (-----BEGIN PRIVATE KEY-----...) or a base64-encoded PKCS8/PKCS1 key. Error: ' +
          (e.message || e2.message)
      );
    }
  }

  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);

  const sigBase64 = sign.sign(keyObject, 'base64');
  const sigBase64Url = sigBase64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${signingInput}.${sigBase64Url}`;
}
