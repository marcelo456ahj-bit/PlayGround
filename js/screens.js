import { fmt, money, moneyShort, escapeHtml } from './util.js';
import {
  GAME_VERSION, LEAGUES, FORMATIONS, STADIUMS, UNLOCKABLES, DEFAULT_SETTINGS,
  allClubTeams, leagueTeams, nationalTeams, classicTeams, competitionsFor,
  stadiumById, teamOverall, teamRatingStars, isStadiumUnlocked, isTeamUnlocked
} from './data.js';
import { page, esc, crest, crestMini, teamBadge, empty, bar, stars, UI } from './ui.js';

export const DIFF_NAMES = { 1: 'Amador', 2: 'Regular', 3: 'Profissional', 4: 'Lenda' };
export const CAMERA_NAMES = { dynamic: 'Dinâmica', tv: 'TV', close: 'Perto', wide: 'Ampla' };
export const WEATHER_NAMES = { auto: 'Automático', clear: 'Céu limpo', day: 'Dia', night: 'Noite', cloudy: 'Nublado', rain: 'Chuva', snow: 'Neve' };
export const POSITIONS = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'ATA'];

export function pillClass(pos) {
  const g = pos === 'GOL' ? 'gk' : ['ZAG', 'LAT'].includes(pos) ? 'def' : ['VOL', 'MEI'].includes(pos) ? 'mid' : 'att';
  return `pill ${g}`;
}
export function ratingClass(v) { return v >= 85 ? 'gold' : v >= 75 ? 'cyan' : v >= 65 ? 'green' : ''; }
export function overallColor(v) { return v >= 85 ? 'var(--gold)' : v >= 75 ? 'var(--cyan)' : v >= 65 ? 'var(--green)' : 'var(--muted)'; }

