INSERT INTO qk_players(id,handle,normalized_handle,credential_hash,quiet_points,scored_games,wins,draws,losses)
VALUES
 ('11111111-1111-4111-8111-111111111111','BackupAlice','backupalice',repeat('a',64),4,2,1,1,0),
 ('22222222-2222-4222-8222-222222222222','BackupBob','backupbob',repeat('b',64),1,2,0,1,1);
INSERT INTO qk_games(id,room_code,game_number,white_player_id,black_player_id,white_handle,black_handle,result,ended_reason,final_fen,pgn,moves,started_at,ended_at,scored,score_reason,white_points,black_points)
VALUES
 ('33333333-3333-4333-8333-333333333333','BACKUP',1,'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','BackupAlice','BackupBob','1-0','resigned','synthetic','','[]',now(),now(),true,'synthetic',3,0),
 ('44444444-4444-4444-8444-444444444444','BACKUP',2,'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','BackupAlice','BackupBob','1/2-1/2','draw','synthetic','','[]',now(),now(),true,'synthetic',1,1);
