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

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function dateFor(round) {
    const d = new Date();
    d.setDate(d.getDate() + (round || 0) * 3);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  }

  function roundNames(size) {
    if (size >= 16) return ['Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
    return ['Quartas de final', 'Semifinal', 'Final'];
  }

  Object.assign(G, {
    /* ---------------- Competition helpers ---------------- */
    poolForComp(comp) {
      if (!comp) return [];
      let size = comp.size;
      if (!size) {
        const league = PES.getLeague(comp.leagueId || comp.id);
        size = league ? league.teams.length : 20;
      }
      const raw = PES.poolFor(comp.pool, size, Math.floor(Math.random() * 999999));
      const pool = [];
      raw.forEach(t => { if (t && !pool.some(x => x.id === t.id)) pool.push(t); });
      const national = String(comp.pool || '').toLowerCase().includes('national');
      const fallback = national ? PES.nationalTeams : PES.teams;
      for (let i = 0; pool.length < size && i < fallback.length; i++) {
        if (!pool.some(x => x.id === fallback[i].id)) pool.push(fallback[i]);
      }
      let i = 0;
      while (pool.length < size && raw.length) {
        const t = raw[i++ % raw.length];
        if (!pool.some(x => x.id === t.id)) pool.push(t); else break;
      }
      return pool;
    },

    roundRobin(pool) {
      const arr = pool.slice();
      if (arr.length % 2) arr.push(null);
      const n = arr.length;
      const rot = arr.slice(1);
      const rounds = [];
      for (let r = 0; r < n - 1; r++) {
        const line = [arr[0]].concat(rot);
        const ties = [];
        for (let i = 0; i < n / 2; i++) {
          const a = line[i], b = line[n - 1 - i];
          if (!a || !b) continue;
          const home = (r + i) % 2 === 0 ? a : b;
          ties.push({ home, away: home === a ? b : a, played: false, hg: 0, ag: 0 });
        }
        rounds.push(ties);
        rot.unshift(rot.pop());
      }
      const second = rounds.map(rd => rd.map(t => ({ home: t.away, away: t.home, played: false, hg: 0, ag: 0 })));
      return rounds.concat(second);
    },

    createTournament(compId, teamId) {
      const comp = PES.getCompetition(compId);
      if (!comp) return null;
      const pool = this.poolForComp(comp).map(t => t.id);
      if (!pool.includes(teamId) && pool.length) pool[pool.length - 1] = teamId;
      if (comp.type === 'league') {
        return {
          compId, type: 'league', teamId, season: 2027, pool,
          rounds: this.roundRobin(pool), round: 0,
          finished: false, champion: null, rewarded: false, createdAt: Date.now()
        };
      }
      const size = comp.size || 8;
      const names = roundNames(size);
      const seeded = shuffle(pool.slice(0, size));
      const rounds = [];
      let count = size / 2;
      names.forEach((name, stage) => {
        const ties = [];
        for (let i = 0; i < count; i++) {
          if (stage === 0) ties.push({ a: seeded[i * 2], b: seeded[i * 2 + 1], sa: 0, sb: 0, pensA: 0, pensB: 0, played: false, winner: null });
          else ties.push({ a: null, b: null, sa: 0, sb: 0, pensA: 0, pensB: 0, played: false, winner: null });
        }
        rounds.push({ name, ties });
        count = Math.max(1, count / 2);
      });
      return {
        compId, type: 'cup', teamId, season: 2027, pool: seeded,
        rounds, round: 0, finished: false, champion: null, eliminated: false, rewarded: false, createdAt: Date.now()
      };
    },

    nextTournamentFixture(state) {
      if (!state || state.finished) return null;
      if (state.type === 'league') {
        for (let r = state.round; r < state.rounds.length; r++) {
          const tie = state.rounds[r].find(t => !t.played && (t.home === state.teamId || t.away === state.teamId));
          if (!tie) continue;
          const home = tie.home === state.teamId;
          return {
            opponent: home ? tie.away : tie.home, home,
            label: `Rodada ${r + 1}`, dateText: dateFor(r - state.round),
            roundIndex: r, tieIndex: state.rounds[r].indexOf(tie), tie
          };
        }
        return null;
      }
      const round = state.rounds[state.round];
      if (!round) return null;
      const idx = round.ties.findIndex(t => !t.winner && (t.a === state.teamId || t.b === state.teamId));
      if (idx < 0) return null;
      const tie = round.ties[idx];
      const home = tie.a === state.teamId;
      return {
        opponent: home ? tie.b : tie.a, home,
        label: round.name, dateText: dateFor(0),
        roundIndex: state.round, tieIndex: idx, tie
      };
    },

    tableOf(state) {
      const rows = {};
      state.pool.forEach(id => { rows[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });
      state.rounds.forEach(round => round.forEach(t => {
        if (!t.played) return;
        if (!rows[t.home] || !rows[t.away]) return;
        const h = rows[t.home], a = rows[t.away];
        h.p++; a.p++; h.gf += t.hg; h.ga += t.ag; a.gf += t.ag; a.ga += t.hg;
        if (t.hg > t.ag) { h.w++; a.l++; h.pts += 3; }
        else if (t.hg < t.ag) { a.w++; h.l++; a.pts += 3; }
        else { h.d++; a.d++; h.pts++; a.pts++; }
      }));
      return Object.values(rows).sort((a, b) =>
        b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || team(a.id).name.localeCompare(team(b.id).name));
    },

    tableHTML(state, highlight) {
      const rows = this.tableOf(state);
      return `<div class="table-wrap"><table>
        <thead><tr><th class="num">#</th><th>Equipe</th><th class="num">J</th><th class="num">V</th><th class="num">E</th><th class="num">D</th><th class="num">GP</th><th class="num">GC</th><th class="num">SG</th><th class="num">PTS</th></tr></thead>
        <tbody>${rows.map((row, i) => {
          const t = team(row.id);
          const zone = i < 4 ? 'zone-champ' : i < 6 ? 'zone-lib' : i >= rows.length - 4 ? 'zone-rel' : i < 8 ? 'zone-sul' : '';
          return `<tr class="${row.id === highlight ? 'user' : ''}">
            <td class="num pos"><span class="zone-dot ${zone}"></span>${i + 1}</td>
            <td class="team-cell">${this.crest(t, 24)}<span>${esc(t.name)}</span></td>
            <td class="num">${row.p}</td><td class="num">${row.w}</td><td class="num">${row.d}</td><td class="num">${row.l}</td>
            <td class="num">${row.gf}</td><td class="num">${row.ga}</td><td class="num">${row.gf - row.ga > 0 ? '+' : ''}${row.gf - row.ga}</td>
            <td class="num"><b>${row.pts}</b></td></tr>`;
        }).join('')}</tbody></table></div>`;
    },

    bracketHTML(state) {
      return `<div class="bracket">${state.rounds.map((round, ri) => `
        <div class="bracket-round"><h4>${esc(round.name)}</h4>
        ${round.ties.map(tie => {
          const a = tie.a ? team(tie.a) : null, b = tie.b ? team(tie.b) : null;
          const userA = tie.a === state.teamId, userB = tie.b === state.teamId;
          const winA = tie.winner && tie.winner === tie.a, winB = tie.winner && tie.winner === tie.b;
          const pen = tie.pensA || tie.pensB ? ` <small>(${tie.pensA}-${tie.pensB})</small>` : '';
          return `<div class="tie">
            <div class="tie-row ${winA ? 'win' : winB ? 'lose' : ''} ${userA ? 'user' : ''}">
              ${a ? this.crest(a, 20) : '<span style="width:20px"></span>'}<span class="t-name">${a ? esc(a.name) : 'A definir'}</span><span class="t-score">${tie.played || tie.winner ? tie.sa : ''}</span>
            </div>
            <div class="tie-row ${winB ? 'win' : winA ? 'lose' : ''} ${userB ? 'user' : ''}">
              ${b ? this.crest(b, 20) : '<span style="width:20px"></span>'}<span class="t-name">${b ? esc(b.name) : 'A definir'}</span><span class="t-score">${tie.played || tie.winner ? tie.sb : ''}</span>
            </div>
          </div>`;
        }).join('')}
        </div>`).join('')}</div>`;
    },

    userFixturesHTML(state) {
      return state.rounds.map((round, ri) => {
        const tie = round.find(t => t.home === state.teamId || t.away === state.teamId);
        if (!tie) return '';
        const home = tie.home === state.teamId, opp = team(home ? tie.away : tie.home);
        return `<div class="fixture ${!tie.played && ri === state.round ? 'next' : ''}">
          <span class="fx-date">Rod. ${ri + 1}</span>
          <div class="fx-teams">${this.crest(opp, 24)}<span>${home ? 'vs' : '@'} ${esc(opp.name)}</span></div>
          <span class="fx-score">${tie.played ? `${tie.hg} - ${tie.ag}` : '—'}</span>
        </div>`;
      }).join('');
    },

    simTie(aId, bId, knockout) {
      const A = team(aId), B = team(bId);
      const diff = ((A ? A.rating : 80) - (B ? B.rating : 80)) / 14;
      let sa = Math.round(1.15 + diff + (Math.random() - .5) * 2.4);
      let sb = Math.round(1.15 - diff + (Math.random() - .5) * 2.4);
      sa = clamp(sa, 0, 5); sb = clamp(sb, 0, 5);
      let pensA = 0, pensB = 0, winner = sa > sb ? aId : sb > sa ? bId : null;
      if (knockout && sa === sb) {
        pensA = 3 + Math.floor(Math.random() * 3);
        pensB = pensA + (Math.random() < .5 ? -1 : 1);
        if (pensB < 0) pensB = 0;
        if (pensA === pensB) pensB++;
        winner = pensA > pensB ? aId : bId;
      }
      return { sa, sb, pensA, pensB, winner };
    },

    setCupWinner(tie) {
      if (tie.winner) return;
      if (!tie.a || !tie.b) { tie.winner = tie.a || tie.b; return; }
      tie.played = true;
      if (tie.sa === tie.sb) {
        let pa = 3 + Math.floor(Math.random() * 3), pb = pa + (Math.random() < .5 ? -1 : 1);
        if (pb < 0) pb = 0;
        if (pa === pb) pb++;
        tie.pensA = pa; tie.pensB = pb;
        tie.winner = pa > pb ? tie.a : tie.b;
      } else tie.winner = tie.sa > tie.sb ? tie.a : tie.b;
    },

    simulateTournamentRound(state) {
      if (!state || state.finished) return;
      if (state.type === 'league') {
        if (state.round >= state.rounds.length) return;
        state.rounds[state.round].forEach(t => {
          if (t.played) return;
          const r = this.simTie(t.home, t.away, false);
          t.played = true; t.hg = r.sa; t.ag = r.sb;
        });
        state.round++;
        this.checkTournamentEnd(state);
        return;
      }
      const round = state.rounds[state.round];
      if (!round) return;
      round.ties.forEach(t => {
        if (t.winner) return;
        if (!t.a || !t.b) { t.winner = t.a || t.b; return; }
        const r = this.simTie(t.a, t.b, true);
        t.sa = r.sa; t.sb = r.sb; t.pensA = r.pensA; t.pensB = r.pensB;
        t.winner = r.winner; t.played = true;
        if ((t.a === state.teamId || t.b === state.teamId) && t.winner !== state.teamId) state.eliminated = true;
      });
      this.advanceCupRound(state);
    },

    advanceCupRound(state) {
      const round = state.rounds[state.round];
      if (!round) return;
      round.ties.forEach(t => {
        if (t.winner) return;
        if (t.played) { this.setCupWinner(t); return; }
        if (!t.a || !t.b) { t.winner = t.a || t.b; return; }
        const r = this.simTie(t.a, t.b, true);
        t.sa = r.sa; t.sb = r.sb; t.pensA = r.pensA; t.pensB = r.pensB;
        t.winner = r.winner; t.played = true;
        if ((t.a === state.teamId || t.b === state.teamId) && t.winner !== state.teamId) state.eliminated = true;
      });
      if (state.round >= state.rounds.length - 1) { this.checkTournamentEnd(state); return; }
      const winners = round.ties.map(t => t.winner).filter(Boolean);
      const next = state.rounds[state.round + 1];
      next.ties.forEach((t, i) => {
        t.a = winners[i * 2] || null;
        t.b = winners[i * 2 + 1] || null;
        t.sa = t.sb = t.pensA = t.pensB = 0;
        t.played = false; t.winner = null;
      });
      state.round++;
      this.checkTournamentEnd(state);
    },

    checkTournamentEnd(state) {
      if (!state || state.finished) return;
      if (state.type === 'league') {
        if (state.round < state.rounds.length) return;
        state.finished = true;
        state.champion = this.tableOf(state)[0]?.id || null;
      } else {
        const final = state.rounds[state.rounds.length - 1];
        const tie = final && final.ties[0];
        if (!tie || !tie.winner) return;
        state.finished = true;
        state.champion = tie.winner;
        if (tie.a === state.teamId || tie.b === state.teamId) {
          if (tie.winner !== state.teamId) state.eliminated = true;
        }
      }
      if (state.finished) this.rewardTournament(state);
    },

    rewardTournament(state) {
      if (!state || !state.finished || state.rewarded) return;
      state.rewarded = true;
      const comp = PES.getCompetition(state.compId);
      const won = state.champion === state.teamId;
      const base = state.type === 'league' ? 1400 : 900;
      const coins = base + (won ? (state.type === 'league' ? 1600 : 2100) : 250);
      this.award(coins);
      if (won) {
        this.save.trophies.push({ name: comp.name, club: team(state.teamId).name, compId: comp.id, year: 2027, date: Date.now() });
        if (AU) AU.achievement && AU.achievement();
      }
      state.rewardCoins = coins;
      state.won = won;
    },

    applyTournamentResult(state, meta, res) {
      if (!state || !meta) return;
      const round = state.rounds[meta.roundIndex];
      if (!round) return;
      if (state.type === 'cup') {
        const tie = round.ties && round.ties[meta.tieIndex];
        if (!tie) return;
        tie.played = true;
        tie.sa = res.homeScore; tie.sb = res.awayScore;
        if (tie.sa === tie.sb) {
          const pa = 3 + Math.floor(Math.random() * 3), pb = pa + (Math.random() < .5 ? -1 : 1);
          tie.pensA = pa; tie.pensB = pb > 0 ? pb : 0;
          if (tie.pensA === tie.pensB) tie.pensB++;
          tie.winner = tie.pensA > tie.pensB ? tie.a : tie.b;
        } else tie.winner = tie.sa > tie.sb ? tie.a : tie.b;
        if ((tie.a === state.teamId || tie.b === state.teamId) && tie.winner !== state.teamId) state.eliminated = true;
        state.sa = tie.sa; state.sb = tie.sb;
        this.advanceCupRound(state);
      } else {
        const tie = round[meta.tieIndex];
        if (!tie) return;
        tie.played = true;
        tie.hg = res.homeScore; tie.ag = res.awayScore;
        round.forEach(t => {
          if (t.played) return;
          const r = this.simTie(t.home, t.away, false);
          t.played = true; t.hg = r.sa; t.ag = r.sb;
        });
        state.round = Math.max(state.round, meta.roundIndex + 1);
        this.checkTournamentEnd(state);
      }
      this.saveNow(true);
    },

    /* ---------------- Match setup ---------------- */
    startMatch(opts) {
      if (this.match) return;
      const home = team(opts.homeId), away = team(opts.awayId);
      if (!home || !away) { this.toast('Times inválidos'); return; }
      const config = Object.assign({
        duration: this.setup.duration, difficulty: this.setup.difficulty,
        weather: this.setup.weather, timeOfDay: this.setup.timeOfDay,
        camera: this.setup.camera, replayAuto: this.save.settings.replayAuto,
        stadium: this.setup.stadium || home.stadium, humans: ['home']
      }, opts.config || {});
      if (config.humans.includes('away')) config.humans = ['home', 'away'];
      this.st.activeSide = config.humans[0] || 'home';
      this.matchContext = {
        homeId: opts.homeId, awayId: opts.awayId, config,
        meta: opts.meta || { kind: 'friendly', label: 'Partida amistosa' },
        squads: opts.squads || null
      };
      this.matchContext.meta.rematch = { homeId: opts.homeId, awayId: opts.awayId, config: Object.assign({}, config), meta: Object.assign({}, this.matchContext.meta) };
      this.go('match', this.matchContext);
    },

    bootMatch() {
      const ctx = this.matchContext;
      if (!ctx) return;
      const canvas = $('match-canvas'), minimap = $('minimap-canvas');
      if (!canvas) return;
      const home = team(ctx.homeId), away = team(ctx.awayId);
      this.match = new PES.Match({
        homeTeam: home, awayTeam: away,
        homeSquad: (ctx.squads && ctx.squads.home) || undefined,
        awaySquad: (ctx.squads && ctx.squads.away) || undefined,
        config: ctx.config,
        onHud: (h) => this.onHud(h),
        onEvent: (ev) => this.onMatchEvent(ev),
        onState: (st) => this.onMatchState(st),
        onEnd: (res) => this.onMatchEnd(res)
      });
      this.match.start(canvas, minimap);
      this.bindMatchControls();
      this.bindKeyboard();
      this.bindTilt();
      if (this.save.settings.hintSeen === false) this.showMatchHint();
      this.onHud({ homeScore: 0, awayScore: 0, clock: "0'", homePoss: 50, half: 1, state: 'kickoff' });
    },

    bindMatchControls() {
      const match = this.match;
      document.querySelectorAll('.joystick-zone[data-side]').forEach(zone => {
        const side = zone.dataset.side;
        const knob = zone.querySelector('.stick-knob');
        let active = false, id = null;
        const set = (e) => {
          const r = zone.getBoundingClientRect();
          let dx = e.clientX - (r.left + r.width / 2);
          let dy = e.clientY - (r.top + r.height / 2);
          const max = r.width * .34;
          const len = Math.hypot(dx, dy);
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
          const nx = dx / max, ny = dy / max;
          this.st.joystick[side] = true;
          this.st.tilt.active = false;
          this.setInput(side, 'x', nx);
          this.setInput(side, 'y', ny);
        };
        zone.addEventListener('pointerdown', (e) => { active = true; id = e.pointerId; zone.setPointerCapture(id); set(e); e.preventDefault(); });
        zone.addEventListener('pointermove', (e) => { if (active && e.pointerId === id) { set(e); e.preventDefault(); } });
        const end = (e) => {
          if (!active) return;
          active = false;
          this.st.joystick[side] = false;
          if (knob) knob.style.transform = 'translate(-50%, -50%)';
          this.setInput(side, 'x', 0); this.setInput(side, 'y', 0);
        };
        zone.addEventListener('pointerup', end);
        zone.addEventListener('pointercancel', end);
        zone.addEventListener('pointerleave', (e) => { if (active && e.buttons === 0) end(e); });
      });

      document.querySelectorAll('#match-controls [data-hold]').forEach(btn => {
        const side = btn.dataset.side || 'home';
        const key = btn.dataset.hold;
        const press = (e) => {
          e.preventDefault();
          btn.classList.add('pressed');
          if (key === 'tackle' || key === 'skill') {
            this.setInput(side, key, true);
            setTimeout(() => this.setInput(side, key, false), 110);
          } else this.setInput(side, key, true);
        };
        const release = () => {
          btn.classList.remove('pressed');
          if (key !== 'tackle' && key !== 'skill') this.setInput(side, key, false);
        };
        btn.addEventListener('pointerdown', press);
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('pointerleave', release);
      });
    },

    bindKeyboard() {
      this.unbindKeyboard();
      const keys = this.st.keys = {};
      const apply = () => {
        const side = this.st.activeSide || 'home';
        const x = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
        const y = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
        this.setInput(side, 'x', x); this.setInput(side, 'y', y);
        this.setInput(side, 'sprint', !!(keys.ShiftLeft || keys.ShiftRight));
        this.setInput(side, 'passHeld', !!keys.KeyJ);
        this.setInput(side, 'shootHeld', !!keys.KeyK);
      };
      this._keyDown = (e) => {
        if (!this.match) return;
        if (e.code === 'Escape') { this.togglePause(); e.preventDefault(); return; }
        keys[e.code] = true;
        const side = this.st.activeSide || 'home';
        if (e.code === 'KeyL' && !e.repeat) { this.setInput(side, 'tackle', true); setTimeout(() => this.setInput(side, 'tackle', false), 110); }
        if (e.code === 'KeyU' && !e.repeat) { this.setInput(side, 'skill', true); setTimeout(() => this.setInput(side, 'skill', false), 110); }
        if (e.code === 'KeyP' && !e.repeat) this.togglePause();
        apply();
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      };
      this._keyUp = (e) => { keys[e.code] = false; apply(); };
      window.addEventListener('keydown', this._keyDown);
      window.addEventListener('keyup', this._keyUp);
    },

    unbindKeyboard() {
      if (this._keyDown) window.removeEventListener('keydown', this._keyDown);
      if (this._keyUp) window.removeEventListener('keyup', this._keyUp);
      this._keyDown = this._keyUp = null;
    },

    bindTilt() {
      this.unbindTilt();
      if (!this.setup.tilt || !window.DeviceOrientationEvent) return;
      this._tilt = (e) => {
        if (!this.match) return;
        const x = clamp((e.gamma || 0) / 26, -1, 1);
        const y = clamp(((e.beta || 0) - 42) / 26, -1, 1);
        const side = this.st.activeSide || 'home';
        if (this.st.joystick[side]) return;
        this.setInput(side, 'x', Math.abs(x) > .08 ? x : 0);
        this.setInput(side, 'y', Math.abs(y) > .08 ? y : 0);
      };
      window.addEventListener('deviceorientation', this._tilt);
    },

    unbindTilt() {
      if (this._tilt) window.removeEventListener('deviceorientation', this._tilt);
      this._tilt = null;
    },

    onHud(h) {
      if (!h) return;
      const sh = $('sb-h'), sa = $('sb-a'), clock = $('sb-clock');
      if (sh) sh.textContent = h.homeScore;
      if (sa) sa.textContent = h.awayScore;
      if (clock) clock.textContent = h.training ? 'TREINO' : (h.clock || "0'");
    },

    onMatchEvent(ev) {
      if (!this.match || !ev) return;
      if (ev.type === 'goal') {
        const ov = $('goal-overlay');
        if (ov) {
          ov.className = 'goal-overlay show';
          const word = ov.querySelector('.g-word');
          if (word) { word.textContent = 'GOL!'; word.className = 'g-word ' + (ev.side === 'away' ? 'away' : ''); }
          const sc = ov.querySelector('.g-scorer');
          if (sc) sc.textContent = ev.player ? `#${ev.player.number} ${ev.player.name}` : 'Gol!';
          const sub = ov.querySelector('.g-sub');
          if (sub) sub.textContent = ev.ownGoal ? 'Gol contra' : (ev.assist ? `Assistência: ${ev.assist.name}` : 'Boa jogada coletiva');
          clearTimeout(this._goalT);
          this._goalT = setTimeout(() => { ov.className = 'goal-overlay'; }, 2100);
        }
        this.vibrate(35);
      }
      if (ev.text && !['commentary', 'goal', 'halftime', 'fulltime', 'sub', 'trainingGoal'].includes(ev.type)) {
        const c = $('match-commentary');
        if (c) { c.innerHTML = ev.text; c.classList.add('show'); clearTimeout(this._commT); this._commT = setTimeout(() => c.classList.remove('show'), 2800); }
      } else if (ev.type === 'commentary' && ev.text) {
        const c = $('match-commentary');
        if (c) { c.innerHTML = ev.text; c.classList.add('show'); clearTimeout(this._commT); this._commT = setTimeout(() => c.classList.remove('show'), 3400); }
      }
      if (ev.type === 'sub') this.toast(`${ev.player.name} entrou`, 'good');
    },

    onMatchState(st) {
      if (!st) return;
      if (st.type === 'halftime') this.openHalftime();
      if (st.type === 'kickoff') this.hideReplayUI();
      if (st.type === 'replay') {
        const b = $('replay-banner'), s = $('replay-skip');
        if (b) b.classList.remove('hidden');
        if (s) s.classList.remove('hidden');
      }
      if (st.type === 'fulltime') {
        if (this._endT) clearTimeout(this._endT);
      }
    },

    onMatchEnd(res) {
      if (!this.match) return;
      const meta = (this.matchContext && this.matchContext.meta) || { kind: 'friendly' };
      this._endT = setTimeout(() => {
        this.completeMatch(res, meta);
      }, 1600);
    },

    completeMatch(res, meta) {
      const m = this.match;
      if (m) m.stop();
      this.unbindKeyboard();
      this.unbindTilt();
      this.match = null;
      this.hideMatchOverlay();
      this.hideReplayUI();
      if (meta.kind === 'tournament' && this.save.tournament) this.applyTournamentResult(this.save.tournament, meta, res);
      if (meta.kind === 'career' && this.applyCareerResult) this.applyCareerResult(res, meta);
      if (meta.kind === 'legend' && this.applyLegendResult) this.applyLegendResult(res, meta);

      const userSide = meta.userSide || 'home';
      const hg = res.homeScore, ag = res.awayScore;
      const ug = userSide === 'home' ? hg : ag, og = userSide === 'home' ? ag : hg;
      const goalsFor = ug, goalsAgainst = og;
      let coins = 0, rewardLines = [];
      if (!res.training && meta.countStats !== false) {
        const st = this.save.stats;
        st.matches++;
        st.goals += goalsFor;
        if (ug > og) st.wins++; else if (ug === og) st.draws++; else st.losses++;
        if (og === 0) st.cleanSheets++;
        coins = 120 + goalsFor * 35 + (ug > og ? 180 : ug === og ? 80 : 0);
        rewardLines.push(['Bônus de partida', coins]);
      }
      if (res.training && res.trainingStats) {
        const ts = res.trainingStats;
        coins = 40 + ts.goals * 40 + ts.passes * 2 + ts.shots * 3;
        rewardLines.push(['Treino concluído', coins]);
      }
      if (coins) { this.award(coins); }
      if (meta.kind === 'tournament' && this.save.tournament && this.save.tournament.rewardCoins) {
        rewardLines.push(['Premiação da competição', this.save.tournament.rewardCoins]);
      }
      this.saveNow(true);

      const ctx = Object.assign({}, res, {
        meta, coins, rewardLines,
        userSide, userGoals: goalsFor, userConceded: goalsAgainst,
        continue: meta.continue || { screen: 'menu' }
      });
      this.lastResult = ctx;
      this.go('result', ctx, { replace: true });
    },

    hideMatchOverlay() {
      const el = $('match-overlay');
      if (el) el.innerHTML = '';
    },

    hideReplayUI() {
      const b = $('replay-banner'), s = $('replay-skip');
      if (b) b.classList.add('hidden');
      if (s) s.classList.add('hidden');
    },

    showMatchHint() {
      if (!this.match) return;
      this.match.pause();
      const ov = $('match-overlay');
      if (!ov) return;
      ov.innerHTML = `<div class="hint-overlay"><div class="hint-card">
        <h3>Controles</h3>
        <p>Arraste o joystick para se movimentar. Segure PASSE ou CHUTE para carregar a força. Use DESARME e DRIBLE no momento certo.</p>
        <div class="hint-keys">
          <div><kbd>WASD</kbd> Mover</div><div><kbd>J</kbd> Passe</div>
          <div><kbd>K</kbd> Chute</div><div><kbd>Shift</kbd> Correr</div>
          <div><kbd>L</kbd> Desarme</div><div><kbd>U</kbd> Drible</div>
        </div>
        <button class="btn primary block" data-action="match-hint-ok">Entendi, vamos jogar</button>
      </div></div>`;
    },

    togglePause() {
      if (!this.match) return;
      if (this.match.paused) this.resumeMatch();
      else this.openPause();
    },

    openPause() {
      if (!this.match) return;
      this.match.pause();
      this._overlayMode = 'pause';
      const ov = $('match-overlay');
      if (!ov) return;
      const isTraining = !!this.match.training;
      ov.innerHTML = `<div class="match-pause"><div class="pause-panel">
        <h2>Pausa</h2><p class="p-sub">${isTraining ? 'Sessão de treino' : `${esc(this.match.homeTeam.name)} ${this.match.home.score} x ${this.match.away.score} ${esc(this.match.awayTeam.name)}`}</p>
        <div class="pause-grid">
          <button class="btn primary" data-action="match-resume">Continuar</button>
          ${isTraining ? `<button class="btn" data-action="match-end-training">Encerrar treino</button>` : `<button class="btn" data-action="match-subs">Substituições</button>`}
          <button class="btn" data-action="match-camera-cycle">Câmera: ${this.cameraName()}</button>
          <button class="btn" data-action="match-toggle-replay">Replay: ${this.save.settings.replayAuto ? 'Sim' : 'Não'}</button>
          <button class="btn dark" data-action="match-quit">Sair da partida</button>
        </div>
        <div class="row" style="margin-top:16px;gap:8px"><span class="chip">${this.icon('camera')} ${esc(this.match.config.stadium || '')}</span><span class="chip">${this.icon('weather')} ${esc(this.match.config.weather)}</span><span class="chip">${this.icon('clock')} ${this.match.clockText()}</span></div>
      </div></div>`;
    },

    resumeMatch() {
      this.hideMatchOverlay();
      if (this.match) this.match.resume();
    },

    cameraName() {
      const names = { dynamic: 'Dinâmica', broadcast: 'TV', close: 'Close', top: 'Aérea', player: 'Jogador' };
      return names[(this.match && this.match.cameraMode) || this.setup.camera] || 'Dinâmica';
    },

    cycleCamera() {
      const order = ['dynamic', 'broadcast', 'close', 'top', 'player'];
      if (!this.match) return;
      const next = order[(order.indexOf(this.match.cameraMode) + 1) % order.length];
      this.match.setCamera(next);
      this.setup.camera = next;
      if (this._overlayMode === 'pause') this.openPause();
      else this.toast('Câmera: ' + this.cameraName());
    },

    openSubs() {
      if (!this.match) return;
      const side = this.st.activeSide || 'home';
      const bench = this.match.getBench(side);
      const field = this.match.getLineup(side);
      if (this._overlayMode !== 'halftime') this._overlayMode = 'pause';
      const ov = $('match-overlay');
      ov.innerHTML = `<div class="match-pause"><div class="pause-panel">
        <h2>Substituições</h2><p class="p-sub">${field.length} em campo · ${bench.length} no banco · ${5 - this.match[side].substitutions} restantes</p>
        <button class="btn small" data-action="match-subs-back" style="margin-bottom:13px">Voltar</button>
        <div class="player-list">
          ${bench.map(p => `<div class="player-row">
            <span class="num">${p.number}</span><span class="p-name">${esc(p.name)}<small>${esc(p.pos)} · ${p.age} anos</small></span>
            <span class="p-pos">${esc(p.pos)}</span><span class="p-ovr">${p.ovr}</span><span class="p-val">${p.sta} STA</span>
            <button class="btn small" data-action="do-sub" data-in="${p.id}" ${this.match[side].substitutions >= 5 ? 'disabled' : ''}>Entrar</button>
          </div>`).join('') || '<div class="empty">Banco vazio.</div>'}
        </div>
      </div></div>`;
    },

    openHalftime() {
      if (!this.match) return;
      this._overlayMode = 'halftime';
      const m = this.match;
      const s = this.halfStats();
      const ov = $('match-overlay');
      if (!ov) return;
      ov.innerHTML = `<div class="halftime"><div class="halftime-card">
        <h2>Intervalo</h2>
        <div class="halftime-score">
          ${this.crest(m.homeTeam, 54)}<b>${m.home.score}</b><span class="muted">x</span><b>${m.away.score}</b>${this.crest(m.awayTeam, 54)}
        </div>
        <div class="stats-grid">
          <div class="st-h">${s.home[0]}%</div><div class="st-label">Posse</div><div class="st-a">${s.away[0]}%</div>
          <div class="st-h">${s.home[1]}</div><div class="st-label">Finalizações</div><div class="st-a">${s.away[1]}</div>
          <div class="st-h">${s.home[2]}</div><div class="st-label">No alvo</div><div class="st-a">${s.away[2]}</div>
          <div class="st-h">${s.home[3]}</div><div class="st-label">Passes certos</div><div class="st-a">${s.away[3]}</div>
          <div class="st-h">${s.home[4]}</div><div class="st-label">Faltas</div><div class="st-a">${s.away[4]}</div>
        </div>
        <div class="pause-grid" style="margin-top:18px">
          <button class="btn primary" data-action="match-resume-second-half">Iniciar segundo tempo</button>
          <button class="btn" data-action="match-subs">Substituições</button>
        </div>
      </div></div>`;
    },

    halfStats() {
      const m = this.match;
      if (!m) return { home: [50, 0, 0, 0, 0], away: [50, 0, 0, 0, 0] };
      const total = m.home.stats.possession + m.away.stats.possession;
      const mk = (t, poss) => [poss, t.shots, t.onTarget, t.passCompleted, t.fouls];
      return {
        home: mk(m.home.stats, total ? Math.round(m.home.stats.possession / total * 100) : 50),
        away: mk(m.away.stats, total ? Math.round(m.away.stats.possession / total * 100) : 50)
      };
    },

    /* ---------------- Result ---------------- */
    resultHTML(ctx) {
      ctx = ctx || this.lastResult || {};
      if (ctx.training) return this.trainingResultHTML(ctx);
      const home = ctx.homeTeam || team(ctx.meta && ctx.meta.homeId) || PES.teams[0];
      const away = ctx.awayTeam || team(ctx.meta && ctx.meta.awayId) || PES.teams[1];
      const hg = ctx.homeScore || 0, ag = ctx.awayScore || 0;
      const meta = ctx.meta || {};
      const userSide = ctx.userSide || 'home';
      const ug = userSide === 'home' ? hg : ag, og = userSide === 'home' ? ag : hg;
      const win = ug > og, draw = ug === og;
      const st = (ctx.stats && ctx.stats.home) || {};
      const at = (ctx.stats && ctx.stats.away) || {};
      const statRow = (label, a, b) => `<div class="st-h">${a}</div><div class="st-label">${label}</div><div class="st-a">${b}</div>`;
      const scorers = (ctx.scorers || []).filter(s => s.goals > 0);
      const top = (ctx.players || []).slice(0, 6);
      const tag = meta.kind === 'tournament'
        ? (this.save.tournament && this.save.tournament.finished && this.save.tournament.champion === this.save.tournament.teamId ? 'CAMPEÃO!' : win ? 'VITÓRIA' : draw ? 'EMPATE' : 'DERROTA')
        : (win ? 'VITÓRIA' : draw ? 'EMPATE' : 'DERROTA');
      return `<div class="result-screen">
        <div class="result-hero">
          <div class="r-eyebrow">${esc(meta.label || 'Partida amistosa')}${meta.stadium ? ' · ' + esc(meta.stadium) : ''}</div>
          <div class="result-score">
            <div class="rs-team">${this.crest(home, 70)}<b>${esc(home.name)}</b></div>
            <div class="rs-num">${hg}<span>x</span>${ag}</div>
            <div class="rs-team">${this.crest(away, 70)}<b>${esc(away.name)}</b></div>
          </div>
          <span class="result-tag">${tag}</span>
        </div>
        <div class="result-grid">
          <div>
            <div class="card">
              <div class="card-title">Estatísticas da partida</div>
              <div class="stats-grid">
                ${statRow('Posse de bola', (st.possession != null ? st.possession : 50) + '%', (at.possession != null ? at.possession : 50) + '%')}
                ${statRow('Finalizações', st.shots || 0, at.shots || 0)}
                ${statRow('No alvo', st.onTarget || 0, at.onTarget || 0)}
                ${statRow('Passes certos', st.passCompleted || 0, at.passCompleted || 0)}
                ${statRow('Faltas', st.fouls || 0, at.fouls || 0)}
                ${statRow('Escanteios', st.corners || 0, at.corners || 0)}
                ${statRow('Defesas', st.saves || 0, at.saves || 0)}
                ${statRow('Cartões', st.cards || 0, at.cards || 0)}
              </div>
            </div>
            <div class="card" style="margin-top:12px">
              <div class="card-title">Gols</div>
              ${scorers.length ? scorers.map(s => `<div class="reward-row"><span>${esc(s.name)} <small class="muted">(${s.team === 'home' ? esc(home.short) : esc(away.short)})</small></span><b>${s.goals}</b></div>`).join('') : '<div class="muted" style="font-size:12px">Jogo sem gols.</div>'}
            </div>
            <div class="card" style="margin-top:12px">
              <div class="card-title">Melhores em campo</div>
              <div class="player-list">
                ${top.map(p => `<div class="player-row" style="grid-template-columns:34px minmax(0,1fr) 54px 54px 54px">
                  <span class="num">${p.number}</span>
                  <span class="p-name">${esc(p.name)}<small>${p.team === 'home' ? esc(home.short) : esc(away.short)} · ${p.goals || 0} gol(s) · ${p.assists || 0} assist.</small></span>
                  <span class="p-pos">${esc(p.pos)}</span>
                  <span class="p-ovr">${p.ovr}</span>
                  <span class="p-rating">${(p.rating || 6).toFixed(1)}</span>
                </div>`).join('')}
              </div>
            </div>
          </div>
          <div>
            <div class="card">
              <div class="card-title">Melhor da partida</div>
              ${ctx.mvp ? `<div class="mvp-card">${this.crest(ctx.mvp.team === 'home' ? home : away, 44)}<div><b>${esc(ctx.mvp.name)}</b><span>${esc(ctx.mvp.pos)} · Nota ${(ctx.mvp.rating || 0).toFixed(1)}</span></div><div class="p-rating" style="margin-left:auto">${(ctx.mvp.rating || 0).toFixed(1)}</div></div>` : '<div class="muted">Sem destaque.</div>'}
            </div>
            <div class="card" style="margin-top:12px">
              <div class="card-title">Recompensas</div>
              ${(ctx.rewardLines || []).map(([label, v]) => `<div class="reward-row"><span>${esc(label)}</span><b>+${v}</b></div>`).join('') || '<div class="reward-row"><span>Sem recompensas</span><b>—</b></div>'}
              <div class="reward-row"><span>Moedas totais</span><b>${this.save.profile.coins}</b></div>
            </div>
            ${meta.kind === 'tournament' ? `<div class="card" style="margin-top:12px"><div class="card-title">Competição</div><p style="font-size:12px;color:var(--muted);margin:0">${esc(meta.label || '')}</p><button class="btn block primary" style="margin-top:14px" data-action="result-continue">${this.icon('trophy')} Ver competição</button></div>` : ''}
            <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap">
              ${meta.kind === 'friendly' ? `<button class="btn" data-action="result-again">${this.icon('replay')} Jogar de novo</button>` : ''}
              <button class="btn primary" data-action="result-continue">Continuar</button>
            </div>
            <button class="btn block" style="margin-top:8px" data-action="menu">Voltar ao menu</button>
          </div>
        </div>
      </div>`;
    },

    trainingResultHTML(ctx) {
      const ts = ctx.trainingStats || {};
      return `<div class="result-screen">
        <div class="result-hero">
          <div class="r-eyebrow">Sessão de treino</div>
          <h1 style="font-family:Impact,'Arial Black',sans-serif;font-style:italic;font-size:54px;margin:8px 0 0;text-transform:uppercase">Treino concluído</h1>
          <div class="result-tag">${(ctx.coins || 0)} moedas ganhas</div>
        </div>
        <div class="result-grid">
          <div class="card">
            <div class="card-title">Números do treino</div>
            <div class="reward-row"><span>Gols</span><b>${ts.goals || 0}</b></div>
            <div class="reward-row"><span>Finalizações</span><b>${ts.shots || 0}</b></div>
            <div class="reward-row"><span>Passes</span><b>${ts.passes || 0}</b></div>
            <div class="reward-row"><span>Defesas do goleiro</span><b>${ts.saves || 0}</b></div>
            <div class="reward-row"><span>Distância percorrida</span><b>${Math.round(ts.distance || 0)} m</b></div>
          </div>
          <div class="card">
            <div class="card-title">Próximo passo</div>
            <p class="muted" style="font-size:12px;line-height:1.6">Repita o treino para evoluir seu controle de bola, ou volte ao menu para disputar uma partida oficial.</p>
            <button class="btn primary block" style="margin-top:12px" data-action="result-again">Treinar de novo</button>
            <button class="btn block" style="margin-top:8px" data-action="result-continue">Voltar</button>
          </div>
        </div>
      </div>`;
    },

    /* ---------------- Match screen ---------------- */
    matchScreenHTML() {
      const ctx = this.matchContext || {};
      const home = team(ctx.homeId) || PES.teams[0];
      const away = team(ctx.awayId) || PES.teams[1];
      const config = ctx.config || this.setup;
      const duo = config.humans && config.humans.includes('away');
      const side = this.st.activeSide || 'home';
      const wLabel = { limpo: 'Limpo', chuva: 'Chuva', neve: 'Neve', neblina: 'Neblina' };
      const tLabel = { dia: 'Dia', entardecer: 'Tarde', noite: 'Noite' };
      const pad = (side) => `
        <div class="duo-pad ${side}">
          <div class="joystick-zone" data-side="${side}"><div class="joystick"><div class="stick-knob"></div></div></div>
          <div class="action-cluster">
            <button class="act-btn act-pass" data-hold="passHeld" data-side="${side}"><span>P</span><small>PASSE</small></button>
            <button class="act-btn act-shoot" data-hold="shootHeld" data-side="${side}"><span>C</span><small>CHUTE</small></button>
            <button class="act-btn act-sprint" data-hold="sprint" data-side="${side}"><span>S</span><small>CORRER</small></button>
            <button class="act-btn act-tackle" data-hold="tackle" data-side="${side}"><span>D</span><small>DESARME</small></button>
            <button class="act-btn act-skill" data-hold="skill" data-side="${side}"><span>F</span><small>DRIBLE</small></button>
          </div>
          ${duo ? `<div class="duo-label">${side === 'home' ? 'J1' : 'J2'}</div>` : ''}
        </div>`;
      const controls = duo
        ? `<div class="controls duo" id="match-controls">${pad('home')}${pad('away')}</div>`
        : `<div class="controls" id="match-controls">
            <div class="joystick-zone" data-side="${side}"><div class="joystick"><div class="stick-knob"></div></div></div>
            <div class="action-cluster">
              <button class="act-btn act-pass" data-hold="passHeld" data-side="${side}"><span>P</span><small>PASSE</small><span class="key">J</span></button>
              <button class="act-btn act-shoot" data-hold="shootHeld" data-side="${side}"><span>C</span><small>CHUTE</small><span class="key">K</span></button>
              <button class="act-btn act-sprint" data-hold="sprint" data-side="${side}"><span>S</span><small>CORRER</small><span class="key">⇧</span></button>
              <button class="act-btn act-tackle" data-hold="tackle" data-side="${side}"><span>D</span><small>DESARME</small><span class="key">L</span></button>
              <button class="act-btn act-skill" data-hold="skill" data-side="${side}"><span>F</span><small>DRIBLE</small><span class="key">U</span></button>
            </div>
            <div class="match-legend">Arraste para mover · segure Passe/Chute · ESC pausa</div>
          </div>`;
      return `<div class="match-screen" id="match-screen">
        <canvas id="match-canvas"></canvas>
        <div class="match-hud">
          <div class="scorebug">
            <div class="sb-team">${this.crest(home, 26)}<b>${esc(home.short || home.name)}</b></div>
            <div class="sb-mid"><div class="sb-score"><span id="sb-h">0</span><em>x</em><span id="sb-a">0</span></div><div class="sb-clock" id="sb-clock">0'</div></div>
            <div class="sb-team away"><b>${esc(away.short || away.name)}</b>${this.crest(away, 26)}</div>
          </div>
          <div class="match-top-actions">
            ${config.training ? `<button class="mbtn" data-action="match-end-training" aria-label="Encerrar treino"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></button>` : ''}
            <button class="mbtn" data-action="match-pause" aria-label="Pausar"><svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg></button>
            <button class="mbtn" data-action="match-camera-cycle" aria-label="Câmera"><svg viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg></button>
          </div>
          <div class="match-weather"><span class="chip">${wLabel[config.weather] || 'Limpo'}</span><span class="chip">${tLabel[config.timeOfDay] || 'Noite'}</span><span class="chip">${esc(config.stadium || home.stadium || '')}</span></div>
          <div class="commentary" id="match-commentary"></div>
          <div class="goal-overlay" id="goal-overlay"><div class="g-word">GOL!</div><div class="g-scorer"></div><div class="g-sub"></div></div>
          <div class="minimap" id="match-minimap"><canvas id="minimap-canvas"></canvas></div>
          <div class="replay-banner hidden" id="replay-banner"><span class="rec"></span> REPLAY</div>
          <button class="btn small replay-skip hidden" id="replay-skip" data-action="match-skip-replay">Pular replay</button>
          ${controls}
          <div id="match-overlay"></div>
        </div>
      </div>`;
    },

    closeMatch() {
      if (this._endT) { clearTimeout(this._endT); this._endT = null; }
      if (this._goalT) { clearTimeout(this._goalT); this._goalT = null; }
      if (this.match) { this.match.stop(); this.match = null; }
      this.unbindKeyboard();
      this.unbindTilt();
      document.body.classList.remove('in-match');
    },

    requestTilt() {
      const D = window.DeviceOrientationEvent;
      if (!D) { this.toast('Sensor de movimento indisponível'); return; }
      if (typeof D.requestPermission === 'function') {
        D.requestPermission().then(res => {
          if (res === 'granted') { this.toast('Tilt ativado', 'good'); if (this.match) this.bindTilt(); }
          else { this.setup.tilt = false; this.save.settings.tilt = false; this.saveNow(true); this.render(); this.toast('Permissão de movimento negada', 'bad'); }
        }).catch(() => this.toast('Não foi possível ativar o tilt', 'bad'));
      } else this.toast('Tilt ativado', 'good');
    },

    quitMatch() {
      const ctx = this.matchContext || {};
      const meta = ctx.meta || {};
      const target = meta.returnScreen || 'play';
      const goBack = () => {
        this.closeMatch();
        this.hideMatchOverlay();
        this.hideReplayUI();
        this.matchContext = null;
        if (this.go) this.go(target, meta.returnCtx || {}, { replace: true });
      };
      if (this.match && this.match.training) return goBack();
      this.modal(`<h3>Sair da partida?</h3><p class="m-sub">O placar atual será descartado e o progresso desta partida não será salvo.</p>
        <div class="modal-actions"><button class="btn" data-action="close-modal">Ficar</button><button class="btn primary" data-action="match-quit-confirm">Sair</button></div>`);
      this._quitGo = goBack;
    }
  });

  Object.assign(G.screens, {
    match() { return G.matchScreenHTML(); }
  });

  Object.assign(G.afterRender = G.afterRender || {}, {
    match() { G.bootMatch(); },
    play() {
      const sel = document.getElementById('stadium-select');
      if (sel) sel.onchange = () => { G.setup.stadium = sel.value; };
    }
  });

  Object.assign(G.actions, {
    enter() {
      if (AU) { AU.init(); AU.ui(); }
      this.go('menu', {}, { replace: true });
      if (!this.save.settings.hintSeen) setTimeout(() => this.toast('Dica: use o menu Jogar para um amistoso rápido.'), 900);
    },
    'continue-career'() {
      if (this.save.career) this.go('master');
      else if (this.save.legend) this.go('legend');
      else this.go('menu');
    },
    menu() { this.closeMatch(); this.go('menu', {}, { replace: true }); },
    play() { this.go('play'); },
    competitions() { this.go('competitions'); },
    quickplay() {
      const f = this.featured || this.pickFeatured();
      this.startMatch({
        homeId: f[0], awayId: f[1],
        config: { humans: ['home'] },
        meta: { kind: 'friendly', label: 'Partida em destaque', continue: { screen: 'menu' }, returnScreen: 'menu' }
      });
    },
    'pick-team'(el) { this.go('teamSelect', { side: el.dataset.side, title: el.dataset.side === 'home' ? 'Time da casa' : 'Time visitante' }); },
    'filter-team-league'(el) { this.pick.league = el.dataset.value; this.render(); },
    'select-team'(el) {
      const id = el.dataset.team, side = (this.ctx && this.ctx.side) || 'home';
      if (this.setup && side) this.setup[side] = id;
      this.back();
    },
    'set-weather'(el) { this.setup.weather = el.dataset.value; this.render(); },
    'set-time'(el) { this.setup.timeOfDay = el.dataset.value; this.render(); },
    'set-difficulty'(el) { this.setup.difficulty = el.dataset.value; this.save.settings.difficulty = el.dataset.value; this.saveNow(true); this.render(); },
    'set-duration'(el) { this.setup.duration = Number(el.dataset.value); this.render(); },
    'set-camera'(el) { this.setup.camera = el.dataset.value; this.save.settings.camera = el.dataset.value; this.saveNow(true); this.render(); },
    'toggle-tilt'() {
      this.setup.tilt = !this.setup.tilt;
      this.save.settings.tilt = this.setup.tilt;
      this.saveNow(true);
      if (this.setup.tilt) this.requestTilt();
      this.render();
    },
    'toggle-replay'() { this.save.settings.replayAuto = !this.save.settings.replayAuto; this.saveNow(true); this.render(); },
    'start-friendly'() {
      this.save.lastHome = this.setup.home; this.save.lastAway = this.setup.away;
      this.saveNow(true);
      this.startMatch({
        homeId: this.setup.home, awayId: this.setup.away,
        meta: { kind: 'friendly', label: 'Partida amistosa', continue: { screen: 'play' }, returnScreen: 'play' }
      });
    },
    'squad-preview'() {
      const home = team(this.setup.home), away = team(this.setup.away);
      const squad = (t) => PES.getSquad(t.id).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11);
      const list = (t) => `<div class="card soft"><div class="row" style="margin-bottom:8px">${this.crest(t, 34)}<b>${esc(t.name)}</b></div><div class="player-list">${squad(t).map(p => `<div class="player-row" style="grid-template-columns:30px minmax(0,1fr) 44px 38px"><span class="num">${p.number}</span><span class="p-name">${esc(p.name)}</span><span class="p-pos">${esc(p.pos)}</span><span class="p-ovr">${p.ovr}</span></div>`).join('')}</div></div>`;
      this.modal(`<h3>Escalações</h3><p class="m-sub">Os 11 melhores jogadores de cada equipe.</p><div class="grid g2">${list(home)}${list(away)}</div><div class="modal-actions"><button class="btn primary" data-action="close-modal">Fechar</button></div>`);
    },
    'open-comp'(el) { this.compPick = null; this.go('compSetup', { compId: el.dataset.comp }); },
    'select-comp-team'(el) { this.compPick = { compId: el.dataset.comp, teamId: el.dataset.team }; this.render(); },
    'start-comp'(el) {
      const compId = el.dataset.comp;
      if (!this.compPick || this.compPick.compId !== compId) { this.toast('Escolha um time primeiro'); return; }
      const state = this.createTournament(compId, this.compPick.teamId);
      if (!state) return;
      this.save.tournament = state;
      this.saveNow(true);
      this.go('compHub', {}, { replace: true });
      this.toast('Competição iniciada. Boa sorte!', 'good');
    },
    'resume-tournament'() { if (this.save.tournament) this.go('compHub'); },
    'new-comp'(el) {
      const compId = el.dataset.comp || (this.save.tournament && this.save.tournament.compId);
      const old = this.save.tournament;
      const teamId = old ? old.teamId : (this.compPick && this.compPick.teamId);
      const state = this.createTournament(compId, teamId);
      this.save.tournament = state;
      this.saveNow(true);
      this.render();
      this.toast('Nova competição criada');
    },
    'simulate-tournament'() {
      const state = this.save.tournament;
      if (!state) return;
      this.simulateTournamentRound(state);
      this.saveNow(true);
      this.render();
      if (state.finished) this.toast(state.champion === state.teamId ? 'Você é campeão!' : 'Competição encerrada', state.champion === state.teamId ? 'good' : undefined);
    },
    'play-tournament'() {
      const state = this.save.tournament;
      if (!state) return;
      const fx = this.nextTournamentFixture(state);
      if (!fx) { this.toast('Nenhuma partida disponível. Simule a rodada.'); return; }
      const comp = PES.getCompetition(state.compId);
      const userHome = fx.home;
      this.startMatch({
        homeId: userHome ? state.teamId : fx.opponent,
        awayId: userHome ? fx.opponent : state.teamId,
        meta: {
          kind: 'tournament', label: `${comp.name} · ${fx.label}`,
          userSide: userHome ? 'home' : 'away',
          roundIndex: fx.roundIndex, tieIndex: fx.tieIndex,
          continue: { screen: 'compHub' }, returnScreen: 'compHub',
          stadium: comp.name
        }
      });
    },
    'match-pause'() { this.togglePause(); },
    'match-resume'() { this.resumeMatch(); },
    'match-hint-ok'() { this.save.settings.hintSeen = true; this.saveNow(true); this.resumeMatch(); },
    'match-subs'() { this.openSubs(); },
    'match-subs-back'() { if (this._overlayMode === 'halftime') this.openHalftime(); else this.openPause(); },
    'do-sub'(el) {
      if (!this.match) return;
      const side = this.st.activeSide || 'home';
      const bench = this.match.getBench(side);
      const incoming = bench.find(p => p.id === el.dataset.in);
      if (!incoming) return;
      const candidates = this.match.getLineup(side).filter(p => !p.isGK);
      candidates.sort((a, b) => (a.sta || 80) - (b.sta || 80));
      const same = candidates.filter(p => p.pos === incoming.pos)[0];
      const out = same || candidates[0];
      if (!out) { this.toast('Nenhum jogador para substituir'); return; }
      const r = this.match.substitute(side, out.id, incoming);
      if (!r.ok) { this.toast(r.reason, 'bad'); return; }
      this.openSubs();
    },
    'match-end-training'() {
      if (!this.match) return;
      this.hideMatchOverlay();
      this.match.endTraining();
    },
    'match-camera-cycle'() { this.cycleCamera(); },
    'match-toggle-replay'() {
      this.save.settings.replayAuto = !this.save.settings.replayAuto;
      this.saveNow(true);
      this.openPause();
    },
    'match-skip-replay'() { if (this.match) this.match.skipReplay(); this.hideReplayUI(); },
    'match-quit'() {
      this.hideMatchOverlay();
      this.quitMatch();
    },
    'match-quit-confirm'() {
      this.closeModal();
      if (this._quitGo) this._quitGo();
      this._quitGo = null;
    },
    'match-resume-second-half'() {
      this.hideMatchOverlay();
      if (this.match) this.match.resumeSecondHalf();
    },
    'result-continue'() {
      const ctx = this.lastResult || {};
      const c = ctx.continue || (ctx.meta && ctx.meta.continue) || { screen: 'menu' };
      if (ctx.training) {
        const target = (ctx.meta && ctx.meta.returnScreen) || 'training';
        this.go(target, (ctx.meta && ctx.meta.returnCtx) || {}, { replace: true });
        return;
      }
      this.go(c.screen || 'menu', c.ctx || {}, { replace: true });
      if (this.matchContext) this.matchContext = null;
    },
    'result-again'() {
      const ctx = this.lastResult || {};
      const rem = ctx.meta && ctx.meta.rematch;
      if (!rem) { this.go('menu', {}, { replace: true }); return; }
      const fresh = JSON.parse(JSON.stringify({ homeId: rem.homeId, awayId: rem.awayId, config: rem.config, meta: rem.meta }));
      this.startMatch(fresh);
    },
    'close-modal'() { this.closeModal(); }
  });
})();
