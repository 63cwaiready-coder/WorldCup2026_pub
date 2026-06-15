import { jwtVerify, SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret');

export type AuthUser = {
  userId: string;
  username: string;
  isAdmin: boolean;
};

export async function signAuthToken(user: AuthUser) {
  return new SignJWT({ username: user.username, isAdmin: user.isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.sub ?? '',
      username: String(payload.username ?? ''),
      isAdmin: Boolean(payload.isAdmin),
    };
  } catch {
    return null;
  }
}

export function getBearerToken(headers: Headers) {
  const auth = headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}
