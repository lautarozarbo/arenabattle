import { supabase } from './supabase.js';
import { getAllPowerMetas } from './powers/registry.js';

export async function openUserProfile(userId) {
  const modal = document.getElementById('user-profile-modal');
  const content = document.getElementById('user-profile-content');
  modal.classList.remove('hidden');
  content.innerHTML = '<div class="up-loading">Cargando...</div>';

  const [{ data: profile }, { data: stats }] = await Promise.all([
    supabase.from('profiles').select('username').eq('user_id', userId).single(),
    supabase.from('user_stats').select('*').eq('user_id', userId).single(),
  ]);

  if (!profile) {
    content.innerHTML = '<div class="up-loading">Perfil no encontrado.</div>';
    return;
  }

  const s = stats ?? {};
  const wins   = s.wins          ?? { quick1v1: 0, quick2v2: 0, league: 0, tournament: 0 };
  const losses = s.losses        ?? { quick1v1: 0, quick2v2: 0, league: 0, tournament: 0 };
  const draws  = s.draws         ?? { quick1v1: 0, quick2v2: 0, league: 0, tournament: 0 };
  const champs = s.championships ?? { league: 0, tournament: 0 };
  const charUses = s.char_uses   ?? {};

  const totalW = Object.values(wins).reduce((a, b) => a + b, 0);
  const totalL = Object.values(losses).reduce((a, b) => a + b, 0);
  const totalD = Object.values(draws).reduce((a, b) => a + b, 0);
  const totalG = totalW + totalL + totalD;
  const winRate = totalG > 0 ? Math.round((totalW / totalG) * 100) : 0;

  const metas = getAllPowerMetas();
  let bestId = null, bestCount = 0;
  for (const [id, count] of Object.entries(charUses)) {
    if (count > bestCount) { bestCount = count; bestId = id; }
  }
  const mostUsed = bestId ? metas.find(m => m.id === bestId) ?? null : null;

  const favHtml = mostUsed
    ? `<div class="up-fav-card">
        <div class="up-fav-circle" style="background:${mostUsed.color}">${mostUsed.icon}</div>
        <div class="up-fav-info">
          <span class="up-fav-name" style="color:${mostUsed.color}">${mostUsed.name}</span>
          <span class="up-fav-sub">${bestCount} partida${bestCount !== 1 ? 's' : ''}</span>
        </div>
      </div>`
    : `<div class="up-fav-empty">Sin partidas registradas</div>`;

  content.innerHTML = `
    <div class="up-username">${_esc(profile.username)}</div>

    <div class="up-section-label">Resumen</div>
    <div class="up-grid">
      <div class="up-card"><span class="up-val">${totalG}</span><span class="up-lbl">Jugadas</span></div>
      <div class="up-card"><span class="up-val up-val--win">${totalW}</span><span class="up-lbl">Victorias</span></div>
      <div class="up-card"><span class="up-val up-val--loss">${totalL}</span><span class="up-lbl">Derrotas</span></div>
      <div class="up-card"><span class="up-val">${winRate}%</span><span class="up-lbl">Win rate</span></div>
    </div>

    <div class="up-section-label">Victorias por modo</div>
    <div class="up-grid">
      <div class="up-card"><span class="up-val">${wins.quick1v1}</span><span class="up-lbl">1 vs 1</span></div>
      <div class="up-card"><span class="up-val">${wins.quick2v2}</span><span class="up-lbl">2 vs 2</span></div>
      <div class="up-card"><span class="up-val">${wins.league}</span><span class="up-lbl">Liga</span></div>
      <div class="up-card"><span class="up-val">${wins.tournament}</span><span class="up-lbl">Torneo</span></div>
    </div>

    <div class="up-section-label">Campeonatos</div>
    <div class="up-champ-row">
      <div class="up-champ-card">
        <span class="up-champ-trophy">🏆</span>
        <div class="up-champ-info">
          <span class="up-champ-val">${champs.league}</span>
          <span class="up-champ-lbl">Ligas ganadas</span>
        </div>
      </div>
      <div class="up-champ-card">
        <span class="up-champ-trophy">🏆</span>
        <div class="up-champ-info">
          <span class="up-champ-val">${champs.tournament}</span>
          <span class="up-champ-lbl">Torneos ganados</span>
        </div>
      </div>
    </div>

    <div class="up-section-label">Personaje más usado</div>
    ${favHtml}
  `;
}

function _esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
