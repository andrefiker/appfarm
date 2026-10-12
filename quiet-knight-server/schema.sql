CREATE TABLE IF NOT EXISTS qk_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS qk_players(
 id uuid PRIMARY KEY,
 handle text NOT NULL CHECK(handle ~ '^[A-Za-z0-9_-]{3,20}$'),
 normalized_handle text NOT NULL UNIQUE CHECK(normalized_handle=lower(handle)),
 credential_hash text NOT NULL UNIQUE CHECK(length(credential_hash)=64),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 quiet_points integer NOT NULL DEFAULT 0 CHECK(quiet_points>=0),
 scored_games integer NOT NULL DEFAULT 0 CHECK(scored_games>=0),
 wins integer NOT NULL DEFAULT 0, draws integer NOT NULL DEFAULT 0, losses integer NOT NULL DEFAULT 0,
 current_win_streak integer NOT NULL DEFAULT 0, best_win_streak integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS qk_games(
 id uuid PRIMARY KEY, room_code text NOT NULL, game_number integer NOT NULL CHECK(game_number>0),
 white_player_id uuid REFERENCES qk_players(id), black_player_id uuid REFERENCES qk_players(id),
 white_handle text NOT NULL, black_handle text NOT NULL,
 result text NOT NULL CHECK(result IN ('1-0','0-1','1/2-1/2')),
 ended_reason text NOT NULL CHECK(ended_reason IN ('checkmate','draw','resigned')),
 final_fen text NOT NULL, pgn text NOT NULL, moves jsonb NOT NULL,
 started_at timestamptz NOT NULL, ended_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 scored boolean NOT NULL, score_reason text NOT NULL,
 white_points integer NOT NULL CHECK(white_points IN (0,1,3)), black_points integer NOT NULL CHECK(black_points IN (0,1,3)),
 review jsonb, UNIQUE(room_code,game_number)
);
CREATE INDEX IF NOT EXISTS qk_games_pair_time ON qk_games(LEAST(white_player_id,black_player_id),GREATEST(white_player_id,black_player_id),ended_at DESC) WHERE scored;
CREATE INDEX IF NOT EXISTS qk_games_white_recent ON qk_games(white_player_id,ended_at DESC);
CREATE INDEX IF NOT EXISTS qk_games_black_recent ON qk_games(black_player_id,ended_at DESC);
CREATE TABLE IF NOT EXISTS qk_push_subscriptions(
 id uuid PRIMARY KEY,
 player_id uuid REFERENCES qk_players(id) ON DELETE SET NULL,
 room_code text NOT NULL,
 seat_identity_digest text NOT NULL CHECK(length(seat_identity_digest)=64),
 endpoint text NOT NULL UNIQUE,
 p256dh text NOT NULL,
 auth text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 last_success_at timestamptz,
 expires_at timestamptz,
 disabled_at timestamptz
);
CREATE INDEX IF NOT EXISTS qk_push_room_seat ON qk_push_subscriptions(room_code,seat_identity_digest) WHERE disabled_at IS NULL;
CREATE TABLE IF NOT EXISTS qk_push_events(
 event_id text PRIMARY KEY,
 event_kind text NOT NULL CHECK(event_kind IN ('move','nudge')),
 room_code text NOT NULL,
 game_number integer NOT NULL CHECK(game_number>0),
 room_version integer NOT NULL CHECK(room_version>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qk_push_events_created ON qk_push_events(created_at);
INSERT INTO qk_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
INSERT INTO qk_migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM qk_migrations WHERE version=3) THEN
  ALTER TABLE qk_games DROP CONSTRAINT qk_games_ended_reason_check;
  ALTER TABLE qk_games ADD CONSTRAINT qk_games_ended_reason_check CHECK(ended_reason IN ('checkmate','draw','resigned','timeout','timeout_draw'));
  INSERT INTO qk_migrations(version) VALUES(3);
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM qk_migrations WHERE version=4) THEN
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS password_hash text;
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS recovery_code_hash text;
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS registered_at timestamptz;
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS human_games integer NOT NULL DEFAULT 0 CHECK(human_games>=0);
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS human_wins integer NOT NULL DEFAULT 0 CHECK(human_wins>=0);
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS human_draws integer NOT NULL DEFAULT 0 CHECK(human_draws>=0);
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS human_losses integer NOT NULL DEFAULT 0 CHECK(human_losses>=0);
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS computer_games integer NOT NULL DEFAULT 0 CHECK(computer_games>=0);
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS computer_wins integer NOT NULL DEFAULT 0 CHECK(computer_wins>=0);
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS computer_draws integer NOT NULL DEFAULT 0 CHECK(computer_draws>=0);
  ALTER TABLE qk_players ADD COLUMN IF NOT EXISTS computer_losses integer NOT NULL DEFAULT 0 CHECK(computer_losses>=0);
  UPDATE qk_players p SET human_games=(SELECT count(*) FROM qk_games g WHERE p.id IN(g.white_player_id,g.black_player_id)),
   human_wins=(SELECT count(*) FROM qk_games g WHERE (g.white_player_id=p.id AND g.result='1-0') OR (g.black_player_id=p.id AND g.result='0-1')),
   human_draws=(SELECT count(*) FROM qk_games g WHERE p.id IN(g.white_player_id,g.black_player_id) AND g.result='1/2-1/2'),
   human_losses=(SELECT count(*) FROM qk_games g WHERE (g.white_player_id=p.id AND g.result='0-1') OR (g.black_player_id=p.id AND g.result='1-0'));
  CREATE TABLE IF NOT EXISTS qk_identity_sessions(
   id uuid PRIMARY KEY,
   player_id uuid NOT NULL REFERENCES qk_players(id) ON DELETE CASCADE,
   token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
   created_at timestamptz NOT NULL DEFAULT now(),
   expires_at timestamptz NOT NULL,
   revoked_at timestamptz
  );
  CREATE INDEX IF NOT EXISTS qk_identity_sessions_player ON qk_identity_sessions(player_id,expires_at DESC) WHERE revoked_at IS NULL;
  CREATE TABLE IF NOT EXISTS qk_computer_games(
   id uuid PRIMARY KEY,
   player_id uuid NOT NULL REFERENCES qk_players(id),
   client_game_id uuid NOT NULL,
   human_color char(1) NOT NULL CHECK(human_color IN ('w','b')),
   result text NOT NULL CHECK(result IN ('1-0','0-1','1/2-1/2')),
   final_fen text NOT NULL, pgn text NOT NULL, moves jsonb NOT NULL,
   level integer NOT NULL CHECK(level BETWEEN 1 AND 10),
   ended_at timestamptz NOT NULL DEFAULT now(),
   UNIQUE(player_id,client_game_id)
  );
  CREATE INDEX IF NOT EXISTS qk_computer_games_player_recent ON qk_computer_games(player_id,ended_at DESC);
  INSERT INTO qk_migrations(version) VALUES(4);
 END IF;
END $$;
