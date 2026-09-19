import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { IncomingMessage } from 'node:http';
import { pool } from './db.js';

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 30;
const socketTickets = new Map<string, { userId: string; expires: number }>();

export type AuthUser = Readonly<{ id: string; handle: string }>;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString('base64url')}:${derived.toString('base64url')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltText, hashText] = stored.split(':');
  if (!saltText || !hashText) return false;
  const salt = Buffer.from(saltText, 'base64url');
  const expected = Buffer.from(hashText, 'base64url');
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function validateHandle(handle: string): string {
  const trimmed = handle.trim();
  if (!/^[A-Za-z0-9_]{3,24}$/.test(trimmed)) {
    throw new Error('Handle must be 3–24 letters, numbers or underscores');
  }
  return trimmed;
}

function validatePassword(password: string): void {
  if (password.length < 8 || password.length > 200) {
    throw new Error('Password must be 8–200 characters');
  }
}

async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO pocket_sessions(token_hash, user_id, expires_at) VALUES($1,$2,$3)',
    [hashToken(token), userId, expires]
  );
  return token;
}

export async function register(handleInput: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const handle = validateHandle(handleInput);
  validatePassword(password);
  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  try {
    await pool.query(
      'INSERT INTO pocket_users(id, handle, handle_lower, password_hash) VALUES($1,$2,$3,$4)',
      [id, handle, handle.toLowerCase(), passwordHash]
    );
  } catch (error) {
    if ((error as { code?: string }).code === '23505') throw new Error('Handle already taken');
    throw error;
  }
  const token = await createSession(id);
  return { user: Object.freeze({ id, handle }), token };
}

export async function login(handleInput: string, password: string): Promise<{ user: AuthUser; token: string }> {
  const handle = validateHandle(handleInput);
  validatePassword(password);
  const result = await pool.query(
    'SELECT id, handle, password_hash FROM pocket_users WHERE handle_lower=$1',
    [handle.toLowerCase()]
  );
  const row = result.rows[0] as { id: string; handle: string; password_hash: string } | undefined;
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new Error('Invalid handle or password');
  }
  const token = await createSession(row.id);
  return { user: Object.freeze({ id: row.id, handle: row.handle }), token };
}

export async function userFromToken(token: string | undefined): Promise<AuthUser | undefined> {
  if (!token) return undefined;
  const result = await pool.query(
    `SELECT u.id, u.handle
       FROM pocket_sessions s
       JOIN pocket_users u ON u.id=s.user_id
      WHERE s.token_hash=$1 AND s.expires_at > now()`,
    [hashToken(token)]
  );
  const row = result.rows[0] as AuthUser | undefined;
  return row ? Object.freeze({ id: row.id, handle: row.handle }) : undefined;
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await pool.query('DELETE FROM pocket_sessions WHERE token_hash=$1', [hashToken(token)]);
}

export async function userFromRequest(req: IncomingMessage): Promise<AuthUser | undefined> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return userFromToken(header.slice(7));
}

export function issueSocketTicket(userId: string): string {
  const ticket = randomBytes(24).toString('base64url');
  const now = Date.now();
  for (const [key, value] of socketTickets) {
    if (value.expires <= now) socketTickets.delete(key);
  }
  socketTickets.set(ticket, { userId, expires: now + 60_000 });
  return ticket;
}

export function consumeSocketTicket(ticket: string | undefined): string | undefined {
  if (!ticket) return undefined;
  const value = socketTickets.get(ticket);
  socketTickets.delete(ticket);
  if (!value || value.expires < Date.now()) return undefined;
  return value.userId;
}
