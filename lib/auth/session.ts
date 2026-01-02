import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secret = new TextEncoder().encode(process.env.NEON_AUTH_SECRET);
const issuer = process.env.NEON_AUTH_ISSUER || 'http://localhost:3000';

export interface SessionPayload {
  userId: string;
  email: string;
  username: string;
}

// Criar token JWT
export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime('7d') // Token expira em 7 dias
    .sign(secret);

  return token;
}

// Verificar token JWT
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, secret, {
      issuer,
    });
    return verified.payload as SessionPayload;
  } catch (error) {
    return null;
  }
}

// Pegar sessão do cookie (Server Components)
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) return null;

  return verifySession(token);
}

// Pegar sessão de um request (Middleware/API Routes)
export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get('session')?.value;

  if (!token) return null;

  return verifySession(token);
}

// Salvar sessão no cookie
export async function saveSession(payload: SessionPayload): Promise<void> {
  const token = await createSession(payload);
  const cookieStore = await cookies();

  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  });
}

// Deletar sessão (logout)
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
