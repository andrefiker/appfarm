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
INSERT INTO qk_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
