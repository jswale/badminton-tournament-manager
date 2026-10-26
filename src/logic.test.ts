import { describe, expect, it } from 'vitest';
import {
  balanceTeams,
  buildTeams,
  bracketRound,
  clubStats,
  firstFreeCell,
  makePools,
  removeFromCourt,
  moveTeamToPool,
  matchStats,
  assignTo,
  bracketPodium,
  matchWinner,
  placeCourt,
  randomSets,
  startPoolFinal,
  swissNextRound,
  teamStats,
  tiers,
  swapTeamsInPools,
  withdrawTeam,
  dispatch,
  generatePools,
  isSetValid,
  recordScore,
  roundRobin,
  startBracket,
  qualifiedTeams,
  swapPlayers,
} from './logic';
import type { Court, Player, TournamentState } from './types';

const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`,
  name: `J${i}`,
  gender: i % 2 ? 'F' : 'H',
  level: ((i % 4) + 1) as 1 | 2 | 3 | 4,
}));

const courts: Court[] = [
  { id: 'c1', name: 'T1', active: true },
  { id: 'c2', name: 'T2', active: true },
];

const base: TournamentState = {
  gym: { rows: 3, cols: 4 },
  clubs: [],
  players,
  courts,
  teams: [],
  settings: { teamType: 'double', mixed: true, setsToWin: 1, pools: 2, qualifiedPerPool: 2 },
  pools: [],
  brackets: [],
  matches: [],
};

describe('équipes', () => {
  it('forme des doubles mixtes quand c’est possible', () => {
    const { teams, leftover } = buildTeams(players, 'double', true);
    expect(teams).toHaveLength(4);
    expect(leftover).toHaveLength(0);
    for (const t of teams) {
      const genders = t.playerIds.map((id) => players.find((p) => p.id === id)!.gender);
      expect(new Set(genders).size).toBe(2);
    }
  });

  it('garde les équipes imposées', () => {
    const { teams } = buildTeams(players, 'double', true, [['p0', 'p2']]);
    expect(teams[0]).toMatchObject({ forced: true, playerIds: ['p0', 'p2'] });
    expect(teams).toHaveLength(4);
  });

  it('équilibre les niveaux sans casser la mixité', () => {
    const forced = players.map((p, i) => ({ ...p, level: (i < 4 ? 4 : 1) as 1 | 2 | 3 | 4 }));
    const st = { ...base, players: forced, teams: buildTeams(forced, 'double', true).teams };
    const balanced = balanceTeams({ ...st, teams: st.teams });
    const strength = (ids: string[]) => ids.reduce((s, id) => s + forced.find((p) => p.id === id)!.level, 0);
    const sums = balanced.map((t) => strength(t.playerIds));
    expect(Math.max(...sums) - Math.min(...sums)).toBeLessThanOrEqual(2);
  });

  it('échange deux joueurs entre équipes', () => {
    const teams = [
      { id: 'a', playerIds: ['p0', 'p1'], forced: false },
      { id: 'b', playerIds: ['p2', 'p3'], forced: false },
    ];
    const out = swapPlayers(teams, 'p0', 'p3');
    expect(out[0].playerIds).toEqual(['p3', 'p1']);
    expect(out[1].playerIds).toEqual(['p2', 'p0']);
  });
});

describe('poules et round-robin', () => {
  it('chaque équipe joue une fois contre chaque autre (n impair)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const games = roundRobin(ids);
    expect(games).toHaveLength(10);
    const pairs = new Set(games.map((g) => [g.a, g.b].sort().join('-')));
    expect(pairs.size).toBe(10);
  });

  it('génère les matchs de poule et les affecte aux terrains libres', () => {
    const { teams } = buildTeams(players, 'double', true);
    const st = generatePools({ ...base, teams });
    expect(st.pools).toHaveLength(2);
    expect(st.matches.filter((m) => m.status === 'playing')).toHaveLength(2);
    expect(st.matches.filter((m) => m.status === 'playing').map((m) => m.courtId).sort()).toEqual(['c1', 'c2']);
  });
});

describe('scores', () => {
  it('valide les sets (21 avec 2 d’écart, plafond 30)', () => {
    expect(isSetValid(21, 15)).toBe(true);
    expect(isSetValid(21, 20)).toBe(false);
    expect(isSetValid(23, 21)).toBe(true);
    expect(isSetValid(30, 29)).toBe(true);
    expect(isSetValid(30, 28)).toBe(true);
    expect(isSetValid(30, 27)).toBe(false);
    expect(isSetValid(22, 21)).toBe(false);
  });

  it('termine le match et libère le terrain', () => {
    const { teams } = buildTeams(players, 'double', true);
    const st = generatePools({ ...base, teams });
    const playing = st.matches.find((m) => m.status === 'playing')!;
    const res = recordScore(st, playing.id, [{ a: 21, b: 10 }]);
    expect(res.error).toBeUndefined();
    const after = res.state.matches.find((m) => m.id === playing.id)!;
    expect(after.status).toBe('done');
    expect(after.winner).toBe(playing.teamA);
  });

  it('refuse un score invalide', () => {
    const { teams } = buildTeams(players, 'double', true);
    const st = generatePools({ ...base, teams });
    const m = st.matches[0];
    expect(recordScore(st, m.id, [{ a: 21, b: 20 }]).error).toBeDefined();
  });

  it('ne lance jamais deux matchs avec la même équipe en même temps', () => {
    const teams = [
      { id: 't1', playerIds: ['p0'], forced: false },
      { id: 't2', playerIds: ['p1'], forced: false },
      { id: 't3', playerIds: ['p2'], forced: false },
    ];
    const st = dispatch({
      ...base,
      teams,
      settings: { ...base.settings, teamType: 'simple' },
      matches: [
        { id: 'm1', phase: 'poule', round: 1, label: '', order: 0, teamA: 't1', teamB: 't2', sets: [], status: 'pending', courtId: null, winner: null },
        { id: 'm2', phase: 'poule', round: 1, label: '', order: 1, teamA: 't1', teamB: 't3', sets: [], status: 'pending', courtId: null, winner: null },
      ],
    });
    expect(st.matches.filter((m) => m.status === 'playing').map((m) => m.id)).toEqual(['m1']);
  });
});

describe('ordre des matchs de poule', () => {
  it('alterne les poules au lieu de jouer une poule entière', () => {
    const teams = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const st = generatePools({ ...base, settings: { ...base.settings, teamType: 'simple', pools: 3 }, teams });
    const firstThree = [...st.matches].sort((a, b) => a.order - b.order).slice(0, 3).map((m) => m.poolId);
    expect(new Set(firstThree).size).toBe(3);
  });
});

describe('répartition en poules', () => {
  it('donne les équipes en plus aux premières poules, comme l’aperçu', () => {
    const ids = Array.from({ length: 16 }, (_, i) => `t${i}`);
    expect(makePools(ids, 3).map((p) => p.teamIds.length)).toEqual([6, 5, 5]);
  });
});

describe('échange entre poules', () => {
  it('échange deux équipes de poules et recalcule les matchs', () => {
    const teams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const st = generatePools({ ...base, settings: { ...base.settings, teamType: 'simple', pools: 2 }, teams });
    const [a, b] = [st.pools[0].teamIds[0], st.pools[1].teamIds[0]];
    const out = swapTeamsInPools(st, a, b);
    expect(out.pools[0].teamIds).toContain(b);
    expect(out.pools[1].teamIds).toContain(a);
    expect(out.matches.filter((m) => m.phase === 'poule')).toHaveLength(st.matches.length);
    expect(out.matches.filter((m) => m.phase === 'poule').every((m) => m.teamA !== m.teamB)).toBe(true);
  });
});

describe('déplacement entre poules', () => {
  it('déplace une équipe vers une autre poule même si les effectifs deviennent inégaux', () => {
    const teams = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const st = generatePools({ ...base, settings: { ...base.settings, teamType: 'simple', pools: 2 }, teams });
    const [from, to] = st.pools;
    const moved = from.teamIds[0];
    const out = moveTeamToPool(st, moved, to.id);
    expect(out.pools[0].teamIds).toHaveLength(from.teamIds.length - 1);
    expect(out.pools[1].teamIds).toHaveLength(to.teamIds.length + 1);
    expect(out.pools[1].teamIds).toContain(moved);
  });
});

describe('forfait', () => {
  it('donne les matchs restants à l’adversaire et exclut l’équipe des qualifiés', () => {
    const teams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const st = generatePools({ ...base, settings: { ...base.settings, teamType: 'simple', pools: 1, qualifiedPerPool: 2 }, teams });
    const out = withdrawTeam(st, 't0');
    const mine = out.matches.filter((m) => m.teamA === 't0' || m.teamB === 't0');
    expect(mine.every((m) => m.status === 'done' && m.winner !== 't0')).toBe(true);
    expect(out.matches.some((m) => m.status === 'playing' && (m.teamA === 't0' || m.teamB === 't0'))).toBe(false);
    expect(qualifiedTeams(out).qualified).not.toContain('t0');
  });
});

describe('retrait d’un terrain', () => {
  it('réaffecte automatiquement le terrain, ou laisse choisir le prochain match', () => {
    const teams = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const courts = [1, 2, 3].map((i) => ({ id: `c${i}`, name: `T${i}`, active: true }));
    const st = generatePools({ ...base, courts, settings: { ...base.settings, teamType: 'simple', pools: 2 }, teams });
    const playing = st.matches.find((m) => m.status === 'playing')!;
    const auto = removeFromCourt(st, playing.id);
    expect(auto.matches.find((m) => m.id === playing.id)).toMatchObject({ status: 'pending', courtId: null });
    expect(auto.matches.some((m) => m.status === 'playing' && m.courtId === playing.courtId)).toBe(true);

    const candidate = st.matches.find((m) => m.status === 'pending' && m.teamA !== playing.teamA && m.teamB !== playing.teamB && m.teamA !== playing.teamB && m.teamB !== playing.teamA)!;
    const chosen = removeFromCourt(st, playing.id, candidate.id);
    expect(chosen.matches.find((m) => m.id === candidate.id)).toMatchObject({ status: 'playing', courtId: playing.courtId });
  });
});

describe('appariement des tableaux', () => {
  it('sépare les équipes d’une même poule au premier tour quand c’est possible', () => {
    const teams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const pools = [
      { id: 'A', name: 'Poule A', teamIds: ['t0', 't1'] },
      { id: 'B', name: 'Poule B', teamIds: ['t2', 't3'] },
    ];
    const st = startBracket({ ...base, teams, pools, matches: [], brackets: [] }, 'finale', ['t0', 't2', 't3', 't1']);
    const poolOf = (id: string) => pools.find((p) => p.teamIds.includes(id))?.id;
    const round1 = st.matches.filter((m) => m.phase === 'finale');
    expect(round1).toHaveLength(2);
    expect(round1.every((m) => poolOf(m.teamA) !== poolOf(m.teamB))).toBe(true);
  });
});

describe('tableaux par niveau', () => {
  it('répartit les équipes en meilleurs, moyens et plus faibles', () => {
    const teams = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const st = generatePools({ ...base, settings: { ...base.settings, teamType: 'simple', pools: 3, qualifiedPerPool: 1, zones: 3, zoneSizes: [3, 5] }, teams });
    const t = tiers(st);
    expect(t.finale).toHaveLength(3);
    expect(t.supp).toHaveLength(5);
    expect(t.bas).toHaveLength(4);
    expect([...t.finale, ...t.supp, ...t.bas].sort()).toEqual(teams.map((x) => x.id).sort());
  });
});

describe('statistiques par équipe', () => {
  it('compte les matchs et victoires par paire', () => {
    const teams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const st = generatePools({ ...base, settings: { ...base.settings, teamType: 'simple', pools: 1 }, teams });
    const m = st.matches[0];
    const done = recordScore(st, m.id, [{ a: 21, b: 10 }]).state;
    const winnerId = done.matches.find((x) => x.id === m.id)!.winner!;
    const winner = teamStats(done).find((r) => r.id === winnerId)!;
    expect(winner).toMatchObject({ played: 1, wins: 1, pf: 21, pa: 10 });
  });
});

describe('plan du gymnase', () => {
  it('propose la première case libre pour un nouveau terrain', () => {
    const st: TournamentState = {
      ...base,
      gym: { rows: 1, cols: 2 },
      courts: [{ id: 'a', name: 'T1', active: true, row: 0, col: 0 }],
    };
    expect(firstFreeCell(st)).toEqual({ row: 0, col: 1 });
    expect(firstFreeCell({ ...st, courts: [...st.courts, { id: 'b', name: 'T2', active: true, row: 0, col: 1 }] })).toBeNull();
  });

  it('échange deux terrains quand la case est occupée', () => {
    const st: TournamentState = {
      ...base,
      courts: [
        { id: 'a', name: 'T1', active: true, row: 0, col: 0 },
        { id: 'b', name: 'T2', active: true, row: 0, col: 1 },
        { id: 'c', name: 'T3', active: true },
      ],
    };
    const moved = placeCourt(st, 'a', { row: 0, col: 1 });
    expect(moved.courts.find((c) => c.id === 'a')).toMatchObject({ row: 0, col: 1 });
    expect(moved.courts.find((c) => c.id === 'b')).toMatchObject({ row: 0, col: 0 });
    const parked = placeCourt(st, 'c', { row: 2, col: 3 });
    expect(parked.courts.find((c) => c.id === 'c')).toMatchObject({ row: 2, col: 3 });
  });
});

describe('clubs', () => {
  it('regroupe les joueurs par club, les sans-club à part', () => {
    const withClubs: TournamentState = {
      ...base,
      clubs: [{ id: 'k1', name: 'Alpha' }],
      players: players.map((p, i) => ({ ...p, clubId: i < 3 ? 'k1' : undefined })),
    };
    const rows = clubStats(withClubs);
    expect(rows.find((r) => r.id === 'k1')).toMatchObject({ name: 'Alpha', players: 3 });
    expect(rows.find((r) => r.id === '')).toMatchObject({ name: 'Sans club', players: 5 });
  });
});

describe('phases finales', () => {
  it('joue un tableau à élimination directe jusqu’à la finale, avec byes', () => {
    // 6 entrants : 2 byes pour les têtes de série
    const teams = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    let st: TournamentState = { ...base, teams: [], courts: [{ id: 'c1', name: 'T1', active: true }] , matches: [] };
    st = startBracket(st, 'finale', teams.map((t) => t.id));
    st = { ...st, teams: teams };
    let guard = 0;
    while (guard++ < 10) {
      const open = st.matches.filter((m) => m.phase === 'finale' && m.status !== 'done');
      if (open.length === 0) {
        const next = bracketRound(st, 'finale');
        if (next === st) break;
        st = next;
        continue;
      }
      st = recordScore(st, open[0].id, [{ a: 21, b: 5 }]).state;
    }
    const finals = st.matches.filter((m) => m.phase === 'finale');
    expect(finals.at(-1)!.label).toBe('Finale');
    expect(finals.every((m) => m.status === 'done')).toBe(true);
  });

  it('qualifie les premiers de chaque poule', () => {
    const teams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const st = generatePools({ ...base, settings: { ...base.settings, teamType: 'simple', pools: 2, qualifiedPerPool: 1 }, teams });
    const { qualified, rest } = qualifiedTeams(st);
    expect(qualified).toHaveLength(2);
    expect(rest).toHaveLength(2);
  });
});

describe('scores fictifs', () => {
  it('produit des sets valides jusqu’à la victoire', () => {
    for (const n of [1, 2]) {
      const sets = randomSets(n);
      expect(sets.every((x) => isSetValid(x.a, x.b))).toBe(true);
      expect(matchWinner(sets, 'A', 'B', n)).not.toBeNull();
    }
  });
});

describe('modes de tournoi', () => {
  const fourTeams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));

  it('système suisse : pas de revanche au tour suivant', () => {
    let st = swissNextRound({ ...base, teams: fourTeams, pools: [], matches: [], settings: { ...base.settings, format: 'suisse', swissRounds: 2 } });
    st = { ...st, matches: st.matches.map((m) => ({ ...m, status: 'done' as const, winner: m.teamA })) };
    const round1 = st.matches.map((m) => [m.teamA, m.teamB].sort().join('-'));
    st = swissNextRound(st);
    const round2 = st.matches.filter((m) => m.round === 2).map((m) => [m.teamA, m.teamB].sort().join('-'));
    expect(round2).toHaveLength(2);
    expect(round2.some((p) => round1.includes(p))).toBe(false);
  });

  it('poules de niveau : force équilibrée entre les poules', () => {
    const levels = [4, 4, 3, 3, 2, 2, 1, 1];
    const players = levels.map((level, i) => ({ id: `p${i}`, name: `J${i}`, gender: 'H' as const, level: level as 1 | 2 | 3 | 4 }));
    const teams = players.map((p, i) => ({ id: `t${i}`, playerIds: [p.id], forced: false }));
    const st = generatePools({ ...base, players, teams, settings: { ...base.settings, format: 'niveau', teamType: 'simple', pools: 2 } });
    const sums = st.pools.map((pool) => pool.teamIds.reduce((x, id) => x + players[Number(id.slice(1))].level, 0));
    expect(sums[0]).toBe(sums[1]);
  });

  it('consolante : les qualifiés en tableau principal, les autres en consolante', () => {
    const st = generatePools({ ...base, teams: fourTeams, settings: { ...base.settings, format: 'consolante', teamType: 'simple', pools: 2, qualifiedPerPool: 1 } });
    const t = tiers(st);
    expect(t.finale).toHaveLength(2);
    expect(t.supp).toHaveLength(2);
    expect(t.bas).toHaveLength(0);
  });

  it('poules : la poule finale réunit les qualifiés', () => {
    let st = generatePools({ ...base, teams: fourTeams, settings: { ...base.settings, format: 'poules', teamType: 'simple', pools: 2, qualifiedPerPool: 1 } });
    st = { ...st, matches: st.matches.map((m) => ({ ...m, status: 'done' as const, winner: m.teamA })) };
    st = startPoolFinal(st);
    expect(st.pools.at(-1)).toMatchObject({ name: 'Poule finale' });
    expect(st.matches.filter((m) => m.phase === 'finale')).toHaveLength(1);
  });
});

describe('statistiques de matchs', () => {
  it('système suisse à 5 équipes : chaque équipe joue au moins R-1 matchs (repos réparti)', () => {
    const teams = Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    let st: TournamentState = { ...base, teams, pools: [], matches: [], settings: { ...base.settings, format: 'suisse', swissRounds: 4 } };
    for (let r = 0; r < 4; r++) {
      st = swissNextRound(st);
      st = { ...st, matches: st.matches.map((m) => ({ ...m, status: 'done' as const, winner: m.teamA })) };
    }
    const counts = teams.map((tm) => st.matches.filter((m) => m.teamA === tm.id || m.teamB === tm.id).length);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(3);
    expect(matchStats(st.settings, 5)).toEqual({ total: 8, min: 3, max: 4 });
  });
});

describe('exempts en tableau', () => {
  it('les exempts se rencontrent entre eux au tour suivant', () => {
    const teams = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    let st = startBracket({ ...base, teams, pools: [], matches: [], brackets: [] }, 'finale', teams.map((t) => t.id));
    st = { ...st, matches: st.matches.map((m) => ({ ...m, status: 'done' as const, winner: m.teamA })) };
    st = bracketRound(st, 'finale');
    const round2 = st.matches.filter((m) => m.phase === 'finale' && m.round === 2);
    const round1 = st.matches.filter((m) => m.phase === 'finale' && m.round === 1);
    const byes = teams.map((t) => t.id).filter((id) => !round1.some((m) => m.teamA === id || m.teamB === id));
    expect(round2.some((m) => byes.includes(m.teamA) && byes.includes(m.teamB))).toBe(true);
  });
});

describe('podium des tableaux', () => {
  it('donne 1er et 2e de la finale, 3e aux perdants des demi-finales', () => {
    const teams = Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    let st = startBracket({ ...base, teams, pools: [], matches: [], brackets: [] }, 'finale', teams.map((t) => t.id));
    for (let k = 0; k < 2; k++) {
      st = { ...st, matches: st.matches.map((m) => (m.status === 'done' ? m : { ...m, status: 'done' as const, winner: m.teamA })) };
      st = bracketRound(st, 'finale');
    }
    st = { ...st, matches: st.matches.map((m) => (m.status === 'done' ? m : { ...m, status: 'done' as const, winner: m.teamA })) };
    const podium = bracketPodium(st, 'finale');
    expect(podium.map((p) => p.place)).toEqual([1, 2, 3]);
    expect(podium[0].teams).toHaveLength(1);
    expect(podium[2].teams).toHaveLength(2);
  });
});

describe('tour suivant des tableaux', () => {
  it('affecte aussitôt les nouveaux matchs aux terrains libres', () => {
    const teams = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const courts = [1, 2].map((i) => ({ id: `c${i}`, name: `T${i}`, active: true }));
    let st = startBracket({ ...base, courts, teams, pools: [], matches: [], brackets: [] }, 'finale', teams.map((t) => t.id));
    st = { ...st, matches: st.matches.map((m) => ({ ...m, status: 'done' as const, winner: m.teamA, courtId: null })) };
    st = bracketRound(st, 'finale');
    expect(st.matches.filter((m) => m.round === 2 && m.status === 'playing')).toHaveLength(2);
  });
});

describe('affectation manuelle des matchs à venir', () => {
  it('remplace le match en cours d’un terrain par le match choisi', () => {
    const teams = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, playerIds: [`p${i}`], forced: false }));
    const courts = [1, 2].map((i) => ({ id: `c${i}`, name: `T${i}`, active: true }));
    const st = generatePools({ ...base, courts, teams, settings: { ...base.settings, teamType: 'simple', pools: 2 } });
    const current = st.matches.find((m) => m.status === 'playing')!;
    const pending = st.matches.find((m) => m.status === 'pending' && !(m.teamA === current.teamA || m.teamB === current.teamA || m.teamA === current.teamB || m.teamB === current.teamB))!;
    const out = assignTo(st, pending.id, current.courtId!);
    expect(out.matches.find((m) => m.id === pending.id)).toMatchObject({ status: 'playing', courtId: current.courtId });
    expect(out.matches.find((m) => m.id === current.id)).toMatchObject({ status: 'pending' });
  });
});
