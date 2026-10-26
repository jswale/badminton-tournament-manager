import { BRACKET_PHASES, type Format } from './types';
import type {
  Bracket,
  BracketPhase,
  Match,
  Player,
  Pool,
  SetScore,
  Team,
  TeamType,
  TournamentState,
} from './types';

export const uid = () => Math.random().toString(36).slice(2, 10);

const rand = (n: number) => Math.floor(Math.random() * n);

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const playerName = (players: Player[], id: string) =>
  players.find((p) => p.id === id)?.name ?? '?';

export function teamLabel(state: TournamentState, teamId: string): string {
  const team = state.teams.find((t) => t.id === teamId);
  return team ? team.playerIds.map((id) => playerName(state.players, id)).join(' / ') : '?';
}

export function teamLevel(state: TournamentState, team: Team): number {
  return team.playerIds.reduce(
    (sum, id) => sum + (state.players.find((p) => p.id === id)?.level ?? 0),
    0,
  );
}

/** Forme les équipes : les `forced` sont gardées telles quelles, le reste est tiré au hasard. */
export function buildTeams(
  players: Player[],
  teamType: TeamType,
  mixed: boolean,
  forced: string[][] = [],
): { teams: Team[]; leftover: string[] } {
  const forcedTeams: Team[] = forced.map((ids) => ({ id: uid(), playerIds: ids, forced: true }));
  const used = new Set(forced.flat());
  const free = players.filter((p) => !used.has(p.id));

  let groups: string[][] = [];
  let leftover: string[] = [];
  if (teamType === 'simple') {
    groups = free.map((p) => [p.id]);
  } else {
    const men = shuffle(free.filter((p) => p.gender === 'H').map((p) => p.id));
    const women = shuffle(free.filter((p) => p.gender === 'F').map((p) => p.id));
    let rest: string[];
    if (mixed) {
      // Mixité maximale : on associe un homme et une femme tant qu'il y en a des deux
      const n = Math.min(men.length, women.length);
      for (let i = 0; i < n; i++) groups.push([men[i], women[i]]);
      rest = shuffle([...men.slice(n), ...women.slice(n)]);
    } else {
      rest = shuffle([...men, ...women]);
    }
    for (let i = 0; i + 1 < rest.length; i += 2) groups.push([rest[i], rest[i + 1]]);
    if (rest.length % 2) leftover = [rest[rest.length - 1]];
  }

  return {
    teams: [...forcedTeams, ...groups.map((ids) => ({ id: uid(), playerIds: ids, forced: false }))],
    leftover,
  };
}

/**
 * Équilibre les équipes par niveau en échangeant des joueurs entre équipes
 * (hill-climbing : on garde un échange seulement s'il réduit l'écart des niveaux).
 */
export function balanceTeams(state: TournamentState): Team[] {
  const teams = state.teams.map((t) => ({ ...t, playerIds: [...t.playerIds] }));
  const movable = teams.filter((t) => !t.forced && t.playerIds.length > 1);
  if (movable.length < 2) return teams;

  const level = new Map(state.players.map((p) => [p.id, p.level]));
  const gender = new Map(state.players.map((p) => [p.id, p.gender]));
  const cost = () => {
    const s = movable.map((t) => t.playerIds.reduce((x, id) => x + (level.get(id) ?? 0), 0));
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    return s.reduce((c, v) => c + (v - mean) ** 2, 0);
  };

  let best = cost();
  for (let k = 0; k < 2000 && best > 0; k++) {
    const A = movable[rand(movable.length)];
    const B = movable[rand(movable.length)];
    if (A === B) continue;
    const i = rand(A.playerIds.length);
    const j = rand(B.playerIds.length);
    const pa = A.playerIds[i];
    const pb = B.playerIds[j];
    if (state.settings.mixed && gender.get(pa) !== gender.get(pb)) continue;
    A.playerIds[i] = pb;
    B.playerIds[j] = pa;
    const c = cost();
    if (c < best) best = c;
    else {
      A.playerIds[i] = pa;
      B.playerIds[j] = pb;
    }
  }
  return teams;
}

/** Échange deux joueurs entre leurs équipes respectives (échange manuel). */
export function swapPlayers(teams: Team[], p1: string, p2: string): Team[] {
  const t1 = teams.find((t) => t.playerIds.includes(p1));
  const t2 = teams.find((t) => t.playerIds.includes(p2));
  if (!t1 || !t2 || t1 === t2) return teams;
  return teams.map((t) => {
    if (t.id !== t1.id && t.id !== t2.id) return t;
    return {
      ...t,
      playerIds: t.playerIds.map((id) => (id === p1 ? p2 : id === p2 ? p1 : id)),
    };
  });
}

