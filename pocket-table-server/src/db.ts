import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
});

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pocket_users (
      id text PRIMARY KEY,
      handle text NOT NULL,
      handle_lower text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pocket_sessions (
      token_hash text PRIMARY KEY,
      user_id text NOT NULL REFERENCES pocket_users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pocket_rooms (
      id text PRIMARY KEY,
      code text NOT NULL UNIQUE,
      host_user_id text NOT NULL REFERENCES pocket_users(id) ON DELETE CASCADE,
      variant text NOT NULL,
      seats integer NOT NULL CHECK (seats BETWEEN 2 AND 5),
      starting_stack integer NOT NULL,
      bot_level integer NOT NULL CHECK (bot_level BETWEEN 1 AND 3),
      bot_mix text NOT NULL,
      fill_bots boolean NOT NULL DEFAULT false,
      hand_seed integer NOT NULL,
      state_json jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pocket_room_members (
      room_id text NOT NULL REFERENCES pocket_rooms(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES pocket_users(id) ON DELETE CASCADE,
      seat integer NOT NULL CHECK (seat BETWEEN 0 AND 4),
      joined_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (room_id, user_id),
      UNIQUE (room_id, seat)
    )
  `);
  await pool.query('DELETE FROM pocket_sessions WHERE expires_at < now()');
}
