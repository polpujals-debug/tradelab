-- Bucket per a les captures. És públic de lectura perquè les imatges es
-- puguin mostrar amb <img>; els noms són UUID aleatoris i no es poden llistar
-- sense la service role. Només el servidor hi pot escriure.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