export function computeOverall(pos, a) {
  const g = pos === 'GOL' ? 'GOL' : ['ZAG', 'LAT'].includes(pos) ? 'DEF' : ['VOL', 'MEI'].includes(pos) ? 'MEI' : 'ATA';
  const w = g === 'ATA' ? { pace: .2, shoot: .35, pass: .1, dribble: .2, defense: .02, physical: .08, gk: 0 }
    : g === 'MEI' ? { pace: .13, shoot: .14, pass: .3, dribble: .2, defense: .13, physical: .08, gk: 0 }
      : g === 'DEF' ? { pace: .15, shoot: .04, pass: .12, dribble: .06, defense: .35, physical: .26, gk: 0 }
        : { pace: .06, shoot: .03, pass: .08, dribble: .03, defense: .05, physical: .15, gk: .6 };
  if (g === 'GOL') return Math.round(clamp(a.gk * .82 + a.physical * .08 + a.pass * .05 + a.defense * .05, 40, 96));
  let ov = 0;
  for (const k in w) ov += (a[k] || 40) * w[k];
  return Math.round(clamp(ov, 40, 96));
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function teamCard(team, game, selected = false, action = 'pick-team') {
  const locked = !isTeamUnlocked(game.profile, team);
  return `<button class="team-card ${selected ? 'sel' : ''}" data-act="${action}" data-team="${team.id}">
    ${locked ? '<span class="tile-badge lock">BLOQUEADO</span>' : ''}
    ${crest(team, 44)}
    <b>${esc(team.name)}</b>
    <small>${esc(team.leagueName || team.country || '')}</small>
    <span class="pill ${ratingClass(teamOverall(team))}">${teamOverall(team)} OVR</span>
  </button>`;
}

export function menuScreen(g) {
  const p = g.profile;
  const next = g.nextCareerFixture();
  const modeLabel = g.competition && g.career ? (g.mode === 'master' ? 'MASTER LEAGUE' : g.mode === 'legend' ? 'BECOME A LEGEND' : 'COMPETIÇÃO') : '';
  const cards = [
    { nav: 'quick', icon: '⚽', title: 'Jogo Rápido', desc: 'Escolha os times e jogue agora' },
    { nav: 'competitions', icon: '🏆', title: 'Competições', desc: 'Ligas, copas e seleções' },
    { nav: 'master', icon: '📋', title: 'Master League', desc: 'Comande um clube por temporadas' },
    { nav: 'legend', icon: '🌟', title: 'Become a Legend', desc: 'Crie seu jogador e viva a carreira' },
    { nav: 'local', icon: '👥', title: 'Multiplayer Local', desc: 'Dois jogadores no mesmo aparelho' },
    { nav: 'training', icon: '🎯', title: 'Treino', desc: 'Aperfeiçoe chutes e pênaltis' },
    { nav: 'transfers', icon: '🔁', title: 'Transferências', desc: 'Contrate e venda jogadores' },
    { nav: 'editor', icon: '✏️', title: 'Editor', desc: 'Edite times, jogadores e uniformes' },
    { nav: 'store', icon: '🛒', title: 'Loja', desc: 'Desbloqueie estádios, lendas e estilos' },
    { nav: 'settings', icon: '⚙️', title: 'Configurações', desc: 'Áudio, câmera, dificuldade e mais' },
    { nav: 'saves', icon: '💾', title: 'Salvamentos', desc: 'Carregue ou apague seus saves' },
    { nav: 'credits', icon: 'ℹ️', title: 'Créditos', desc: 'Sobre o PES 2027 Stickman' }
  ];
  if (g.competition && g.career) cards.unshift({ act: 'continue-mode', icon: '▶️', title: 'Continuar', desc: modeLabel });
  const hero = next ? `
    <div class="hero-card">
      <div class="hero-tag">${esc(modeLabel || 'CARREIRA ATIVA')}</div>
      <div class="hero-team">
        ${crest(g.team(next.home), 64)}
        <div><b style="font-size:22px">${esc(g.team(next.home)?.name || '')}</b><small>vs ${esc(g.team(next.away)?.name || '')}</small></div>
      </div>
      <div class="hero-desc" style="margin-top:12px">${esc(g.competition?.name || '')} · ${esc(g.compMetaLabel())}</div>
      <div class="hero-facts">
        <div class="fact">CAIXA<b>${moneyShort(p.coins)}</b></div>
        <div class="fact">VITÓRIAS<b>${p.wins}</b></div>
        <div class="fact">GOLS<b>${p.goals}</b></div>
      </div>
      <button class="btn primary" data-act="open-match" style="margin-top:14px;width:100%">Jogar próxima partida</button>
    </div>` : `
    <div class="hero-card">
      <div class="hero-tag">PES 2027 · STICKMAN 2D</div>
      <div class="hero-title">O FUTEBOL<br><span>EM SUAS MÃOS</span></div>
      <div class="hero-desc">276 times, 20 competições, Master League, Become a Legend, transferências, editor e narração em português. Tudo em 2D, direto no seu celular ou tablet.</div>
      <div class="hero-facts">
        <div class="fact">TIMES<b>276</b></div>
        <div class="fact">JOGADORES<b>5.500+</b></div>
        <div class="fact">COMPETIÇÕES<b>20</b></div>
      </div>
      <button class="btn gold" data-nav="quick" style="margin-top:14px;width:100%">JOGAR AGORA</button>
    </div>`;
  return `
    <div class="screen menu-screen">
      <div class="screen-inner">
        <div class="main-head">
          <div class="brand">
            <div class="brand-ball"></div>
            <div class="brand-title">PES 2027<b>.</b><span>STICKMAN 2D</span></div>
          </div>
          <button class="profile-chip" data-nav="profile" style="border:1px solid var(--line)">
            <span class="avatar">${esc((p.name || 'J')[0].toUpperCase())}</span>
            <span><b>${esc(p.name)}</b><small>NÍVEL ${p.level} · ${p.coins} moedas</small></span>
          </button>
        </div>
        <div class="menu-main">
          <div class="menu-cards">
            ${cards.map(c => `<button class="menu-card" ${c.nav ? `data-nav="${c.nav}"` : `data-act="${c.act}"`}>
              <span class="menu-ico">${c.icon}</span><span><b>${esc(c.title)}</b><small>${esc(c.desc)}</small></span><span class="arrow">›</span>
            </button>`).join('')}
          </div>
          <div class="menu-hero">${hero}</div>
        </div>
        <div class="menu-foot">
          <span class="dot"></span><span>v${GAME_VERSION} · ${g.isTouch ? 'TOQUE' : 'TECLADO'} · PT-BR</span>
          <span class="right"><span>WASD/JKL · SETAS/1234</span><span>ESC PAUSA</span></span>
        </div>
      </div>
    </div>`;
}

export function quickScreen(g) {
  const q = g.quick;
  const tabs = [['clubs', 'Clubes'], ['nations', 'Seleções'], ['classics', 'Lendas']];
  let teams = [];
  if (q.tab === 'nations') teams = nationalTeams(g.world);
  else if (q.tab === 'classics') teams = classicTeams(g.world);
  else teams = leagueTeams(g.world, q.leagueId);
  teams = teams.slice().sort((a, b) => teamOverall(b) - teamOverall(a));
  const home = q.home ? g.team(q.home) : null;
  const away = q.away ? g.team(q.away) : null;
  const leagueChips = q.tab === 'clubs' ? `<div class="chip-row" style="margin-bottom:10px">${LEAGUES.map(l =>
    `<button class="chip ${q.leagueId === l.id ? 'sel' : ''}" data-act="quick-league" data-league="${l.id}">${l.flag} ${esc(l.name.replace('Brasileirão ', 'Brasil '))}</button>`).join('')}</div>` : '';
  const selectedPanel = (side, t) => `<button class="tile ${q.side === side ? 'sel' : ''}" data-act="quick-side" data-side="${side}" style="min-height:auto">
    <small>${side === 'home' ? 'TIME DA CASA' : 'TIME VISITANTE'}</small>
    <div class="team-badge">${t ? crestMini(t, 32) : '<span class="muted">—</span>'}<b>${t ? esc(t.name) : 'Escolha um time'}</b></div>
    ${t ? `<span class="tiny muted">${esc(t.leagueName || t.country)} · ${teamOverall(t)} OVR ${'★'.repeat(Math.round(teamRatingStars(t)))}</span>` : '<span class="tiny muted">Toque em um time abaixo</span>'}
  </button>`;
  const options = `
    <div class="panel">
      <div class="panel-title">OPÇÕES DA PARTIDA</div>
      <div class="field-row">
        <div class="field"><label>Dificuldade</label><select class="input" data-opt="difficulty">
          ${Object.entries(DIFF_NAMES).map(([v, n]) => `<option value="${v}" ${q.difficulty == v ? 'selected' : ''}>${n}</option>`).join('')}
        </select></div>
        <div class="field"><label>Tempo</label><select class="input" data-opt="time">
          <option value="180" ${q.time == 180 ? 'selected' : ''}>3 min</option>
          <option value="360" ${q.time == 360 ? 'selected' : ''}>6 min</option>
          <option value="600" ${q.time == 600 ? 'selected' : ''}>10 min</option>
        </select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Clima</label><select class="input" data-opt="weather">
          ${Object.entries(WEATHER_NAMES).map(([v, n]) => `<option value="${v}" ${q.weather === v ? 'selected' : ''}>${n}</option>`).join('')}
        </select></div>
        <div class="field"><label>Câmera</label><select class="input" data-opt="camera">
          ${Object.entries(CAMERA_NAMES).map(([v, n]) => `<option value="${v}" ${q.camera === v ? 'selected' : ''}>${n}</option>`).join('')}
        </select></div>
      </div>
      <div class="field"><label>Estádio</label><select class="input" data-opt="stadium">
        <option value="auto" ${q.stadium === 'auto' ? 'selected' : ''}>Estádio do mandante</option>
        ${STADIUMS.filter(s => isStadiumUnlocked(g.profile, s.id)).map(s => `<option value="${s.id}" ${q.stadium === s.id ? 'selected' : ''}>${esc(s.name)} · ${s.capacity.toLocaleString('pt-BR')}</option>`).join('')}
      </select></div>
      <label class="toggle" style="margin-top:8px"><input type="checkbox" data-opt="autoReplay" ${q.autoReplay ? 'checked' : ''}><i></i><span class="tiny">Replays automáticos</span></label>
    </div>`;
  return page({
    title: q.local ? 'Multiplayer Local' : 'Jogo Rápido',
    sub: q.local ? 'JOGADOR 1 x JOGADOR 2' : 'ESCOLHA OS TIMES',
    back: 'menu',
    body: `
      <div class="split">
        <div>
          <div class="grid cols-2" style="margin-bottom:10px">${selectedPanel('home', home)}${selectedPanel('away', away)}</div>
          <div class="tabs">${tabs.map(([v, n]) => `<button class="tab ${q.tab === v ? 'sel' : ''}" data-act="quick-tab" data-tab="${v}">${n}</button>`).join('')}</div>
          ${leagueChips}
          <div class="team-grid">${teams.map(t => teamCard(t, g, t.id === q.home || t.id === q.away)).join('')}</div>
        </div>
        <div>${options}
          <div class="panel">
            <div class="panel-title">DICA</div>
            <div class="tiny muted" style="line-height:1.6">Use o analógico para mover e correr. Segure CHUTE para carregar a força. DRIBLE muda de direção. CARRINHO desarma com risco de falta.</div>
          </div>
        </div>
      </div>`,
    foot: `<button class="btn ghost" data-act="random-quick">Aleatório</button>
      <button class="btn ghost" data-act="swap-quick">Inverter</button>
      <div class="spacer"></div>
      <button class="btn primary" data-act="start-quick" ${home && away ? '' : 'disabled'}>${q.local ? 'Jogar 1v1' : 'Entrar em campo'} ›</button>`
  });
}

export function settingsScreen(g) {
  const s = g.profile.settings;
  const slider = (key, label) => `<div class="slider-row"><span>${label}</span><input type="range" min="0" max="100" step="1" value="${Math.round((s[key] ?? 0) * 100)}" data-setting="${key}" data-scale="100" style="width:100%"><b id="set-${key}">${Math.round((s[key] ?? 0) * 100)}%</b></div>`;
  return page({
    title: 'Configurações',
    sub: 'AJUSTE SUA EXPERIÊNCIA',
    back: 'menu',
    body: `
      <div class="split">
        <div class="panel"><div class="panel-title">ÁUDIO</div>
          ${slider('music', 'Música')}
          ${slider('sfx', 'Efeitos')}
          ${slider('crowd', 'Torcida')}
          ${slider('commentary', 'Narração')}
          <label class="toggle" style="margin-top:8px"><input type="checkbox" data-setting="commentaryOn" ${s.commentaryOn ? 'checked' : ''}><i></i><span class="tiny">Narração em português</span></label>
        </div>
        <div class="panel"><div class="panel-title">JOGO</div>
          <div class="field"><label>Dificuldade</label><select class="input" data-setting="difficulty">${Object.entries(DIFF_NAMES).map(([v, n]) => `<option value="${v}" ${s.difficulty == v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label>Câmera padrão</label><select class="input" data-setting="camera">${Object.entries(CAMERA_NAMES).map(([v, n]) => `<option value="${v}" ${s.camera === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label>Clima padrão</label><select class="input" data-setting="weather">${Object.entries(WEATHER_NAMES).map(([v, n]) => `<option value="${v}" ${s.weather === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label>Tempo de partida</label><select class="input" data-setting="time"><option value="180" ${s.time == 180 ? 'selected' : ''}>3 minutos</option><option value="360" ${s.time == 360 ? 'selected' : ''}>6 minutos</option><option value="600" ${s.time == 600 ? 'selected' : ''}>10 minutos</option></select></div>
        </div>
      </div>
      <div class="split" style="margin-top:12px">
        <div class="panel"><div class="panel-title">GRÁFICOS E CONTROLES</div>
          <div class="field"><label>Qualidade</label><select class="input" data-setting="quality">${['auto', 'low', 'medium', 'high'].map(v => `<option value="${v}" ${s.quality === v ? 'selected' : ''}>${v === 'auto' ? 'Automática' : v === 'low' ? 'Baixa' : v === 'medium' ? 'Média' : 'Alta'}</option>`).join('')}</select></div>
          <label class="toggle" style="margin-bottom:9px"><input type="checkbox" data-setting="tilt" ${s.tilt ? 'checked' : ''}><i></i><span class="tiny">Inclinação (giroscópio)</span></label>
          <label class="toggle" style="margin-bottom:9px"><input type="checkbox" data-setting="haptics" ${s.haptics ? 'checked' : ''}><i></i><span class="tiny">Vibração</span></label>
          <label class="toggle" style="margin-bottom:9px"><input type="checkbox" data-setting="autoReplay" ${s.autoReplay ? 'checked' : ''}><i></i><span class="tiny">Replays automáticos</span></label>
          <label class="toggle"><input type="checkbox" data-setting="forceTouch" ${s.forceTouch ? 'checked' : ''}><i></i><span class="tiny">Mostrar controles de toque</span></label>
          <button class="btn small ghost" data-act="settings-tilt" style="margin-top:10px">Ativar inclinação neste aparelho</button>
        </div>
        <div class="panel"><div class="panel-title">DADOS</div>
          <div class="tiny muted" style="line-height:1.7">Perfil: ${esc(g.profile.name)} · Nível ${g.profile.level}<br>Partidas: ${g.profile.matches} · Vitórias: ${g.profile.wins}<br>Save automático ativo no slot ${g.profile.slot + 1}.</div>
          <div class="btn-row" style="margin-top:10px"><button class="btn small ghost" data-nav="saves">Salvamentos</button><button class="btn small ghost" data-act="save-now">Salvar agora</button><button class="btn small danger" data-act="reset-settings">Restaurar padrões</button></div>
        </div>
      </div>`
  });
}

export function storeScreen(g) {
  const p = g.profile;
  return page({
    title: 'Loja',
    sub: `SALDO: ${p.coins} MOEDAS`,
    back: 'menu',
    body: `<div class="grid cols-2">${UNLOCKABLES.map(item => {
      const owned = (p.unlocked || []).includes(item.id);
      return `<div class="row"><span style="font-size:22px;width:32px;text-align:center">${item.icon}</span><div class="grow"><b>${esc(item.name)}</b><small>${esc(item.desc)}</small></div><span class="pill ${owned ? 'mid' : 'gold'}">${owned ? 'ADQUIRIDO' : item.price + ' 🪙'}</span>${owned ? '' : `<button class="btn xs ${p.coins >= item.price ? 'gold' : ''}" data-act="buy-item" data-id="${item.id}" ${p.coins >= item.price ? '' : 'disabled'}>Comprar</button>`}</div>`;
    }).join('')}</div>`
  });
}

export function editorScreen(g) {
  const teams = allClubTeams(g.world).slice().sort((a, b) => a.name.localeCompare(b.name));
  return page({
    title: 'Editor',
    sub: 'TIMES E JOGADORES',
    back: 'menu',
    body: `<div class="panel"><div class="panel-title">ESCOLHA UM TIME</div><div class="team-grid">${teams.map(t => `<button class="team-card" data-act="open-team-editor" data-team="${t.id}">${crest(t, 40)}<b>${esc(t.name)}</b><small>${t.players.length} jogadores</small></button>`).join('')}</div></div>`
  });
}

export function editorTeamScreen(g) {
  const team = g.team(g.editorTeamId);
  if (!team) return editorScreen(g);
  const players = team.players.slice().sort((a, b) => b.overall - a.overall);
  return page({
    title: team.name,
    sub: 'EDITOR DE TIME',
    back: 'editor',
    body: `
      <div class="panel"><div class="panel-title">IDENTIDADE</div>
        <div class="field-row"><div class="field"><label>Nome do time</label><input class="input" id="editor-team-name" value="${esc(team.name)}" maxlength="30"></div>
        <div class="field"><label>Formação</label><select class="input" id="editor-formation">${Object.keys(FORMATIONS).map(f => `<option value="${f}" ${team.formation === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div></div>
        <div class="field"><label>Estádio</label><select class="input" id="editor-stadium">${STADIUMS.map(s => `<option value="${s.id}" ${team.stadiumId === s.id ? 'selected' : ''}>${esc(s.name)}${isStadiumUnlocked(g.profile, s.id) ? '' : ' (bloqueado)'}</option>`).join('')}</select></div>
        <div class="field-row"><div class="field"><label>Cor primária</label><input class="input" type="color" id="editor-color1" value="${team.colors.primary}" style="padding:3px;height:40px"></div>
        <div class="field"><label>Cor secundária</label><input class="input" type="color" id="editor-color2" value="${team.colors.secondary}" style="padding:3px;height:40px"></div>
        <div class="field"><label>Cor de destaque</label><input class="input" type="color" id="editor-color3" value="${team.colors.accent}" style="padding:3px;height:40px"></div></div>
        <button class="btn primary small" data-act="save-team" style="margin-top:8px">Salvar alterações</button>
      </div>
      <div class="panel"><div class="panel-title">JOGADORES</div><div class="list" style="max-height:430px;overflow:auto">${players.map(p => `<div class="row"><span class="ovr" style="color:${overallColor(p.overall)}">${p.overall}</span><div class="grow"><b>${esc(p.name)}</b><small>${p.pos} · ${p.age} anos · ${p.nat}</small></div><button class="btn xs ghost" data-act="edit-player" data-player="${p.id}">Editar</button></div>`).join('')}</div></div>`
  });
}

export function profileScreen(g) {
  const p = g.profile;
  const favTeams = allClubTeams(g.world).sort((a, b) => a.name.localeCompare(b.name));
  const trophies = (p.trophies || []).slice(-8).reverse();
  return page({
    title: 'Perfil',
    sub: `NÍVEL ${p.level} · ${p.xp} XP`,
    back: 'menu',
    body: `
      <div class="split">
        <div class="panel"><div class="hero-team"><span class="avatar" style="width:64px;height:64px;font-size:26px">${esc((p.name || 'J')[0].toUpperCase())}</span><div><h2>${esc(p.name)}</h2><small>${p.coins} moedas · ${(p.unlocked || []).length} itens desbloqueados</small></div></div>
          <div class="hero-facts"><div class="fact">PARTIDAS<b>${p.matches}</b></div><div class="fact">VITÓRIAS<b>${p.wins}</b></div><div class="fact">EMPATES<b>${p.draws}</b></div><div class="fact">DERROTAS<b>${p.losses}</b></div><div class="fact">GOLS<b>${p.goals}</b></div></div>
          <div class="field" style="margin-top:12px"><label>Nome</label><input class="input" id="profile-name" value="${esc(p.name)}" maxlength="24"></div>
          <div class="field"><label>Time favorito</label><select class="input" id="profile-fav"><option value="">Nenhum</option>${favTeams.map(t => `<option value="${t.id}" ${p.favoriteTeam === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
          <button class="btn primary small" data-act="profile-save">Salvar perfil</button>
        </div>
        <div class="panel"><div class="panel-title">TROFÉUS</div>${trophies.length ? `<div class="list">${trophies.map(t => `<div class="row"><span class="medal" style="width:28px;height:28px">🏆</span><div class="grow"><b>${esc(t.name)}</b><small>Temporada ${t.season}</small></div></div>`).join('')}</div>` : empty('Nenhum troféu ainda')}
          <div class="panel-title" style="margin-top:14px">CONQUISTAS</div><div class="tiny muted">${p.wins >= 1 ? 'Primeira vitória ✓' : 'Primeira vitória —'} · ${p.goals >= 10 ? 'Artilheiro ✓' : 'Artilheiro —'} · ${(p.trophies || []).length ? 'Campeão ✓' : 'Campeão —'}</div>
          <button class="btn small danger" data-act="profile-reset" style="margin-top:12px">Apagar progresso</button>
        </div>
      </div>`
  });
}

export function savesScreen(g, slots) {
  return page({
    title: 'Salvamentos',
    sub: 'SLOTS DE SAVE',
    back: 'menu',
    body: `<div class="list">${slots.map(s => `<div class="row">
      <span class="ovr" style="font-size:12px">${s.slot + 1}</span>
      <div class="grow"><b>${s.empty ? 'Slot vazio' : esc(s.meta?.name || 'Salvamento')}</b><small>${s.empty ? 'Sem dados' : `${esc(s.meta?.mode || '')} · ${esc(s.meta?.team || '')} · ${new Date(s.updatedAt).toLocaleString('pt-BR')}`}</small></div>
      ${!s.empty ? `<button class="btn xs primary" data-act="load-slot" data-slot="${s.slot}">Carregar</button><button class="btn xs danger" data-act="delete-slot" data-slot="${s.slot}">Apagar</button>` : `<button class="btn xs ghost" data-act="save-slot" data-slot="${s.slot}">Usar slot</button>`}
    </div>`).join('')}</div>
    <div class="panel" style="margin-top:12px"><div class="panel-title">SALVAR AGORA</div><div class="tiny muted">O jogo salva automaticamente após partidas, transferências e edições. Slot atual: ${g.profile.slot + 1}.</div><button class="btn primary small" data-act="save-now" style="margin-top:10px">Salvar no slot ${g.profile.slot + 1}</button></div>`
  });
}

export function creditsScreen() {
  return page({
    title: 'Créditos',
    sub: 'PES 2027 STICKMAN 2D',
    back: 'menu',
    body: `<div class="panel"><div class="panel-title">SOBRE O JOGO</div><div class="tiny muted" style="line-height:1.75">
      PES 2027 Stickman 2D é um jogo de futebol arcade 2D feito em HTML5 Canvas, com times, ligas, copas, carreiras e narração em português brasileiro.<br><br>
      Programação, design e áudio procedural: equipe PlayGround.<br>
      Inspirado nos clássicos jogos de futebol arcade.<br><br>
      Todos os times e jogadores são fictícios ou utilizados como referência de gênero. Nenhuma afiliação oficial.
    </div></div>
    <div class="panel"><div class="panel-title">CONTROLES</div><div class="tiny muted" style="line-height:1.8">
      Toque: analógico esquerdo · PASSE · CHUTE (segure) · DRIBLE · CARRINHO<br>
      Teclado P1: WASD + J/K/L/H + Shift<br>
      Teclado P2: Setas + 1/2/3/4 + 5<br>
      Pausa: ESC ou P
    </div></div>`
  });
}