export function makePools(teamIds: string[], count: number, ordered = false): Pool[] {
  const pools: Pool[] = Array.from({ length: count }, (_, i) => ({
    id: uid(),
    name: `Poule ${String.fromCharCode(65 + i)}`,
    teamIds: [],
  }));
  if (ordered) {
    // Ordre de force décroissant : en serpentin (1 2 3 3 2 1…) pour des poules équilibrées
    teamIds.forEach((id, i) => {
      const row = Math.floor(i / count);
      const col = i % count;
      pools[row % 2 === 0 ? col : count - 1 - col].teamIds.push(id);
    });
    return pools;
  }
  // Distribution circulaire : les premières poules reçoivent l'équipe en plus, comme l'aperçu de l'admin
  shuffle(teamIds).forEach((id, i) => pools[i % count].teamIds.push(id));
  return pools;
}

/** Méthode du cercle : chaque équipe joue contre toutes les autres, rounds répartis. */
export function roundRobin(ids: string[]): { round: number; a: string; b: string }[] {
  const list: (string | null)[] = [...ids];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const out: { round: number; a: string; b: string }[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a && b) out.push({ round: r + 1, a, b });
    }
    list.splice(1, 0, list.pop()!);
  }
  return out;
}

const nextOrder = (matches: Match[]) => matches.reduce((m, x) => Math.max(m, x.order + 1), 0);

function newMatch(
  base: Pick<Match, 'phase' | 'round' | 'label' | 'teamA' | 'teamB' | 'poolId'>,
  order: number,
): Match {
  return { id: uid(), ...base, order, sets: [], status: 'pending', courtId: null, winner: null };
}

/** Matchs de poule (round-robin dans chaque poule), triés par round pour éviter deux matchs d'affilée d'une même équipe. */
function poolMatches(pools: Pool[]): Match[] {
  // Ordre de jeu : par round, puis en alternant les poules (A, B, C, A, B, C…) pour ne pas jouer une poule entière d'affilée
  const seen = new Map<string, number>();
  const games = pools.flatMap((p, pi) =>
    roundRobin(p.teamIds).map((m) => {
      const key = `${p.id}-${m.round}`;
      const k = seen.get(key) ?? 0;
      seen.set(key, k + 1);
      return { ...m, poolId: p.id, pool: p.name, pi, k };
    }),
  );
  games.sort((x, y) => x.round - y.round || x.k - y.k || x.pi - y.pi);
  return games.map((g, i) =>
    newMatch({ phase: 'poule', round: g.round, label: g.pool, teamA: g.a, teamB: g.b, poolId: g.poolId }, i),
  );
}

export const formatOf = (state: TournamentState): Format => state.settings.format ?? 'classement';

/** Nombre de tableaux finaux selon le mode. */
export function bracketCount(state: TournamentState): number {
  const f = formatOf(state);
  if (f === 'classement' || f === 'niveau') return Math.min(state.settings.zones ?? 3, BRACKET_PHASES.length);
  if (f === 'consolante') return 2;
  if (f === 'croisement') return 1;
  return 0;
}

export function generatePools(state: TournamentState): TournamentState {
  // Mode « niveau » : poules équilibrées par niveau (les plus forts en premier, en serpentin)
  const niveau = formatOf(state) === 'niveau';
  const ids = [...state.teams]
    .sort((a, b) => (niveau ? teamLevel(state, b) - teamLevel(state, a) : 0))
    .map((t) => t.id);
  const pools = makePools(ids, state.settings.pools, niveau);
  return dispatch({ ...state, pools, brackets: [], matches: poolMatches(pools) });
}

/** Les poules sont modifiables tant qu'aucun match de poule n'est terminé et qu'aucune poule finale n'existe. */
export const poolsEditable = (state: TournamentState) =>
  state.matches.filter((m) => m.phase === 'poule').every((m) => m.status !== 'done') &&
  !state.matches.some((m) => m.phase === 'finale');

/** Déplace une équipe dans une autre poule (les effectifs peuvent devenir inégaux), et recalcule les matchs de poule. */
export function moveTeamToPool(state: TournamentState, teamId: string, poolId: string): TournamentState {
  if (!poolsEditable(state) || state.pools.find((p) => p.teamIds.includes(teamId))?.id === poolId) return state;
  const pools = state.pools.map((p) => ({
    ...p,
    teamIds: [...p.teamIds.filter((id) => id !== teamId), ...(p.id === poolId ? [teamId] : [])],
  }));
  return dispatch({ ...state, pools, matches: poolMatches(pools) });
}

/** Échange deux équipes entre leurs poules, et recalcule les matchs de poule. */
export function swapTeamsInPools(state: TournamentState, a: string, b: string): TournamentState {
  if (!poolsEditable(state)) return state;
  const pools = state.pools.map((p) => ({
    ...p,
    teamIds: p.teamIds.map((id) => (id === a ? b : id === b ? a : id)),
  }));
  return dispatch({ ...state, pools, matches: poolMatches(pools) });
}

