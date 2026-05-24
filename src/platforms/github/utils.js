import { createSign } from 'crypto';

export function generateGitHubAppJWT() {
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60, // issued 60s ago to cover clock skew
      exp: now + 600, // valid for 10 minutes (GitHub maximum)
      iss: process.env.GITHUB_APP_ID,
    })
  ).toString('base64url');

  const signingInput = `${header}.${payload}`;

  // Replace literal \n in env string with real newlines (common in .env files)
  const pem = (process.env.GITHUB_APP_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(pem, 'base64url');

  return `${signingInput}.${signature}`;
}
