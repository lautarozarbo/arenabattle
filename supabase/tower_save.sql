-- Cross-device save for tower best run (tower_saved_run already exists)
alter table user_stats
  add column if not exists tower_best_run jsonb default null;
