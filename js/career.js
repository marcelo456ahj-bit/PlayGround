(function () {
  'use strict';

  const PES = window.PES;
  const AU = window.PESAudio;
  const G = window.PESGame;
  if (!PES || !G) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = PES.clamp;
  const team = (id) => PES.getTeam(id);
  const $ = (id) => document.getElementById(id);
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  };

  const POSITIONS = ['ST', 'AM', 'LW', 'RW', 'CM', 'DM', 'LB', 'RB', 'CB', 'GK'];

  function leagueRounds(leagueId) {
    const league = PES.getLeague(leagueId);
    const ids = league ? league.teams.map(t => t.id) : PES.teams.filter(t => !t.isNational).slice(0, 18).map(t => t.id);
    return G.roundRobin(ids);
  }

  function targetsFor(club) {
    const league = PES.getLeague(club.leagueId);
    if (!league) return 10;
    const rank = league.teams.slice().sort((a, b) => b.rating - a.rating).findIndex(t => t.id === club.id) + 1;
    if (rank <= 2) return 1;
    if (rank <= 5) return 4;
    if (rank <= 10) return 8;
    return 14;
  }

  function avgRating(stats) {
    return stats && stats.apps ? (stats.ratingSum / stats.apps) : 0;
  }

  function fixtureFor(state, clubId) {
    if (!state || !state.rounds || state.round >= state.rounds.length) return null;
    const round = state.rounds[state.round];
    if (!round) return null;
    const idx = round.findIndex(t => !t.played && (t.home === clubId || t.away === clubId));
    if (idx < 0) return null;
    const tie = round[idx];
    const home = tie.home === clubId;
    return { tie, roundIndex: state.round, tieIndex: idx, home, opponent: home ? tie.away : tie.home };
  }

  function updateRecord(c, ug, og) {
    if (!c.record) c.record = { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    c.record.gf += ug; c.record.ga += og;
    if (ug > og) { c.record.w++; c.record.pts += 3; }
    else if (ug === og) { c.record.d++; c.record.pts++; }
    else c.record.l++;
  }

  function simulateRestOfRound(G, state, exclude) {
    const round = state.rounds[state.round];
    if (!round) return;
    round.forEach(t => {
      if (t === exclude || t.played) return;
      const r = G.simTie(t.home, t.away, false);
      t.played = true; t.hg = r.sa; t.ag = r.sb;
    });
  }

  Object.assign(G, {
    nextCareerMatch() {
      if (this.save.career) {
        const c = this.save.career;
        const fx = fixtureFor(c, c.clubId);
        if (!fx) return null;
        const opp = team(fx.opponent);
        if (!opp) return null;
        return {
          team: opp, opponent: fx.opponent, home: fx.home,
          label: `${PES.getLeague(c.leagueId)?.name || 'Liga'} · Rodada ${c.round + 1}`,
          dateText: 'Hoje · 21:00'
        };
      }
      if (this.save.legend) {
        const l = this.save.legend;
        const fx = fixtureFor(l, l.clubId);
        if (!fx) return null;
        const opp = team(fx.opponent);
        if (!opp) return null;
        return {
          team: opp, opponent: fx.opponent, home: fx.home,
          label: `Rumo ao Estrelato · Rodada ${l.round + 1}`,
          dateText: 'Hoje · 21:00'
        };
      }
      return null;
    },

    /* ---------------- Master League ---------------- */
    startCareer(clubId) {
      const club = team(clubId);
      if (!club) return;
      const rounds = leagueRounds(club.leagueId);
      const pool = PES.getLeague(club.leagueId).teams.map(t => t.id);
      this.save.career = {
        clubId, leagueId: club.leagueId, season: 1, rounds, pool, round: 0,
        target: targetsFor(club), budget: 45 + Math.round((club.rating - 70) * 1.4),
        reputation: 55, board: 65, record: { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 },
        history: [], transfers: [], lastSeason: null, createdAt: Date.now()
      };
      this.save.legend = null;
      this.saveNow(true);
      this.go('master', {}, { replace: true });
      this.toast(`Carreira iniciada no ${club.name}`, 'good');
    },

    careerStandings() {
      const c = this.save.career;
      if (!c) return [];
      return this.tableOf(c);
    },

    finishCareerSeason(c) {
      const table = this.tableOf(c);
      const pos = table.findIndex(r => r.id === c.clubId) + 1;
      const champion = table[0]?.id;
      const league = PES.getLeague(c.leagueId);
      const met = pos > 0 && pos <= c.target;
      c.lastSeason = { season: c.season, pos, pts: table[pos - 1]?.pts || 0, champion, met, target: c.target };
      c.history.push({ season: c.season, pos, pts: table[pos - 1]?.pts || 0, champion });
      if (champion === c.clubId) {
        this.save.trophies.push({ name: league.name, club: team(c.clubId).name, compId: league.id, year: 2027 + c.season - 1, date: Date.now() });
        this.award(1800);
      } else this.award(350 + Math.max(0, 10 - pos) * 60);
      c.reputation = clamp(c.reputation + (met ? 7 : -5) + (pos <= 3 ? 4 : 0), 10, 99);
      c.board = clamp(c.board + (met ? 9 : -12), 0, 100);
      c.budget += met ? 18 + (20 - Math.min(20, pos)) : 6;
      c.season++;
      c.round = 0;
      c.rounds = leagueRounds(c.leagueId);
      c.record = { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
      c.target = targetsFor(team(c.clubId));
      this.toast(met ? `Objetivo cumprido! ${pos}º lugar.` : `Temporada encerrada em ${pos}º.`, met ? 'good' : 'bad');
    },

    applyCareerResult(res, meta) {
      const c = this.save.career;
      if (!c || !meta) return;
      const round = c.rounds[meta.roundIndex];
      const tie = round && round[meta.tieIndex !== undefined ? meta.tieIndex : meta.roundIndex];
      if (!tie) return;
      tie.played = true; tie.hg = res.homeScore; tie.ag = res.awayScore;
      const ug = tie.home === c.clubId ? tie.hg : tie.ag;
      const og = tie.home === c.clubId ? tie.ag : tie.hg;
      updateRecord(c, ug, og);
      simulateRestOfRound(this, c, tie);
      c.round = Math.max(c.round, meta.roundIndex + 1);
      c.budget += ug * .4 + (ug > og ? 1.4 : ug === og ? .5 : .2);
      c.board = clamp(c.board + (ug > og ? 3 : ug === og ? 0 : -3), 0, 100);
      if (c.round >= c.rounds.length) this.finishCareerSeason(c);
      this.saveNow(true);
    },

    careerSimRound() {
      const c = this.save.career;
      if (!c || c.round >= c.rounds.length) return;
      const fx = fixtureFor(c, c.clubId);
      const tie = fx ? fx.tie : null;
      c.rounds[c.round].forEach(t => {
        if (t.played) return;
        const r = this.simTie(t.home, t.away, false);
        t.played = true; t.hg = r.sa; t.ag = r.sb;
        if (t === tie) updateRecord(c, t.home === c.clubId ? t.hg : t.ag, t.home === c.clubId ? t.ag : t.hg);
      });
      c.round++;
      if (c.round >= c.rounds.length) this.finishCareerSeason(c);
      this.saveNow(true);
      this.render();
    },

    playCareerMatch() {
      const c = this.save.career;
      if (!c) return;
      const fx = fixtureFor(c, c.clubId);
      if (!fx) { this.toast('Nenhuma partida nesta rodada'); return; }
      const userHome = fx.home;
      this.startMatch({
        homeId: userHome ? c.clubId : fx.opponent,
        awayId: userHome ? fx.opponent : c.clubId,
        meta: {
          kind: 'career', label: `Master League · Rodada ${c.round + 1}`,
          userSide: userHome ? 'home' : 'away',
          roundIndex: fx.roundIndex, tieIndex: fx.tieIndex,
          continue: { screen: 'master' }, returnScreen: 'master'
        }
      });
    },

    /* ---------------- Legend ---------------- */
    createLegend(name, pos, clubId) {
      const club = team(clubId) || PES.teams[0];
      const id = 'legend-player';
      const player = {
        id, teamId: club.id, name: name || 'Craque', number: 10, pos: pos || 'ST',
        ovr: 68, age: 18, nationality: 'Brasil', growth: 4,
        pac: 74, sho: 71, pas: 66, dri: 76, def: 40, phy: 62, sta: 74,
        value: 0.8, wage: 0.1, form: 0, fitness: 100, morale: 85, injured: 0
      };
      const rounds = leagueRounds(club.leagueId);
      const pool = PES.getLeague(club.leagueId).teams.map(t => t.id);
      this.save.legend = {
        player, clubId: club.id, leagueId: club.leagueId, season: 1,
        rounds, pool, round: 0, reputation: 50, offers: [],
        stats: { apps: 0, goals: 0, assists: 0, ratingSum: 0, motm: 0 },
        totals: { apps: 0, goals: 0, assists: 0 },
        history: [], lastSeason: null, createdAt: Date.now()
      };
      this.save.career = null;
      this.saveNow(true);
      this.go('legend', {}, { replace: true });
      this.toast('Sua lenda começa agora', 'good');
    },

    buildLegendSquad(clubId) {
      const l = this.save.legend;
      const base = PES.getSquad(clubId);
      if (!l) return base;
      const player = Object.assign({}, l.player, { teamId: clubId });
      return [player].concat(base.filter(p => p.id !== player.id));
    },

    legendStandings() {
      const l = this.save.legend;
      return l ? this.tableOf(l) : [];
    },

    finishLegendSeason(l) {
      const table = this.tableOf(l);
      const pos = table.findIndex(r => r.id === l.clubId) + 1;
      const stats = l.stats;
      const avg = avgRating(stats);
      l.history.push({ season: l.season, pos, goals: stats.goals, assists: stats.assists, avg });
      l.totals.apps += stats.apps; l.totals.goals += stats.goals; l.totals.assists += stats.assists;
      let growth = stats.goals >= 18 ? 3 : stats.goals >= 10 ? 2 : stats.goals >= 4 ? 1 : 0;
      if (avg >= 7.6) growth++;
      l.player.ovr = clamp(l.player.ovr + growth, 68, 95);
      l.player.age++;
      l.player.sho = clamp(l.player.sho + Math.min(2, growth), 30, 97);
      l.player.dri = clamp(l.player.dri + Math.min(2, growth), 30, 97);
      l.player.pas = clamp(l.player.pas + (growth > 1 ? 1 : 0), 30, 97);
      l.reputation = clamp(l.reputation + stats.goals * 1.5 + stats.assists + (pos <= 4 ? 4 : 0), 10, 99);
      l.lastSeason = { season: l.season, pos, goals: stats.goals, assists: stats.assists, avg, growth };
      this.award(300 + stats.goals * 25 + stats.assists * 15);
      l.offers = this.makeLegendOffers(l);
      l.season++;
      l.round = 0;
      l.rounds = leagueRounds(l.leagueId);
      l.stats = { apps: 0, goals: 0, assists: 0, ratingSum: 0, motm: 0 };
      if (l.offers.length) this.toast('Você recebeu propostas de transferência!', 'good');
    },

    makeLegendOffers(l) {
      const club = team(l.clubId);
      const pool = PES.teams.filter(t => !t.isNational && t.id !== l.clubId && t.rating > club.rating + 1 && t.rating <= club.rating + 9 && t.rating <= 90);
      if (!pool.length) return [];
      const picked = shuffle(pool.slice()).slice(0, 3);
      return picked.map(t => ({
        clubId: t.id, wage: (l.player.ovr * .08).toFixed(1),
        fee: Math.max(2, ((l.player.ovr - 55) ** 2 * .35)).toFixed(1)
      }));
    },

    applyLegendResult(res, meta) {
      const l = this.save.legend;
      if (!l || !meta) return;
      const round = l.rounds[meta.roundIndex];
      const tie = round && round[meta.tieIndex];
      if (!tie) return;
      tie.played = true; tie.hg = res.homeScore; tie.ag = res.awayScore;
      const lp = (res.players || []).find(p => p.id === l.player.id);
      if (lp) {
        l.stats.apps++;
        l.stats.goals += lp.goals || 0;
        l.stats.assists += lp.assists || 0;
        l.stats.ratingSum += lp.rating || 6;
        if (res.mvp && res.mvp.id === lp.id) l.stats.motm++;
        l.reputation = clamp(l.reputation + (lp.goals || 0) * 2 + (lp.assists || 0) * 1.2 + ((lp.rating || 6) - 6.4) * .8, 10, 99);
      }
      simulateRestOfRound(this, l, tie);
      l.round = Math.max(l.round, meta.roundIndex + 1);
      if (l.round >= l.rounds.length) this.finishLegendSeason(l);
      this.saveNow(true);
    },

    legendSimRound() {
      const l = this.save.legend;
      if (!l || l.round >= l.rounds.length) return;
      const fx = fixtureFor(l, l.clubId);
      const userTie = fx ? fx.tie : null;
      l.rounds[l.round].forEach(t => {
        if (t.played) return;
        const r = this.simTie(t.home, t.away, false);
        t.played = true; t.hg = r.sa; t.ag = r.sb;
      });
      l.round++;
      if (l.round >= l.rounds.length) this.finishLegendSeason(l);
      this.saveNow(true);
      this.render();
    },

    playLegendMatch() {
      const l = this.save.legend;
      if (!l) return;
      const fx = fixtureFor(l, l.clubId);
      if (!fx) { this.toast('Nenhuma partida nesta rodada'); return; }
      const userHome = fx.home;
      const squad = this.buildLegendSquad(l.clubId);
      const squads = {};
      squads[userHome ? 'home' : 'away'] = squad;
      this.startMatch({
        homeId: userHome ? l.clubId : fx.opponent,
        awayId: userHome ? fx.opponent : l.clubId,
        squads,
        config: { legendPlayerId: l.player.id, humans: [userHome ? 'home' : 'away'] },
        meta: {
          kind: 'legend', label: `Rumo ao Estrelato · Rodada ${l.round + 1}`,
          userSide: userHome ? 'home' : 'away',
          roundIndex: fx.roundIndex, tieIndex: fx.tieIndex,
          continue: { screen: 'legend' }, returnScreen: 'legend'
        }
      });
    },

    /* ---------------- Career screens ---------------- */
    masterScreenHTML() {
      const c = this.save.career;
      if (!c) {
        const leagueId = this.masterLeague || 'brasileirao';
        const league = PES.getLeague(leagueId);
        const teams = (league ? league.teams : PES.teams.filter(t => !t.isNational)).slice().sort((a, b) => b.rating - a.rating);
        return `<div>
          <div class="page-head"><div><p class="eyebrow">Master League</p><h1 class="page-title">ESCOLHA SEU CLUBE</h1><p class="page-sub">Assuma um clube, monte o elenco, cumpra as metas da diretoria e construa uma dinastia. O save é automático.</p></div></div>
          <div class="card" style="margin-bottom:16px"><div class="row wrap">
            <span class="chip lime">${this.icon('trophy')} Ligas completas</span>
            <span class="chip cyan">${this.icon('transfer')} Mercado de transferências</span>
            <span class="chip">${this.icon('chart')} Metas da diretoria</span>
            <span class="chip">${this.icon('save')} Progresso salvo</span>
          </div></div>
          <div class="league-tabs">${PES.LEAGUES.map(l => `<button data-action="filter-master-league" data-value="${l.id}" class="${leagueId === l.id ? 'on' : ''}">${esc(l.name)}</button>`).join('')}</div>
          <div class="team-grid">
            ${teams.map(t => `<button class="team-card" data-action="master-start" data-team="${t.id}">
              ${this.crest(t, 42)}<div><b>${esc(t.name)}</b><small>${esc(t.city)} · Meta: ${targetsFor(t)}º ou melhor</small></div><span class="ovr">${t.rating}</span>
            </button>`).join('')}
          </div>
        </div>`;
      }
      const club = team(c.clubId);
      const league = PES.getLeague(c.leagueId);
      const table = this.careerStandings();
      const pos = table.findIndex(r => r.id === c.clubId) + 1;
      const fx = fixtureFor(c, c.clubId);
      const opp = fx ? team(fx.opponent) : null;
      const squad = PES.getSquad(c.clubId).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 9);
      const met = pos > 0 && pos <= c.target;
      return `<div>
        <div class="career-hero" style="--club:${club.colors.primary}">
          <div class="career-club">${this.crest(club, 78)}<div><p class="eyebrow">${esc(league.name)} · Temporada ${c.season}</p><h2>${esc(club.name)}</h2><p>${esc(club.stadium)} · ${esc(club.city)} · ${club.rating} geral</p></div></div>
          <div class="career-metrics">
            <div class="metric"><div class="m-label">Posição</div><div class="m-value">${pos || '—'}º<small>/${table.length}</small></div></div>
            <div class="metric"><div class="m-label">Pontos</div><div class="m-value">${table[pos - 1]?.pts || 0}</div></div>
            <div class="metric"><div class="m-label">Orçamento</div><div class="m-value">${this.money(c.budget)}</div></div>
            <div class="metric"><div class="m-label">Diretoria</div><div class="m-value">${c.board}%<small> confiança</small></div></div>
          </div>
        </div>
        ${c.lastSeason ? `<div class="card" style="margin-top:12px"><div class="row wrap"><span class="chip ${c.lastSeason.met ? 'lime' : 'red'}">${c.lastSeason.met ? 'Meta cumprida' : 'Meta não cumprida'}</span><span class="chip">Temporada ${c.lastSeason.season}: ${c.lastSeason.pos}º com ${c.lastSeason.pts} pts</span><span class="chip cyan">${c.lastSeason.champion === c.clubId ? 'Campeão!' : 'Campeão: ' + esc(team(c.lastSeason.champion)?.name || '—')}</span></div></div>` : ''}
        ${fx && opp ? `<div class="card" style="margin-top:12px">
          <div class="career-next">
            <div class="opp">${this.crest(opp, 56)}<div><span class="muted">${fx.home ? 'Em casa' : 'Fora de casa'} · Rodada ${c.round + 1}</span><b>${esc(opp.name)}</b><span>${esc(opp.formation)} · ${opp.rating} geral</span></div></div>
            <div class="row wrap"><button class="btn cyan" data-action="master-sim">${this.icon('replay')} Simular</button><button class="btn primary" data-action="master-play">${this.icon('play')} Jogar</button></div>
          </div>
        </div>` : `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><div><b>Temporada encerrada</b><span class="muted">A próxima temporada começa automaticamente.</span></div><button class="btn primary" data-action="master-sim">Avançar</button></div></div>`}
        <div class="grid g2" style="margin-top:12px">
          <div class="card">
            <div class="card-title">Objetivos da diretoria</div>
            <div class="obj-list">
              <div class="obj ${met ? 'done' : ''}"><span class="tick">${met ? this.icon('check') : ''}</span>Terminar entre os ${c.target} primeiros</div>
              <div class="obj ${c.record.gf >= 25 ? 'done' : ''}"><span class="tick">${c.record.gf >= 25 ? this.icon('check') : ''}</span>Marcar 25 gols na temporada (${c.record.gf})</div>
              <div class="obj ${c.record.pts >= c.round * 2 ? 'done' : ''}"><span class="tick">${c.record.pts >= c.round * 2 ? this.icon('check') : ''}</span>Média de 2 pontos por rodada</div>
              <div class="obj ${c.board >= 75 ? 'done' : ''}"><span class="tick">${c.board >= 75 ? this.icon('check') : ''}</span>Manter a diretoria acima de 75%</div>
            </div>
            <div style="margin-top:14px"><div class="slider-row"><span>Confiança</span><div class="progressbar"><i style="width:${c.board}%"></i></div><b>${c.board}%</b></div></div>
            <div class="row wrap" style="margin-top:14px"><button class="btn small" data-action="transfers">${this.icon('transfer')} Transferências</button><button class="btn small" data-action="master-reset">Recomeçar carreira</button></div>
          </div>
          <div class="card">
            <div class="card-title">Elenco principal</div>
            <div class="player-list">
              ${squad.map(p => `<div class="player-row" style="grid-template-columns:30px minmax(0,1fr) 44px 38px 44px"><span class="num">${p.number}</span><span class="p-name">${esc(p.name)}</span><span class="p-pos">${esc(p.pos)}</span><span class="p-ovr">${p.ovr}</span><span class="p-val">${this.money(p.value)}</span></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="section-title">Classificação · ${esc(league.name)}</div>
        ${this.tableHTML(c, c.clubId)}
        <div class="row wrap" style="margin-top:16px"><button class="btn" data-action="master-history">Histórico</button><button class="btn" data-action="menu">Menu principal</button></div>
      </div>`;
    },

    legendScreenHTML() {
      const l = this.save.legend;
      if (!l) {
        const clubs = PES.teams.filter(t => !t.isNational).slice().sort((a, b) => a.rating - b.rating);
        return `<div>
          <div class="page-head"><div><p class="eyebrow">Rumo ao Estrelato</p><h1 class="page-title">CRIE SUA LENDA</h1><p class="page-sub">Comece em um clube modesto, jogue bem, receba propostas e torne-se o maior nome do futebol.</p></div></div>
          <div class="card" style="max-width:620px">
            <div class="card-title">Novo jogador</div>
            <label class="opt-row"><div class="opt-label">Nome<small>Como você será chamado</small></div><input id="legend-name" maxlength="22" value="Craque" /></label>
            <label class="opt-row"><div class="opt-label">Posição</div><select id="legend-pos">${POSITIONS.map(p => `<option value="${p}" ${p === 'ST' ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
            <label class="opt-row"><div class="opt-label">Clube inicial</div><select id="legend-club">${clubs.map(t => `<option value="${t.id}">${esc(t.name)} · ${t.rating}</option>`).join('')}</select></label>
            <button class="btn primary block" style="margin-top:16px" data-action="legend-create">${this.icon('star')} Começar carreira</button>
          </div>
          <div class="card" style="max-width:620px;margin-top:12px"><div class="row wrap"><span class="chip lime">${this.icon('star')} Evolução por desempenho</span><span class="chip cyan">${this.icon('transfer')} Propostas de clubes</span><span class="chip">${this.icon('chart')} Estatísticas pessoais</span></div></div>
        </div>`;
      }
      const p = l.player, club = team(l.clubId), league = PES.getLeague(l.leagueId);
      const table = this.legendStandings();
      const pos = table.findIndex(r => r.id === l.clubId) + 1;
      const fx = fixtureFor(l, l.clubId);
      const opp = fx ? team(fx.opponent) : null;
      const avg = avgRating(l.stats);
      return `<div>
        <div class="career-hero" style="--club:${club.colors.primary}">
          <div class="career-club">
            <div class="crest" style="--c1:${club.colors.primary};--c2:${club.colors.secondary};--c3:${club.colors.accent};--cs:78px;width:78px;height:86px"><span class="shield"></span><span class="letters">${esc(p.pos)}</span></div>
            <div><p class="eyebrow">${esc(club.name)} · ${esc(league.name)} · Temporada ${l.season}</p><h2>${esc(p.name)}</h2><p>${p.age} anos · ${p.pos} · ${p.ovr} geral · Reputação ${Math.round(l.reputation)}</p></div>
          </div>
          <div class="career-metrics">
            <div class="metric"><div class="m-label">Jogos</div><div class="m-value">${l.stats.apps}</div></div>
            <div class="metric"><div class="m-label">Gols</div><div class="m-value">${l.stats.goals}</div></div>
            <div class="metric"><div class="m-label">Assistências</div><div class="m-value">${l.stats.assists}</div></div>
            <div class="metric"><div class="m-label">Nota média</div><div class="m-value">${avg ? avg.toFixed(1) : '—'}</div></div>
          </div>
        </div>
        ${l.lastSeason ? `<div class="card" style="margin-top:12px"><div class="row wrap"><span class="chip lime">Temporada ${l.lastSeason.season}: ${l.lastSeason.goals} gols, ${l.lastSeason.assists} assist.</span><span class="chip">${l.lastSeason.pos}º na liga</span><span class="chip cyan">Evolução +${l.lastSeason.growth} geral</span></div></div>` : ''}
        ${l.offers && l.offers.length ? `<div class="card" style="margin-top:12px"><div class="card-title">Propostas recebidas</div>
          ${l.offers.map((o, i) => { const t = team(o.clubId); return `<div class="career-next" style="border-top:1px solid var(--line);padding:12px 0"><div class="opp">${this.crest(t, 44)}<div><span>${esc(PES.getLeague(t.leagueId)?.name || '')}</span><b>${esc(t.name)}</b><span>Salário €${o.wage}M · Valor €${o.fee}M</span></div></div><div class="row"><button class="btn small" data-action="decline-offer" data-index="${i}">Recusar</button><button class="btn small primary" data-action="accept-offer" data-index="${i}">Aceitar</button></div></div>`; }).join('')}
        </div>` : ''}
        ${fx && opp ? `<div class="card" style="margin-top:12px"><div class="career-next">
          <div class="opp">${this.crest(opp, 56)}<div><span class="muted">${fx.home ? 'Em casa' : 'Fora de casa'} · Rodada ${l.round + 1}</span><b>${esc(opp.name)}</b><span>${esc(opp.formation)} · ${opp.rating} geral</span></div></div>
          <div class="row wrap"><button class="btn cyan" data-action="legend-sim">${this.icon('replay')} Simular</button><button class="btn primary" data-action="legend-play">${this.icon('play')} Jogar</button></div>
        </div></div>` : `<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><div><b>Temporada encerrada</b><span class="muted">A próxima temporada começa automaticamente.</span></div><button class="btn primary" data-action="legend-sim">Avançar</button></div></div>`}
        <div class="grid g2" style="margin-top:12px">
          <div class="card"><div class="card-title">Atributos</div>
            ${[['Ritmo', p.pac], ['Finalização', p.sho], ['Passe', p.pas], ['Drible', p.dri], ['Defesa', p.def], ['Físico', p.phy]].map(([label, v]) => `<div class="stat-bar"><span>${label}</span><div class="sb-track"><div class="sb-fill" style="width:${v}%"></div></div><span class="sb-val">${v}</span></div>`).join('')}
            <div class="row wrap" style="margin-top:14px"><button class="btn small" data-action="legend-reset">Recomeçar lenda</button><button class="btn small" data-action="menu">Menu</button></div>
          </div>
          <div class="card"><div class="card-title">Histórico</div>
            ${l.history.length ? l.history.slice().reverse().map(h => `<div class="reward-row"><span>Temporada ${h.season} · ${h.pos}º</span><b>${h.goals || 0} gols · ${(h.avg || 0).toFixed(1)}</b></div>`).join('') : '<div class="muted" style="font-size:12px">Sua história começa agora.</div>'}
            <div class="reward-row"><span>Carreira: jogos</span><b>${l.totals.apps}</b></div>
            <div class="reward-row"><span>Carreira: gols</span><b>${l.totals.goals}</b></div>
            <div class="reward-row"><span>Carreira: assistências</span><b>${l.totals.assists}</b></div>
          </div>
        </div>
        <div class="section-title">Classificação · ${esc(league.name)}</div>
        ${this.tableHTML(l, l.clubId)}
      </div>`;
    },

    /* ---------------- Transfers ---------------- */
    transfersScreenHTML() {
      const c = this.save.career;
      const club = c ? team(c.clubId) : null;
      if (!c || !club) return `<div class="empty">Inicie uma carreira na Master League para negociar no mercado.<div class="row" style="justify-content:center;margin-top:14px"><button class="btn primary" data-action="master">Ir para Master League</button></div></div>`;
      const pos = this.transferPos || 'all';
      const market = PES.buildMarket().filter(p => p.clubId !== c.clubId && (pos === 'all' || p.pos === pos)).slice(0, 32);
      const custom = (this.save.edits.customPlayers || []).filter(p => p.teamId === c.clubId);
      return `<div>
        <div class="page-head"><div><p class="eyebrow">Mercado da bola</p><h1 class="page-title">TRANSFERÊNCIAS</h1><p class="page-sub">${esc(club.name)} · Orçamento ${this.money(c.budget)} · ${custom.length} contratações na temporada</p></div></div>
        <div class="card" style="margin-bottom:14px"><div class="row wrap">
          <span class="chip lime">${this.icon('transfer')} ${c.transfers.length} negociações</span>
          <span class="chip cyan">${this.icon('cart')} Orçamento ${this.money(c.budget)}</span>
          <span class="chip">${this.icon('users')} ${PES.getSquad(c.clubId).length} jogadores</span>
        </div></div>
        <div class="league-tabs">${['all', 'ST', 'AM', 'LW', 'RW', 'CM', 'DM', 'CB', 'LB', 'RB', 'GK'].map(p => `<button data-action="transfer-filter" data-value="${p}" class="${pos === p ? 'on' : ''}">${p === 'all' ? 'Todos' : p}</button>`).join('')}</div>
        <div class="card"><div class="card-title">Jogadores disponíveis</div>
          <div class="player-list">
            ${market.map(p => `<div class="player-row">
              <span class="num">${p.ovr}</span>
              <span class="p-name">${esc(p.name)}<small>${esc(p.clubName)} · ${p.age} anos</small></span>
              <span class="p-pos">${esc(p.pos)}</span>
              <span class="p-ovr">${p.ovr}</span>
              <span class="p-val">${this.money(p.value)}</span>
              <button class="btn small" data-action="transfer-buy" data-player="${p.id}" ${c.budget < p.value ? 'disabled' : ''}>Contratar</button>
            </div>`).join('') || '<div class="empty">Nenhum jogador encontrado.</div>'}
          </div>
        </div>
        <div class="section-title">Contratações da temporada</div>
        <div class="card">
          ${custom.length ? `<div class="player-list">${custom.map(p => `<div class="player-row">
            <span class="num">${p.number}</span><span class="p-name">${esc(p.name)}<small>${esc(p.pos)} · ${p.age} anos</small></span>
            <span class="p-pos">${esc(p.pos)}</span><span class="p-ovr">${p.ovr}</span><span class="p-val">${this.money(p.value)}</span>
            <button class="btn small" data-action="transfer-sell" data-id="${p.id}">Vender</button>
          </div>`).join('')}</div>` : '<div class="muted" style="font-size:12px">Nenhuma contratação ainda. Use o mercado para reforçar o elenco.</div>'}
        </div>
      </div>`;
    },

    /* ---------------- Editor ---------------- */
    editorScreenHTML() {
      const ctx = this.ctx || {};
      if (ctx.teamId) {
        const t = team(ctx.teamId);
        if (!t) return '<div class="empty">Time não encontrado.</div>';
        const squad = PES.getSquad(t.id).slice().sort((a, b) => b.ovr - a.ovr);
        const ep = this.editorPlayerId ? squad.find(p => p.id === this.editorPlayerId) : null;
        return `<div>
          <div class="page-head"><div><p class="eyebrow">Editor · ${esc(t.leagueName)}</p><h1 class="page-title">${esc(t.name)}</h1><p class="page-sub">Edite identidade, uniforme, formação e jogadores. As mudanças valem para todos os modos.</p></div><button class="btn small" data-action="editor-back">Voltar</button></div>
          <div class="grid g2">
            <div class="card">
              <div class="card-title">Clube</div>
              <label class="opt-row"><div class="opt-label">Nome</div><input id="edit-team-name" value="${esc(t.name)}" maxlength="30" /></label>
              <label class="opt-row"><div class="opt-label">Sigla</div><input id="edit-team-short" value="${esc(t.short)}" maxlength="4" /></label>
              <label class="opt-row"><div class="opt-label">Formação</div><select id="edit-team-formation">${Object.keys(PES.FORMATIONS).map(f => `<option value="${f}" ${t.formation === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
              <label class="opt-row"><div class="opt-label">Estádio</div><input id="edit-team-stadium" value="${esc(t.stadium)}" maxlength="30" /></label>
              <div class="color-row" style="margin-top:12px">
                <label class="color-field">Principal<input type="color" id="edit-team-c1" value="${t.colors.primary}" /></label>
                <label class="color-field">Secundária<input type="color" id="edit-team-c2" value="${t.colors.secondary}" /></label>
                <label class="color-field">Destaque<input type="color" id="edit-team-c3" value="${t.colors.accent}" /></label>
              </div>
              <div class="kit-preview"><div class="kit-shirt" style="--k1:${t.colors.primary};--k2:${t.colors.secondary}"><span class="body"></span><span class="stripe"></span><span class="collar"></span></div>${this.crest(t, 52)}</div>
              <button class="btn primary block" data-action="save-team" data-team="${t.id}">Salvar clube</button>
            </div>
            <div class="card">
              <div class="card-title">Jogadores</div>
              <div class="player-list" style="max-height:360px;overflow:auto">
                ${squad.map(p => `<div class="player-row" style="grid-template-columns:30px minmax(0,1fr) 44px 38px auto">
                  <span class="num">${p.number}</span><span class="p-name">${esc(p.name)}<small>${esc(p.pos)} · ${p.age} anos</small></span>
                  <span class="p-pos">${esc(p.pos)}</span><span class="p-ovr">${p.ovr}</span>
                  <button class="btn small" data-action="edit-player" data-player="${p.id}">Editar</button>
                </div>`).join('')}
              </div>
              <button class="btn block" style="margin-top:12px" data-action="create-player-form">${this.icon('plus')} Criar jogador</button>
            </div>
          </div>
          ${ep ? `<div class="card" style="margin-top:12px"><div class="card-title">Editar jogador</div>
            <div class="grid g3">
              <label class="opt-row"><div class="opt-label">Nome</div><input id="edit-player-name" value="${esc(ep.name)}" maxlength="24" /></label>
              <label class="opt-row"><div class="opt-label">Posição</div><select id="edit-player-pos">${POSITIONS.map(p => `<option value="${p}" ${ep.pos === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
              <label class="opt-row"><div class="opt-label">Geral</div><input id="edit-player-ovr" type="number" min="40" max="99" value="${ep.ovr}" /></label>
              <label class="opt-row"><div class="opt-label">Camisa</div><input id="edit-player-number" type="number" min="1" max="99" value="${ep.number}" /></label>
            </div>
            <div class="row" style="margin-top:12px"><button class="btn primary" data-action="save-player" data-team="${t.id}" data-player="${ep.id}">Salvar jogador</button><button class="btn" data-action="cancel-edit-player">Cancelar</button></div>
          </div>` : ''}
          ${this.creatingPlayer ? `<div class="card" style="margin-top:12px"><div class="card-title">Novo jogador</div>
            <div class="grid g3">
              <label class="opt-row"><div class="opt-label">Nome</div><input id="new-player-name" value="Novo Craque" maxlength="24" /></label>
              <label class="opt-row"><div class="opt-label">Posição</div><select id="new-player-pos">${POSITIONS.map(p => `<option value="${p}">${p}</option>`).join('')}</select></label>
              <label class="opt-row"><div class="opt-label">Geral</div><input id="new-player-ovr" type="number" min="45" max="95" value="75" /></label>
              <label class="opt-row"><div class="opt-label">Idade</div><input id="new-player-age" type="number" min="16" max="42" value="22" /></label>
            </div>
            <div class="row" style="margin-top:12px"><button class="btn primary" data-action="create-player" data-team="${t.id}">Criar</button><button class="btn" data-action="cancel-create-player">Cancelar</button></div>
          </div>` : ''}
        </div>`;
      }
      const leagueId = this.editorLeague || 'brasileirao';
      const league = PES.getLeague(leagueId);
      const teams = (league ? league.teams : PES.teams.filter(t => !t.isNational)).slice().sort((a, b) => a.name.localeCompare(b.name));
      return `<div>
        <div class="page-head"><div><p class="eyebrow">Editor</p><h1 class="page-title">CRIE DO SEU JEITO</h1><p class="page-sub">Personalize clubes, cores, uniformes e jogadores. Tudo é salvo no dispositivo e aplicado nas partidas.</p></div></div>
        <div class="card" style="margin-bottom:14px"><div class="row wrap"><span class="chip lime">${this.icon('edit')} Times editáveis</span><span class="chip cyan">${this.icon('shirt')} Uniformes</span><span class="chip">${this.icon('plus')} Jogadores personalizados</span><span class="chip">${(this.save.edits.customPlayers || []).length} criados</span></div></div>
        <div class="league-tabs">${PES.LEAGUES.map(l => `<button data-action="filter-editor-league" data-value="${l.id}" class="${leagueId === l.id ? 'on' : ''}">${esc(l.name)}</button>`).join('')}</div>
        <div class="team-grid">
          ${teams.map(t => `<button class="team-card" data-action="edit-team" data-team="${t.id}">
            ${this.crest(t, 42)}<div><b>${esc(t.name)}</b><small>${esc(t.formation)} · ${esc(t.stadium)}</small></div><span class="ovr">${t.rating}</span>
          </button>`).join('')}
        </div>
      </div>`;
    },

    /* ---------------- Training / Multiplayer ---------------- */
    trainingScreenHTML() {
      const home = team(this.setup.home) || PES.teams[0];
      const mode = this.trainingMode || 'chute';
      const modes = [
        ['livre', 'Jogo livre', 'Campo aberto para experimentar passes, dribles e finalizações.'],
        ['passe', 'Passe', 'Treine precisão e tomada de decisão com passes curtos e longos.'],
        ['chute', 'Chute', 'Receba a bola e finalize contra o goleiro. Ajuste força e direção.'],
        ['penalti', 'Pênaltis', 'Cobranças de pênalti com goleiro adversário. Mostre sangue frio.']
      ];
      return `<div>
        <div class="page-head"><div><p class="eyebrow">Centro de treinamento</p><h1 class="page-title">EVOLUA SEU JOGO</h1><p class="page-sub">Sessões rápidas para dominar os controles. Cada treino rende moedas e não afeta suas estatísticas oficiais.</p></div></div>
        <div class="grid g2">
          <div class="card">
            <div class="card-title">Modo de treino</div>
            <div class="comp-grid" style="grid-template-columns:1fr">
              ${modes.map(([id, name, desc]) => `<button class="comp-card" style="padding:14px" data-action="set-training-mode" data-value="${id}">
                <div class="row" style="justify-content:space-between"><h3 style="margin:0;font-size:16px">${name}</h3>${mode === id ? `<span class="chip lime">${this.icon('check')} Selecionado</span>` : ''}</div>
                <p>${desc}</p>
              </button>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-title">Time</div>
            <button class="team-pick" data-action="pick-team" data-side="home" style="width:100%">
              ${this.crest(home, 66)}<span class="tp-name">${esc(home.name)}</span><span class="tp-meta">${esc(home.leagueName)} · ${home.rating}</span><span class="tp-change">TROCAR TIME</span>
            </button>
            <div class="pill-row"><span class="chip lime">${this.icon('target')} ${modes.find(m => m[0] === mode)[1]}</span><span class="chip">${this.icon('clock')} Sem limite de tempo</span></div>
            <p class="muted" style="font-size:12px;line-height:1.6">Use o botão de pausa para encerrar o treino quando quiser. Os gols e passes são contabilizados nas recompensas.</p>
            <button class="btn primary block" style="margin-top:12px" data-action="training-start">${this.icon('play')} Iniciar treino</button>
          </div>
        </div>
      </div>`;
    },

    multiplayerScreenHTML() {
      const home = team(this.setup.home) || PES.teams[0];
      const away = team(this.setup.away) || PES.teams[1];
      return `<div>
        <div class="page-head"><div><p class="eyebrow">Multiplayer local</p><h1 class="page-title">DOIS JOGADORES</h1><p class="page-sub">Jogue com um amigo no mesmo dispositivo. O Jogador 1 controla o time da casa e o Jogador 2 o visitante.</p></div></div>
        <div class="card matchup-card">
          <div class="matchup-teams">
            <button class="team-pick" data-action="pick-team" data-side="home">${this.crest(home, 78)}<span class="tp-name">${esc(home.name)}</span><span class="tp-meta">JOGADOR 1 · ${home.rating}</span><span class="tp-change">TROCAR TIME</span></button>
            <div class="vs-badge">VS</div>
            <button class="team-pick" data-action="pick-team" data-side="away">${this.crest(away, 78)}<span class="tp-name">${esc(away.name)}</span><span class="tp-meta">JOGADOR 2 · ${away.rating}</span><span class="tp-change">TROCAR TIME</span></button>
          </div>
          <div class="grid g2" style="margin-top:16px">
            <div class="card soft"><div class="card-title">Jogador 1</div><div class="row">${this.crest(home, 38)}<div><b>${esc(home.name)}</b><div class="muted" style="font-size:11px">Joystick esquerdo · botões direitos</div></div></div></div>
            <div class="card soft"><div class="card-title">Jogador 2</div><div class="row">${this.crest(away, 38)}<div><b>${esc(away.name)}</b><div class="muted" style="font-size:11px">Joystick direito · botões esquerdos</div></div></div></div>
          </div>
          <div class="opt-list" style="margin-top:14px">
            <div class="opt-row"><div class="opt-label">Duração</div><div class="seg">${[3, 4, 6, 8].map(d => `<button data-action="set-duration" data-value="${d}" class="${this.setup.duration === d ? 'on' : ''}">${d} min</button>`).join('')}</div></div>
            <div class="opt-row"><div class="opt-label">Dificuldade da IA</div><div class="seg">${PES.DIFFICULTIES.map(d => `<button data-action="set-difficulty" data-value="${d.id}" class="${this.setup.difficulty === d.id ? 'on' : ''}">${d.name}</button>`).join('')}</div></div>
          </div>
          <button class="btn primary block" style="margin-top:18px" data-action="multiplayer-start">${this.icon('users')} COMEÇAR PARTIDA</button>
        </div>
      </div>`;
    },

    /* ---------------- Options ---------------- */
    optionsScreenHTML() {
      const s = this.save.settings;
      const T = (key, label, sub) => `<div class="opt-row"><div class="opt-label">${label}${sub ? `<small>${sub}</small>` : ''}</div><div class="seg"><button data-action="toggle-setting" data-key="${key}" class="${s[key] ? 'on' : ''}">${s[key] ? 'Ligado' : 'Desligado'}</button></div></div>`;
      return `<div>
        <div class="page-head"><div><p class="eyebrow">Opções</p><h1 class="page-title">AJUSTES DO JOGO</h1><p class="page-sub">Áudio, controles, sensor de movimento e gerenciamento do save.</p></div></div>
        <div class="grid g2">
          <div class="card">
            <div class="card-title">Perfil e áudio</div>
            <label class="opt-row"><div class="opt-label">Nome do jogador</div><input id="profile-name" maxlength="20" value="${esc(this.save.profile.name)}" /></label>
            ${T('music', 'Música', 'Trilha sintetizada nos menus e jogos')}
            ${T('sfx', 'Efeitos sonoros', 'Chutes, apitos, torcida e gols')}
            ${T('narration', 'Narração', 'Locução em português brasileiro')}
            <div class="slider-row"><span>Volume geral</span><input id="opt-volume" type="range" min="0" max="1" step="0.05" value="${s.volume}" /><b>${Math.round(s.volume * 100)}%</b></div>
            <div class="slider-row"><span>Volume música</span><input id="opt-music-volume" type="range" min="0" max="1" step="0.05" value="${s.musicVolume}" /><b>${Math.round(s.musicVolume * 100)}%</b></div>
          </div>
          <div class="card">
            <div class="card-title">Controles e jogo</div>
            ${T('vibration', 'Vibração', 'Retorno tátil em gols e pausas')}
            ${T('tilt', 'Tilt', 'Sensor de movimento do aparelho')}
            ${T('replayAuto', 'Replay automático', 'Reveja os gols após a comemoração')}
            <div class="opt-row"><div class="opt-label">Dificuldade padrão</div><div class="seg">${PES.DIFFICULTIES.map(d => `<button data-action="opt-difficulty" data-value="${d.id}" class="${s.difficulty === d.id ? 'on' : ''}">${d.name}</button>`).join('')}</div></div>
            <div class="opt-row"><div class="opt-label">Qualidade gráfica</div><div class="seg">${['alta', 'média', 'baixa'].map(q => `<button data-action="opt-quality" data-value="${q}" class="${s.quality === q ? 'on' : ''}">${q}</button>`).join('')}</div></div>
            <button class="btn block" style="margin-top:14px" data-action="request-tilt">${this.icon('target')} Ativar sensor de movimento (iOS)</button>
          </div>
        </div>
        <div class="card" style="margin-top:12px">
          <div class="card-title">Save e dados</div>
          <div class="row wrap"><span class="chip">Criado em ${new Date(this.save.createdAt).toLocaleDateString('pt-BR')}</span><span class="chip lime">${this.save.trophies.length} títulos</span><span class="chip cyan">${this.save.stats.matches} partidas</span><span class="chip">${this.save.profile.coins} moedas</span></div>
          <div class="row wrap" style="margin-top:14px">
            <button class="btn small primary" data-action="save-options">Salvar opções</button>
            <button class="btn small" data-action="export-save">Exportar save</button>
            <button class="btn small" data-action="credits">Créditos</button>
            <button class="btn small" data-action="reset-save">Apagar progresso</button>
          </div>
        </div>
      </div>`;
    },

    /* ---------------- Extras / shop ---------------- */
    extrasScreenHTML() {
      const shopGroup = (kind, label, list) => {
        const owned = this.save.unlocked[kind] || [];
        const equip = this.save.unlocked.equip[kind];
        return `<div class="section-title">${label}</div><div class="shop-grid">
          ${list.map(item => {
            const has = !item.cost || owned.includes(item.id);
            return `<div class="shop-item ${has ? 'owned' : ''}">
              <div class="si-icon">${this.icon(kind === 'stadiums' ? 'shield' : kind === 'kits' ? 'shirt' : kind === 'celebrations' ? 'star' : 'ball')}</div>
              <b>${esc(item.name)}</b><p>${esc(item.desc || (item.capacity ? item.capacity.toLocaleString('pt-BR') + ' lugares · ' + item.city : 'Item cosmético'))}</p>
              <div class="row" style="justify-content:space-between;margin-top:auto">
                <span class="chip ${has ? 'lime' : ''}">${has ? (equip === item.id ? 'Equipado' : 'Adquirido') : item.cost + ' moedas'}</span>
                ${kind === 'stadiums' ? '' : has ? `<button class="btn small" data-action="equip-item" data-kind="${kind}" data-id="${item.id}" ${equip === item.id ? 'disabled' : ''}>Equipar</button>` : `<button class="btn small primary" data-action="buy-item" data-kind="${kind}" data-id="${item.id}" ${this.save.profile.coins < item.cost ? 'disabled' : ''}>Comprar</button>`}
              </div>
            </div>`;
          }).join('')}
        </div>`;
      };
      const achievements = [
        ['Primeiro jogo', this.save.stats.matches >= 1],
        ['Dez jogos', this.save.stats.matches >= 10],
        ['Artilheiro', this.save.stats.goals >= 25],
        ['Muralha', this.save.stats.cleanSheets >= 5],
        ['Campeão', this.save.trophies.length >= 1],
        ['Colecionador', this.save.trophies.length >= 5],
        ['Lenda', this.save.stats.matches >= 50]
      ];
      return `<div>
        <div class="page-head"><div><p class="eyebrow">Extras</p><h1 class="page-title">LOJA E CONQUISTAS</h1><p class="page-sub">Gaste moedas em estádios, bolas, uniformes e comemorações. Acompanhe troféus e estatísticas.</p></div><div class="coin-pill">${this.save.profile.coins} moedas</div></div>
        ${shopGroup('stadiums', 'Estádios', PES.STADIUMS)}
        ${shopGroup('balls', 'Bolas', PES.BALLS)}
        ${shopGroup('kits', 'Uniformes', PES.KITS)}
        ${shopGroup('celebrations', 'Comemorações', PES.CELEBRATIONS)}
        <div class="section-title">Sala de troféus</div>
        <div class="card">
          ${this.save.trophies.length ? `<div class="trophy-cabinet">${this.save.trophies.map(t => `<div class="trophy-item"><span class="trophy-mark">${this.icon('trophy')}</span><b>${esc(t.name)}</b><span>${esc(t.club || '')} · ${t.year || ''}</span></div>`).join('')}</div>` : '<div class="empty">Nenhum troféu ainda. Vença uma competição para começar sua coleção.</div>'}
        </div>
        <div class="section-title">Conquistas e estatísticas</div>
        <div class="grid g2">
          <div class="card"><div class="obj-list">${achievements.map(([name, done]) => `<div class="obj ${done ? 'done' : ''}"><span class="tick">${done ? this.icon('check') : ''}</span>${name}</div>`).join('')}</div></div>
          <div class="card">
            <div class="reward-row"><span>Partidas</span><b>${this.save.stats.matches}</b></div>
            <div class="reward-row"><span>Vitórias</span><b>${this.save.stats.wins}</b></div>
            <div class="reward-row"><span>Empates</span><b>${this.save.stats.draws}</b></div>
            <div class="reward-row"><span>Derrotas</span><b>${this.save.stats.losses}</b></div>
            <div class="reward-row"><span>Gols marcados</span><b>${this.save.stats.goals}</b></div>
            <div class="reward-row"><span>Jogos sem sofrer gol</span><b>${this.save.stats.cleanSheets}</b></div>
          </div>
        </div>
      </div>`;
    },

    /* ---------------- Action helpers ---------------- */
    masterResetPrompt() {
      this.modal(`<h3>Recomeçar carreira?</h3><p class="m-sub">Todo o progresso da Master League será apagado. Seus troféus e moedas permanecem.</p><div class="modal-actions"><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="master-reset-confirm">Apagar carreira</button></div>`);
    },

    legendResetPrompt() {
      this.modal(`<h3>Recomeçar lenda?</h3><p class="m-sub">O jogador atual e todo o histórico da lenda serão apagados.</p><div class="modal-actions"><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="legend-reset-confirm">Apagar lenda</button></div>`);
    },

    transferBuy(playerId) {
      const c = this.save.career;
      if (!c) return;
      const p = PES.buildMarket().find(x => x.id === playerId);
      if (!p) return;
      if (c.budget < p.value) { this.toast('Orçamento insuficiente', 'bad'); return; }
      c.budget = Math.round((c.budget - p.value) * 10) / 10;
      const id = 'custom-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 999);
      const custom = Object.assign({}, p, { id, teamId: c.clubId, number: p.number || 10 });
      delete custom.clubId; delete custom.clubName;
      this.save.edits.customPlayers.push(custom);
      c.transfers.push({ name: p.name, from: p.clubName, value: p.value, season: c.season });
      PES.applyEdits(this.save.edits);
      this.saveNow(true);
      this.render();
      this.toast(`${p.name} contratado por ${this.money(p.value)}`, 'good');
    },

    transferSell(id) {
      const c = this.save.career;
      if (!c) return;
      const list = this.save.edits.customPlayers || [];
      const i = list.findIndex(p => p.id === id && p.teamId === c.clubId);
      if (i < 0) return;
      const p = list.splice(i, 1)[0];
      const value = Math.round((p.value || 1) * .85 * 10) / 10;
      c.budget = Math.round((c.budget + value) * 10) / 10;
      c.transfers.push({ name: p.name, from: team(c.clubId).name, value: -value, season: c.season, out: true });
      PES.applyEdits(this.save.edits);
      this.saveNow(true);
      this.render();
      this.toast(`${p.name} vendido por ${this.money(value)}`, 'good');
    },

    saveTeamEdits(teamId) {
      const name = $('edit-team-name')?.value.trim() || 'Time';
      const short = ($('edit-team-short')?.value.trim() || name.slice(0, 3)).toUpperCase().slice(0, 4);
      const formation = $('edit-team-formation')?.value || '4-3-3';
      const stadium = $('edit-team-stadium')?.value.trim() || 'Estádio Municipal';
      const colors = {
        primary: $('edit-team-c1')?.value || '#35e6ff',
        secondary: $('edit-team-c2')?.value || '#07121c',
        accent: $('edit-team-c3')?.value || '#c9ff3d'
      };
      this.save.edits.teams[teamId] = { name, short, formation, stadium, colors };
      PES.applyEdits(this.save.edits);
      this.saveNow(true);
      this.closeModal();
      this.go('editor', { teamId }, { replace: true });
      this.toast('Clube atualizado', 'good');
    },

    createCustomPlayer(teamId) {
      const name = $('new-player-name')?.value.trim() || 'Novo Craque';
      const pos = $('new-player-pos')?.value || 'ST';
      const ovr = clamp(Number($('new-player-ovr')?.value) || 75, 45, 95);
      const age = clamp(Number($('new-player-age')?.value) || 22, 16, 42);
      const id = 'custom-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 999);
      const p = {
        id, teamId, name, number: 10 + Math.floor(Math.random() * 80), pos, ovr, age,
        nationality: 'Brasil', growth: age < 23 ? 3 : 0,
        pac: clamp(ovr - 2 + Math.floor(Math.random() * 10), 40, 97),
        sho: clamp(ovr - 2 + Math.floor(Math.random() * 10), 30, 96),
        pas: clamp(ovr - 3 + Math.floor(Math.random() * 10), 35, 96),
        dri: clamp(ovr - 3 + Math.floor(Math.random() * 10), 35, 97),
        def: clamp(ovr - 12 + Math.floor(Math.random() * 12), 25, 95),
        phy: clamp(ovr - 6 + Math.floor(Math.random() * 12), 40, 96),
        sta: clamp(70 + Math.floor(Math.random() * 25), 60, 96),
        value: Math.max(0.2, Math.round(((ovr - 45) ** 2 * .05) * 10) / 10),
        wage: 0.1, form: 0, fitness: 100, morale: 80, injured: 0
      };
      this.save.edits.customPlayers.push(p);
      PES.applyEdits(this.save.edits);
      this.saveNow(true);
      this.creatingPlayer = false;
      this.go('editor', { teamId }, { replace: true });
      this.toast(`${name} criado`, 'good');
    }
  });

  Object.assign(G.screens, {
    master() { return this.masterScreenHTML(); },
    legend() { return this.legendScreenHTML(); },
    transfers() { return this.transfersScreenHTML(); },
    editor() { return this.editorScreenHTML(); },
    training() { return this.trainingScreenHTML(); },
    multiplayer() { return this.multiplayerScreenHTML(); },
    options() { return this.optionsScreenHTML(); },
    extras() { return this.extrasScreenHTML(); }
  });

  Object.assign(G.afterRender = G.afterRender || {}, {
    options() {
      const vol = $('opt-volume'), mvol = $('opt-music-volume');
      if (vol) vol.addEventListener('input', () => {
        G.save.settings.volume = Number(vol.value);
        G.applySettings();
        const b = vol.nextElementSibling; if (b) b.textContent = Math.round(vol.value * 100) + '%';
      });
      if (mvol) mvol.addEventListener('input', () => {
        G.save.settings.musicVolume = Number(mvol.value);
        G.applySettings();
        const b = mvol.nextElementSibling; if (b) b.textContent = Math.round(mvol.value * 100) + '%';
      });
    }
  });

  Object.assign(G.actions, {
    master() { this.go('master'); },
    legend() { this.go('legend'); },
    transfers() { this.go('transfers'); },
    editor() { this.editorPlayerId = null; this.creatingPlayer = false; this.go('editor', {}); },
    training() { this.go('training'); },
    multiplayer() { this.setup.humans = 2; this.go('multiplayer'); },
    options() { this.go('options'); },
    extras() { this.go('extras'); },

    'filter-master-league'(el) { this.masterLeague = el.dataset.value; this.render(); },
    'master-start'(el) {
      if (this.save.career && !confirm('Substituir a carreira atual?')) return;
      this.startCareer(el.dataset.team);
    },
    'master-play'() { this.playCareerMatch(); },
    'master-sim'() { this.careerSimRound(); },
    'master-reset'() { this.masterResetPrompt(); },
    'master-reset-confirm'() {
      this.closeModal();
      this.save.career = null;
      this.saveNow(true);
      this.go('master', {}, { replace: true });
      this.toast('Carreira apagada');
    },
    'master-history'() {
      const c = this.save.career;
      if (!c) return;
      this.modal(`<h3>Histórico da carreira</h3><p class="m-sub">${esc(team(c.clubId).name)}</p>
        ${c.history.length ? c.history.slice().reverse().map(h => `<div class="reward-row"><span>Temporada ${h.season} · ${h.pos}º</span><b>${h.pts} pts</b></div>`).join('') : '<div class="muted">Primeira temporada em andamento.</div>'}
        <div class="modal-actions"><button class="btn primary" data-action="close-modal">Fechar</button></div>`);
    },

    'legend-create'() {
      const name = $('legend-name')?.value.trim() || 'Craque';
      const pos = $('legend-pos')?.value || 'ST';
      const club = $('legend-club')?.value;
      this.createLegend(name, pos, club);
    },
    'legend-play'() { this.playLegendMatch(); },
    'legend-sim'() { this.legendSimRound(); },
    'legend-reset'() { this.legendResetPrompt(); },
    'legend-reset-confirm'() {
      this.closeModal();
      this.save.legend = null;
      this.saveNow(true);
      this.go('legend', {}, { replace: true });
      this.toast('Lenda apagada');
    },
    'accept-offer'(el) {
      const l = this.save.legend;
      if (!l) return;
      const o = l.offers[Number(el.dataset.index)];
      if (!o) return;
      const club = team(o.clubId);
      l.clubId = o.clubId; l.leagueId = club.leagueId;
      l.player.teamId = o.clubId;
      l.player.ovr = clamp(l.player.ovr + 2, 68, 95);
      l.reputation = clamp(l.reputation + 4, 10, 99);
      l.offers = [];
      l.rounds = leagueRounds(l.leagueId);
      l.pool = PES.getLeague(l.leagueId).teams.map(t => t.id);
      l.round = 0;
      this.saveNow(true);
      this.go('legend', {}, { replace: true });
      this.toast(`Você agora joga no ${club.name}!`, 'good');
    },
    'decline-offer'(el) {
      const l = this.save.legend;
      if (!l) return;
      l.offers.splice(Number(el.dataset.index), 1);
      this.saveNow(true);
      this.render();
    },

    'transfer-filter'(el) { this.transferPos = el.dataset.value; this.render(); },
    'transfer-buy'(el) { this.transferBuy(el.dataset.player); },
    'transfer-sell'(el) { this.transferSell(el.dataset.id); },

    'filter-editor-league'(el) { this.editorLeague = el.dataset.value; this.go('editor', {}); },
    'edit-team'(el) { this.editorPlayerId = null; this.creatingPlayer = false; this.go('editor', { teamId: el.dataset.team }); },
    'editor-back'() { this.editorPlayerId = null; this.creatingPlayer = false; this.go('editor', {}, { replace: true }); },
    'save-team'(el) { this.saveTeamEdits(el.dataset.team); },
    'edit-player'(el) { this.editorPlayerId = el.dataset.player; this.creatingPlayer = false; this.render(); },
    'cancel-edit-player'() { this.editorPlayerId = null; this.render(); },
    'save-player'(el) {
      const id = el.dataset.player;
      const name = $('edit-player-name')?.value.trim() || 'Jogador';
      const pos = $('edit-player-pos')?.value || 'CM';
      const ovr = clamp(Number($('edit-player-ovr')?.value) || 75, 40, 99);
      const number = clamp(Number($('edit-player-number')?.value) || 10, 1, 99);
      this.save.edits.players[id] = { name, pos, ovr, number };
      PES.applyEdits(this.save.edits);
      this.editorPlayerId = null;
      this.saveNow(true);
      this.render();
      this.toast('Jogador atualizado', 'good');
    },
    'create-player-form'() { this.creatingPlayer = true; this.editorPlayerId = null; this.render(); },
    'cancel-create-player'() { this.creatingPlayer = false; this.render(); },
    'create-player'(el) { this.createCustomPlayer(el.dataset.team); },

    'set-training-mode'(el) { this.trainingMode = el.dataset.value; this.render(); },
    'training-start'() {
      const mode = this.trainingMode || 'chute';
      const labels = { livre: 'Jogo livre', passe: 'Treino de passe', chute: 'Treino de chute', penalti: 'Pênaltis' };
      this.startMatch({
        homeId: this.setup.home, awayId: this.setup.away,
        config: { training: mode, duration: 0, humans: ['home'], stadium: 'Centro de Treinamento' },
        meta: { kind: 'training', label: labels[mode] || 'Treino', continue: { screen: 'training' }, returnScreen: 'training', countStats: false }
      });
    },
    'multiplayer-start'() {
      this.save.lastHome = this.setup.home; this.save.lastAway = this.setup.away;
      this.saveNow(true);
      this.startMatch({
        homeId: this.setup.home, awayId: this.setup.away,
        config: { humans: ['home', 'away'] },
        meta: { kind: 'friendly', label: 'Multiplayer local · J1 vs J2', continue: { screen: 'menu' }, returnScreen: 'multiplayer' }
      });
    },

    'toggle-setting'(el) {
      const key = el.dataset.key;
      this.save.settings[key] = !this.save.settings[key];
      if (key === 'tilt') this.setup.tilt = this.save.settings.tilt;
      this.applySettings();
      this.saveNow(true);
      this.render();
    },
    'opt-difficulty'(el) {
      this.save.settings.difficulty = el.dataset.value;
      this.setup.difficulty = el.dataset.value;
      this.saveNow(true);
      this.render();
    },
    'opt-quality'(el) { this.save.settings.quality = el.dataset.value; this.saveNow(true); this.render(); },
    'save-options'() {
      const name = $('profile-name')?.value.trim();
      if (name) this.save.profile.name = name;
      const vol = $('opt-volume'), mvol = $('opt-music-volume');
      if (vol) this.save.settings.volume = Number(vol.value);
      if (mvol) this.save.settings.musicVolume = Number(mvol.value);
      this.applySettings();
      this.saveNow(true);
      this.toast('Opções salvas', 'good');
    },
    'request-tilt'() { this.requestTilt(); },
    'reset-save'() {
      this.modal(`<h3>Apagar todo o progresso?</h3><p class="m-sub">Carreiras, troféus, moedas, compras e edições serão removidos. Esta ação não pode ser desfeita.</p><div class="modal-actions"><button class="btn" data-action="close-modal">Cancelar</button><button class="btn primary" data-action="reset-save-confirm">Apagar tudo</button></div>`);
    },
    'reset-save-confirm'() { this.closeModal(); this.resetSave(); this.toast('Progresso apagado'); },
    'export-save'() {
      try {
        const blob = new Blob([JSON.stringify(this.save, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'pes2027-stickman-save.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
        this.toast('Save exportado', 'good');
      } catch (e) { this.toast('Não foi possível exportar', 'bad'); }
    },
    credits() {
      this.modal(`<h3>PES 2027 Stickman 2D</h3><p class="m-sub">Futebol completo para navegador, feito com HTML, CSS, Canvas 2D e WebAudio.</p>
        <div class="obj-list">
          <div class="obj"><span class="tick">${this.icon('check')}</span>Times, ligas e jogadores fictícios</div>
          <div class="obj"><span class="tick">${this.icon('check')}</span>Áudio e narração sintetizados em tempo real</div>
          <div class="obj"><span class="tick">${this.icon('check')}</span>Controles por toque, teclado e sensor de movimento</div>
          <div class="obj"><span class="tick">${this.icon('check')}</span>Progresso salvo localmente no seu dispositivo</div>
        </div>
        <div class="modal-actions"><button class="btn primary" data-action="close-modal">Fechar</button></div>`);
    },

    'buy-item'(el) {
      const kind = el.dataset.kind, id = el.dataset.id;
      const catalog = { stadiums: PES.STADIUMS, balls: PES.BALLS, kits: PES.KITS, celebrations: PES.CELEBRATIONS }[kind] || [];
      const item = catalog.find(i => i.id === id);
      if (!item) return;
      if (this.save.profile.coins < (item.cost || 0)) { this.toast('Moedas insuficientes', 'bad'); return; }
      this.award(-(item.cost || 0));
      const list = this.save.unlocked[kind] || (this.save.unlocked[kind] = []);
      if (!list.includes(id)) list.push(id);
      if (kind !== 'stadiums') this.save.unlocked.equip[kind] = id;
      this.saveNow(true);
      this.render();
      this.toast(`${item.name} desbloqueado!`, 'good');
    },
    'equip-item'(el) {
      const kind = el.dataset.kind, id = el.dataset.id;
      this.save.unlocked.equip[kind] = id;
      this.saveNow(true);
      this.render();
      this.toast('Item equipado', 'good');
    }
  });

  if (!G.save) G.init();
})();