/** Classement d'une poule : victoires, puis différence de points, puis points marqués. */
export interface Standing {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  pf: number;
  pa: number;
  diff: number;
}

export function standings(teamIds: string[], matches: Match[]): Standing[] {
  const rows = new Map<string, Standing>(
    teamIds.map((id) => [id, { teamId: id, played: 0, wins: 0, losses: 0, pf: 0, pa: 0, diff: 0 }]),
  );
  for (const m of matches) {
    if (m.status !== 'done' || !m.winner) continue;
    const A = rows.get(m.teamA);
    const B = rows.get(m.teamB);
    if (!A || !B) continue;
    for (const s of m.sets) {
      A.pf += s.a;
      A.pa += s.b;
      B.pf += s.b;
      B.pa += s.a;
    }
    A.played++;
    B.played++;
    if (m.winner === m.teamA) {
      A.wins++;
      B.losses++;
    } else {
      B.wins++;
      A.losses++;
    }
  }
  rows.forEach((r) => (r.diff = r.pf - r.pa));
  return [...rows.values()].sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.pf - x.pf);
}

const withdrawnIds = (state: TournamentState) => new Set(state.teams.filter((t) => t.withdrawn).map((t) => t.id));

/** Qualifiés (dans l'ordre de tête de série) et éliminés des poules. Les équipes forfait sont exclues. */
export function qualifiedTeams(state: TournamentState): { qualified: string[]; rest: string[] } {
  const out = withdrawnIds(state);
  const tables = state.pools.map((pool) =>
    standings(
      pool.teamIds,
      state.matches.filter((m) => m.poolId === pool.id),
    )
      .map((s) => s.teamId)
      .filter((id) => !out.has(id)),
  );
  const q = state.settings.qualifiedPerPool;
  const qualified: string[] = [];
  for (let pos = 0; pos < q; pos++) for (const t of tables) if (t[pos]) qualified.push(t[pos]);
  const rest = tables.flatMap((t) => t.slice(q));
  return { qualified, rest };
}

export const poolsDone = (state: TournamentState) =>
  state.matches.filter((m) => m.phase === 'poule').every((m) => m.status === 'done');

/**
 * Répartition des équipes dans les tableaux selon le mode.
 * - consolante : qualifiés en tableau principal, les autres en consolante ;
 * - croisement : qualifiés en tableau unique ;
 * - classement / niveau : par classement, taille de chaque tableau réglée (le dernier prend le reste) ;
 * - poules / suisse : aucun tableau.
 */
export function tiers(state: TournamentState): Record<BracketPhase, string[]> {
  const result: Record<BracketPhase, string[]> = { finale: [], supp: [], bas: [], tab4: [] };
  const f = formatOf(state);
  if (f === 'consolante') {
    const { qualified, rest } = qualifiedTeams(state);
    return { ...result, finale: qualified, supp: rest };
  }
  if (f === 'croisement') return { ...result, finale: qualifiedTeams(state).qualified };
  if (f === 'poules' || f === 'suisse') return result;

  const zones = bracketCount(state);
  const sizes = state.settings.zoneSizes ?? [4, 8];
  const out = withdrawnIds(state);
  const ranked = state.pools
    .flatMap((pool) =>
      standings(pool.teamIds, state.matches.filter((m) => m.poolId === pool.id))
        .filter((s) => !out.has(s.teamId))
        .map((s, pos) => ({ ...s, pos })),
    )
    .sort((x, y) => x.pos - y.pos || y.wins - x.wins || y.diff - x.diff || y.pf - x.pf)
    .map((r) => r.teamId);
  let start = 0;
  for (let z = 0; z < zones; z++) {
    const size = sizes[z] ?? (z === zones - 1 ? ranked.length - start : 0);
    result[BRACKET_PHASES[z]] = ranked.slice(start, start + size);
    start += size;
  }
  return result;
}

/**
 * Appariement du 1er tour : 1 contre dernier, puis on échange les adversaires quand deux équipes
 * d'une même poule se retrouvent face à face, pour les séparer si possible.
 */
export function seedPairs(list: string[], poolOf: (id: string) => string | undefined): [string, string][] {
  const L = [...list];
  const n = L.length;
  const same = (a: string, b: string) => poolOf(a) !== undefined && poolOf(a) === poolOf(b);
  for (let i = 0; i < n / 2; i++) {
    const bi = n - 1 - i;
    if (!same(L[i], L[bi])) continue;
    for (let j = i + 1; j < n / 2; j++) {
      const bj = n - 1 - j;
      if (!same(L[i], L[bj]) && !same(L[j], L[bi])) {
        [L[bi], L[bj]] = [L[bj], L[bi]];
        break;
      }
    }
  }
  return Array.from({ length: n / 2 }, (_, i) => [L[i], L[n - 1 - i]] as [string, string]);
}

