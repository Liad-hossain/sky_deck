// Backend auth/session processing.
import {
  authSignup,
  authSignin,
  authSignout,
  authForgotPassword,
  authResetPassword,
  authRefreshSession,
} from '../../db/profiles.js';

export async function signupUser(body) {
  const email = (body?.email || '').trim();
  const password = body?.password || '';
  if (!email || !password)
    return { status: 400, body: { error: 'Email or password is missing.' } };

  const { data, error } = await authSignup(email, password);
  if (error) {
    console.log('Signup error:', error);
    return { status: 500, body: { error: error.message ?? 'Signup failed' } };
  }

  return { status: 200, body: { data } };
}

export async function signinUser(body) {
  const email = (body?.email || '').trim();
  const password = body?.password || '';
  if (!email || !password)
    return { status: 400, body: { error: 'Email or password is missing.' } };

  const { data, error } = await authSignin(email, password);
  if (error) {
    console.log('Signin error:', error);
    return { status: 500, body: { error: error.message ?? 'Signin failed' } };
  }

  return {
    status: 200,
    body: { data: { user: data.user, session: data.session } },
  };
}

export async function signoutUser(accessToken) {
  const { error } = await authSignout(accessToken);
  if (error) {
    console.log('Signout error:', error);
    return { status: 500, body: { error: error.message ?? 'Signout failed' } };
  }
  return { status: 200, body: { success: true } };
}

export async function forgotPasswordRequest(body) {
  const email = (body?.email || '').trim();
  if (!email) return { status: 400, body: { error: 'Email is required' } };

  const { error } = await authForgotPassword(email);
  if (error) {
    console.log('Forgot password error:', error);
    return {
      status: 500,
      body: { error: error.message ?? 'Failed to send reset email' },
    };
  }
  return { status: 200, body: { success: true } };
}

export async function resetPasswordRequest(body) {
  const accessToken = body?.access_token || '';
  const refreshToken = body?.refresh_token || '';
  const newPassword = body?.newPassword || '';
  if (!accessToken || !newPassword)
    return {
      status: 400,
      body: { error: 'Missing recovery token or new password' },
    };

  const { data, error } = await authResetPassword(
    accessToken,
    refreshToken,
    newPassword
  );
  if (error) {
    console.log('Reset password error:', error);
    return {
      status: 500,
      body: { error: error.message ?? 'Failed to reset password' },
    };
  }
  return { status: 200, body: { data } };
}

export async function refreshSession(body) {
  const refreshToken = body?.refresh_token || '';
  const { data, error } = await authRefreshSession(refreshToken);
  if (error) {
    console.log('Refresh session error:', error);
    return {
      status: 500,
      body: { error: error.message ?? 'Refresh failed' },
    };
  }

  return {
    status: 200,
    body: { data: { user: data.user, session: data.session } },
  };
}

export async function getSessionUser(user) {
  return { status: 200, body: { data: { user } } };
}
