-- Mission progress and active badge stored per user
alter table user_stats
  add column if not exists missions_progress jsonb default null;