export const canStartBracket = (state: TournamentState, phase: BracketPhase) =>
  poolsDone(state) && state.matches.some((m) => m.phase === 'poule') && tiers(state)[phase].length >= 2;

/**
 * Forfait d'une équipe : ses matchs non terminés sont gagnés par l'adversaire (sans score),
 * les terrains se libèrent, et l'équipe n'est plus qualifiée.
 */
export function withdrawTeam(state: TournamentState, teamId: string): TournamentState {
  const teams = state.teams.map((t) => (t.id === teamId ? { ...t, withdrawn: true } : t));
  const matches = state.matches.map((m) => {
    if (m.status === 'done' || (m.teamA !== teamId && m.teamB !== teamId)) return m;
    return { ...m, status: 'done' as const, winner: m.teamA === teamId ? m.teamB : m.teamA };
  });
  return dispatch({ ...state, teams, matches });
}

/** Crée une phase à élimination directe et son premier tour. */
export function startBracket(state: TournamentState, phase: BracketPhase, entrants: string[]): TournamentState {
  const brackets: Bracket[] = [...state.brackets.filter((b) => b.phase !== phase), { phase, entrants }];
  const matches = state.matches.filter((m) => m.phase !== phase);
  return dispatch(bracketRound({ ...state, brackets, matches }, phase));
}

/**
 * Génère le tour suivant d'une phase finale / supplémentaire, si le tour courant est terminé.
 * Tour 1 : les têtes de série reçoivent un bye si le nombre d'équipes n'est pas une puissance de 2.
 */
export function bracketRound(state: TournamentState, phase: BracketPhase): TournamentState {
  const br = state.brackets.find((b) => b.phase === phase);
  if (!br) return state;
  const ms = state.matches.filter((m) => m.phase === phase);
  const round = ms.reduce((r, m) => Math.max(r, m.round), 0);
  const current = ms.filter((m) => m.round === round).sort((a, b) => a.order - b.order);
  if (current.some((m) => m.status !== 'done')) return state;

  let list: string[];
  if (round === 0) {
    list = br.entrants;
  } else {
    const winners = current.map((m) => m.winner!);
    if (round === 1) {
      // Les équipes absentes du premier tour ont un bye : elles entrent au tour 2
      const inRound1 = new Set(current.flatMap((m) => [m.teamA, m.teamB]));
      const byes = br.entrants.filter((id) => !inRound1.has(id));
      // Les exempts jouent entre eux, les vainqueurs du 1er tour aussi
      list = [...byes, ...winners];
    } else {
      list = winners;
    }
  }
  if (list.length < 2) return state;

  let pairs: [string, string][] = [];
  const n = list.length;
  if (round === 0) {
    const byes = 2 ** Math.ceil(Math.log2(n)) - n;
    const poolOf = (id: string) => state.pools.find((p) => p.teamIds.includes(id))?.id;
    pairs = seedPairs(list.slice(byes), poolOf);
  } else {
    for (let i = 0; i + 1 < n; i += 2) pairs.push([list[i], list[i + 1]]);
  }

  const label = n === 2 ? 'Finale' : n === 4 ? 'Demi-finales' : n === 8 ? 'Quarts de finale' : `Tour ${round + 1}`;
  const base = nextOrder(state.matches);
  const out = withdrawnIds(state);
  const matches = [
    ...state.matches,
    ...pairs.map(([a, b], i) => {
      const m = newMatch({ phase, round: round + 1, label, teamA: a, teamB: b }, base + i);
      // Une équipe forfait au tableau : l'adversaire passe directement
      if (!out.has(a) && !out.has(b)) return m;
      return { ...m, status: 'done' as const, winner: out.has(a) && !out.has(b) ? b : a };
    }),
  ];
  // Affectation immédiate aux terrains libres (sinon les nouveaux matchs restent en attente)
  return dispatch({ ...state, matches });
}

/** Mode « poules » : les qualifiés de chaque poule forment une poule finale en round-robin. */
export function startPoolFinal(state: TournamentState): TournamentState {
  if (!poolsDone(state) || state.matches.some((m) => m.phase === 'finale')) return state;
  const teamIds = qualifiedTeams(state).qualified;
  if (teamIds.length < 2) return state;
  const pool: Pool = { id: uid(), name: 'Poule finale', teamIds };
  const base = nextOrder(state.matches);
  const games = roundRobin(teamIds);
  const matches = [
    ...state.matches,
    ...games.map((g, i) =>
      newMatch({ phase: 'finale', round: g.round, label: 'Poule finale', teamA: g.a, teamB: g.b, poolId: pool.id }, base + i),
    ),
  ];
  return dispatch({ ...state, pools: [...state.pools, pool], matches });
}

