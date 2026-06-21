-- Cross-device save for league and tournament in-progress sessions
alter table user_stats
  add column if not exists league_saved     jsonb default null,
  add column if not exists tournament_saved jsonb default null;
