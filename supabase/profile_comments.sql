-- Tabla de comentarios en perfiles de usuario
create table if not exists profile_comments (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references auth.users(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  content     text not null check (char_length(content) <= 200 and char_length(content) > 0),
  created_at  timestamptz not null default now()
);

-- Índice para cargar comentarios de un perfil rápido
create index if not exists profile_comments_profile_id_idx
  on profile_comments (profile_id, created_at desc);

-- RLS
alter table profile_comments enable row level security;

-- Cualquiera autenticado puede leer comentarios
create policy "Leer comentarios"
  on profile_comments for select
  using (auth.role() = 'authenticated');

-- Cualquiera autenticado puede postear
create policy "Postear comentario"
  on profile_comments for insert
  with check (auth.uid() = author_id);

-- Solo el autor o el dueño del perfil puede eliminar
create policy "Eliminar comentario"
  on profile_comments for delete
  using (auth.uid() = author_id or auth.uid() = profile_id);