/**
 * Système suisse : chaque tour oppose les équipes au même nombre de victoires, sans rencontre déjà jouée.
 * Le 1er tour est tiré au sort. Les matchs suisses n'ont pas de poule.
 */
export function swissNextRound(state: TournamentState): TournamentState {
  const swiss = state.matches.filter((m) => m.phase === 'poule' && !m.poolId);
  const round = swiss.reduce((r, m) => Math.max(r, m.round), 0);
  if (round >= (state.settings.swissRounds ?? 4) || swiss.some((m) => m.round === round && m.status !== 'done')) return state;
  const out = withdrawnIds(state);
  const teamIds = state.teams.filter((t) => !out.has(t.id)).map((t) => t.id);
  if (teamIds.length < 2) return state;
  let order = round === 0 ? shuffle(teamIds) : standings(teamIds, swiss).map((s) => s.teamId);
  if (order.length % 2) {
    // Nombre impair : le repos revient à l'équipe la moins bien classée qui a le moins de repos
    const byes = (id: string) => round - swiss.filter((m) => m.teamA === id || m.teamB === id).length;
    const minByes = Math.min(...order.map(byes));
    const rest = [...order].reverse().find((id) => byes(id) === minByes)!;
    order = order.filter((id) => id !== rest);
  }
  const met = (a: string, b: string) => swiss.some((m) => (m.teamA === a && m.teamB === b) || (m.teamA === b && m.teamB === a));
  const free = [...order];
  const pairs: [string, string][] = [];
  while (free.length > 1) {
    const a = free.shift()!;
    let k = free.findIndex((b) => !met(a, b));
    if (k < 0) k = 0;
    const [b] = free.splice(k, 1);
    pairs.push([a, b]);
  }
  const base = nextOrder(state.matches);
  const matches = [
    ...state.matches,
    ...pairs.map(([a, b], i) =>
      newMatch({ phase: 'poule', round: round + 1, label: `Tour ${round + 1}`, teamA: a, teamB: b }, base + i),
    ),
  ];
  return dispatch({ ...state, matches });
}

/** Sets aléatoires valides jusqu'à ce qu'une équipe atteigne le nombre de sets gagnants (pour les tests). */
export function randomSets(setsToWin: number): SetScore[] {
  const sets: SetScore[] = [];
  let a = 0;
  let b = 0;
  while (a < setsToWin && b < setsToWin) {
    const aWins = Math.random() < 0.5;
    const lo = rand(20);
    sets.push(aWins ? { a: 21, b: lo } : { a: lo, b: 21 });
    if (aWins) a++;
    else b++;
  }
  return sets;
}

export const isSetValid = (a: number, b: number) => {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi === 21) return lo <= 19;
  // Plafond à 30 : 30-29 (29-29 puis point décisif) ou 30-28 (avance de 2 points à 28-28)
  if (hi === 30) return lo === 28 || lo === 29;
  return hi > 21 && hi < 30 && hi - lo === 2;
};

export function matchWinner(sets: SetScore[], teamA: string, teamB: string, setsToWin: number): string | null {
  const wa = sets.filter((s) => s.a > s.b).length;
  const wb = sets.length - wa;
  if (wa >= setsToWin) return teamA;
  if (wb >= setsToWin) return teamB;
  return null;
}

/** Enregistre le score d'un match. Le match se termine dès qu'une équipe atteint le nombre de sets gagnants. */
export function recordScore(state: TournamentState, matchId: string, sets: SetScore[]): { state: TournamentState; error?: string } {
  const m = state.matches.find((x) => x.id === matchId);
  if (!m) return { state, error: 'Match introuvable' };
  const { setsToWin } = state.settings;
  if (sets.length > 2 * setsToWin - 1) return { state, error: `Au maximum ${2 * setsToWin - 1} set(s)` };
  const bad = sets.findIndex((s) => !isSetValid(s.a, s.b));
  if (bad >= 0) {
    const s = sets[bad];
    return { state, error: `Set ${bad + 1} (${s.a}-${s.b}) invalide : le set se termine à 21 avec 2 pts d’écart, plafond 30` };
  }
  if (matchWinner(sets.slice(0, -1), m.teamA, m.teamB, setsToWin)) {
    return { state, error: 'Le match est déjà gagné avant ce set' };
  }
  const winner = matchWinner(sets, m.teamA, m.teamB, setsToWin);
  const matches = state.matches.map((x) =>
    x.id === matchId
      ? { ...x, sets, winner, status: winner ? ('done' as const) : x.status }
      : x,
  );
  return { state: dispatch({ ...state, matches }) };
}

/**
 * Affecte les matchs en attente aux terrains libres : pour chaque terrain libre,
 * on prend le match jouable dont la poule est la moins avancée (à égalité, le plus ancien).
 */
