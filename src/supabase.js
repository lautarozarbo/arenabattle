import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(
  'https://cmyvnhtmnucbbishhapq.supabase.co',
  'sb_publishable__AIIQTQLM9Tlxel7nskkwA_r5XD2JTM'
);

export function getUser() {
  return supabase.auth.getUser().then(({ data }) => data.user);
}