export function dispatch(state: TournamentState): TournamentState {
  const busyCourts = new Set<string>();
  const busyTeams = new Set<string>();
  for (const m of state.matches) {
    if (m.status !== 'playing') continue;
    busyTeams.add(m.teamA);
    busyTeams.add(m.teamB);
    if (m.courtId) busyCourts.add(m.courtId);
  }
  const freeCourts = state.courts.filter((c) => c.active && !busyCourts.has(c.id));
  const queue = state.matches.filter((m) => m.status === 'pending').sort((a, b) => a.order - b.order);
  // Avancement de chaque poule (matchs lancés ou terminés) : on lance d'abord la poule la moins avancée
  const progress = new Map<string, number>();
  for (const m of state.matches) {
    if (m.status !== 'pending' && m.poolId) progress.set(m.poolId, (progress.get(m.poolId) ?? 0) + 1);
  }
  const started = new Map<string, string>();
  for (const court of freeCourts) {
    const next = queue
      .filter((m) => !started.has(m.id) && !busyTeams.has(m.teamA) && !busyTeams.has(m.teamB))
      .sort((a, b) => (progress.get(a.poolId ?? '') ?? 0) - (progress.get(b.poolId ?? '') ?? 0))[0];
    if (!next) break;
    started.set(next.id, court.id);
    busyTeams.add(next.teamA);
    busyTeams.add(next.teamB);
    if (next.poolId) progress.set(next.poolId, (progress.get(next.poolId) ?? 0) + 1);
  }
  if (!started.size) return state;
  return {
    ...state,
    matches: state.matches.map((m) =>
      started.has(m.id) ? { ...m, status: 'playing', courtId: started.get(m.id)! } : m,
    ),
  };
}

/**
 * Retire un match d'un terrain et le renvoie en fin de file.
 * Sans `nextId`, le terrain repart en affectation automatique ; avec `nextId`, ce match précis prend le terrain.
 */
export function removeFromCourt(state: TournamentState, matchId: string, nextId?: string): TournamentState {
  const current = state.matches.find((m) => m.id === matchId && m.status === 'playing');
  if (!current) return state;
  const last = nextOrder(state.matches);
  let matches = state.matches.map((m) =>
    m.id === matchId ? { ...m, status: 'pending' as const, courtId: null, order: last } : m,
  );
  if (nextId) {
    const next = matches.find((m) => m.id === nextId && m.status === 'pending');
    const busy = new Set(matches.filter((m) => m.status === 'playing').flatMap((m) => [m.teamA, m.teamB]));
    if (!next || busy.has(next.teamA) || busy.has(next.teamB)) return state;
    matches = matches.map((m) => (m.id === nextId ? { ...m, status: 'playing' as const, courtId: current.courtId } : m));
  }
  return dispatch({ ...state, matches });
}

/**
 * Affecte un match en attente à un terrain : si le terrain est libre, le match démarre ; s'il est occupé,
 * le match en cours y est remplacé (il repart en fin de file). Refusé si une équipe joue déjà ailleurs.
 */
export function assignTo(state: TournamentState, matchId: string, courtId: string): TournamentState {
  const m = state.matches.find((x) => x.id === matchId);
  const court = state.courts.find((c) => c.id === courtId);
  if (!m || m.status !== 'pending' || !court?.active) return state;
  const current = state.matches.find((x) => x.status === 'playing' && x.courtId === courtId);
  const busy = new Set(
    state.matches.filter((x) => x.status === 'playing' && x.id !== current?.id).flatMap((x) => [x.teamA, x.teamB]),
  );
  if (busy.has(m.teamA) || busy.has(m.teamB)) return state;
  if (current) return removeFromCourt(state, current.id, matchId);
  return dispatch({
    ...state,
    matches: state.matches.map((x) => (x.id === matchId ? { ...x, status: 'playing' as const, courtId } : x)),
  });
}

/** Prochain match qui pourra démarrer (file d'attente triée, équipes disponibles). */
export function nextPlayable(state: TournamentState): Match | undefined {
  const busy = new Set(state.matches.filter((m) => m.status === 'playing').flatMap((m) => [m.teamA, m.teamB]));
  return state.matches
    .filter((m) => m.status === 'pending' && !busy.has(m.teamA) && !busy.has(m.teamB))
    .sort((a, b) => a.order - b.order)[0];
}

export interface PlayerStat {
  id: string;
  name: string;
  played: number;
  wins: number;
  pf: number;
  pa: number;
  rate: number;
}

export function playerStats(state: TournamentState): PlayerStat[] {
  const stats = new Map<string, PlayerStat>(
    state.players.map((p) => [p.id, { id: p.id, name: p.name, played: 0, wins: 0, pf: 0, pa: 0, rate: 0 }]),
  );
  const members = new Map(state.teams.map((t) => [t.id, t.playerIds]));
  for (const m of state.matches) {
    if (m.status !== 'done' || !m.winner) continue;
    for (const side of [m.teamA, m.teamB]) {
      const pf = m.sets.reduce((s, set) => s + (side === m.teamA ? set.a : set.b), 0);
      const pa = m.sets.reduce((s, set) => s + (side === m.teamA ? set.b : set.a), 0);
      for (const id of members.get(side) ?? []) {
        const s = stats.get(id);
        if (!s) continue;
        s.played++;
        s.pf += pf;
        s.pa += pa;
        if (m.winner === side) s.wins++;
      }
    }
  }
  return [...stats.values()]
    .map((s) => ({ ...s, rate: s.played ? s.wins / s.played : 0 }))
    .sort((x, y) => y.rate - x.rate || y.wins - x.wins || y.pf - x.pf);
}

/** Matchs terminés triés par nombre total de points (le plus de points en premier). */
export function matchTotals(state: TournamentState): { match: Match; total: number }[] {
  return state.matches
    .filter((m) => m.status === 'done' && m.sets.length > 0)
    .map((match) => ({ match, total: match.sets.reduce((sum, s) => sum + s.a + s.b, 0) }))
    .sort((x, y) => y.total - x.total || x.match.order - y.match.order);
}

export interface TeamStat {
  id: string;
  played: number;
  wins: number;
  pf: number;
  pa: number;
  rate: number;
}

/** Statistiques par équipe (paire en double) : matchs, victoires, points marqués et encaissés. */
export function teamStats(state: TournamentState): TeamStat[] {
  const rows = new Map<string, TeamStat>(
    state.teams.map((t) => [t.id, { id: t.id, played: 0, wins: 0, pf: 0, pa: 0, rate: 0 }]),
  );
  for (const m of state.matches) {
    if (m.status !== 'done' || !m.winner) continue;
    for (const side of [m.teamA, m.teamB]) {
      const r = rows.get(side);
      if (!r) continue;
      r.played++;
      if (m.winner === side) r.wins++;
      for (const set of m.sets) {
        r.pf += side === m.teamA ? set.a : set.b;
        r.pa += side === m.teamA ? set.b : set.a;
      }
    }
  }
  return [...rows.values()]
    .filter((r) => r.played > 0)
    .map((r) => ({ ...r, rate: r.wins / r.played }))
    .sort((x, y) => y.rate - x.rate || y.wins - x.wins || y.pf - x.pf);
}

export interface ClubStat {
  id: string;
  name: string;
  players: number;
  played: number;
  wins: number;
  rate: number;
}

/** Classement par club : cumul des matchs et victoires de ses joueurs (un match compte pour chaque joueur). */
export function clubStats(state: TournamentState): ClubStat[] {
  const byPlayer = new Map(playerStats(state).map((s) => [s.id, s]));
  const rows = new Map<string, ClubStat>();
  for (const p of state.players) {
    const id = p.clubId ?? '';
    const name = state.clubs.find((c) => c.id === id)?.name ?? 'Sans club';
    const row = rows.get(id) ?? { id, name, players: 0, played: 0, wins: 0, rate: 0 };
    const s = byPlayer.get(p.id);
    row.players++;
    row.played += s?.played ?? 0;
    row.wins += s?.wins ?? 0;
    rows.set(id, row);
  }
  return [...rows.values()]
    .map((r) => ({ ...r, rate: r.played ? r.wins / r.played : 0 }))
    .sort((x, y) => y.rate - x.rate || y.wins - x.wins);
}

/** Première case libre du plan (ligne par ligne), ou null si le gymnase est plein. */
export function firstFreeCell(state: TournamentState): { row: number; col: number } | null {
  for (let row = 0; row < state.gym.rows; row++) {
    for (let col = 0; col < state.gym.cols; col++) {
      if (!state.courts.some((c) => c.row === row && c.col === col)) return { row, col };
    }
  }
  return null;
}

/**
 * Place un terrain dans une case du plan. Si la case est occupée, les deux terrains échangent leurs places
 * (le terrain évincé reprend la place du terrain déplacé, ou reste non placé). `cell` null = retirer du plan.
 */
export function placeCourt(state: TournamentState, courtId: string, cell: { row: number; col: number } | null): TournamentState {
  const courts = state.courts.map((c) => ({ ...c }));
  const dragged = courts.find((c) => c.id === courtId);
  if (!dragged) return state;
  if (!cell) {
    dragged.row = undefined;
    dragged.col = undefined;
    return { ...state, courts };
  }
  const other = courts.find((c) => c.id !== courtId && c.row === cell.row && c.col === cell.col);
  if (other) {
    other.row = dragged.row;
    other.col = dragged.col;
  }
  dragged.row = cell.row;
  dragged.col = cell.col;
  return { ...state, courts };
}

/** Taille de chaque poule : les premières reçoivent une équipe de plus si le reste n'est pas nul. */
export const poolSizes = (teams: number, pools: number) =>
  Array.from({ length: pools }, (_, i) => Math.floor(teams / pools) + (i < teams % pools ? 1 : 0));

export interface MatchStats {
  total: number;
  min: number;
  max: number;
}

/** Taille (en équipes) de chaque tableau selon le mode et le nombre d'équipes inscrites. */
export function tableauxOf(settings: TournamentState['settings'], teams: number): number[] {
  const f = settings.format ?? 'classement';
  const Q = Math.min(settings.qualifiedPerPool * settings.pools, teams);
  if (f === 'consolante') return [Q, teams - Q].filter((n) => n > 0);
  if (f === 'croisement') return Q > 0 ? [Q] : [];
  if (f !== 'classement' && f !== 'niveau') return [];
  const out: number[] = [];
  let start = 0;
  const zones = bracketCount({ settings } as TournamentState);
  for (let z = 0; z < zones; z++) {
    const size = settings.zoneSizes?.[z] ?? (z === zones - 1 ? teams - start : 0);
    const n = Math.min(size, teams - start);
    if (n > 0) out.push(n);
    start += n;
  }
  return out;
}

/** Nombre de matchs du tournoi et nombre de matchs par équipe (min et max), selon le mode et le nombre d'équipes. */
export function matchStats(settings: TournamentState['settings'], teams: number): MatchStats | null {
  if (teams < 2) return null;
  const f = settings.format ?? 'classement';
  if (f === 'suisse') {
    const R = settings.swissRounds ?? 4;
    return { total: R * Math.floor(teams / 2), min: R - (teams % 2 ? 1 : 0), max: R };
  }
  const sizes = poolSizes(teams, settings.pools);
  const poolGames = (s: number) => (s * (s - 1)) / 2;
  const poolTotal = sizes.reduce((sum, s) => sum + poolGames(s), 0);
  const pMin = Math.min(...sizes) - 1;
  const pMax = Math.max(...sizes) - 1;
  // Équipes qualifiées par poule (au moins 1 par poule)
  const Q = Math.min(settings.qualifiedPerPool * settings.pools, teams);

  if (f === 'poules') {
    // Poule finale en round-robin : les qualifiés jouent tous F-1 matchs de plus
    return { total: poolTotal + poolGames(Q), min: pMin, max: pMax + Q - 1 };
  }

  // Tableaux à élimination : un tableau de n équipes compte n-1 matchs
  const tableaux = tableauxOf(settings, teams);
  const placed = tableaux.reduce((a, b) => a + b, 0);
  const unplaced = teams - placed;
  const bracketTotal = tableaux.reduce((sum, n) => sum + Math.max(n - 1, 0), 0);
  // Au minimum : un match en tableau si toute équipe placée est dans un tableau de 2 équipes ou plus
  const everyPlaced = unplaced === 0 && tableaux.length > 0 && tableaux.every((n) => n >= 2);
  return {
    total: poolTotal + bracketTotal,
    min: pMin + (everyPlaced ? 1 : 0),
    max: pMax + Math.max(0, ...tableaux.map((n) => Math.ceil(Math.log2(n)))),
  };
}

/**
 * Podium d'un tableau une fois la finale jouée : 1er et 2e de la finale, 3e : perdants des demi-finales.
 */
export function bracketPodium(state: TournamentState, phase: BracketPhase): { place: number; teams: string[] }[] {
  const ms = state.matches.filter((m) => m.phase === phase);
  if (!ms.length) return [];
  const last = Math.max(...ms.map((m) => m.round));
  const finals = ms.filter((m) => m.round === last);
  if (finals.length !== 1 || finals[0].status !== 'done' || !finals[0].winner) return [];
  const f = finals[0];
  const podium = [
    { place: 1, teams: [f.winner!] },
    { place: 2, teams: [f.winner === f.teamA ? f.teamB : f.teamA] },
  ];
  const bronze = ms
    .filter((m) => m.round === last - 1 && m.status === 'done' && m.winner)
    .map((m) => (m.winner === m.teamA ? m.teamB : m.teamA));
  if (bronze.length) podium.push({ place: 3, teams: bronze });
  return podium;
}

export const emptyState: TournamentState = {
  gym: { rows: 3, cols: 4 },
  clubs: [],
  players: [],
  courts: [],
  teams: [],
  settings: { teamType: 'double', mixed: true, setsToWin: 1, pools: 2, qualifiedPerPool: 2, zones: 3, zoneSizes: [4, 8, 4] },
  pools: [],
  brackets: [],
  matches: [],
};
