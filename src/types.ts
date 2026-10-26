export type Gender = 'H' | 'F';
export type Level = 1 | 2 | 3 | 4;
export const LEVELS: Record<Level, string> = {
  1: 'Débutant',
  2: 'Intermédiaire',
  3: 'Avancé',
  4: 'Fort',
};
export const LEVEL_LIST: Level[] = [1, 2, 3, 4];

export type TeamType = 'simple' | 'double';
export type BracketPhase = 'finale' | 'supp' | 'bas' | 'tab4';
/** Tableaux finaux dans l'ordre : le 1er regroupe les meilleures équipes. */
export const BRACKET_PHASES: BracketPhase[] = ['finale', 'supp', 'bas', 'tab4'];
export type Phase = 'poule' | BracketPhase;
export const PHASES: Record<Phase, string> = {
  poule: 'Poules',
  finale: 'Tableau 1',
  supp: 'Tableau 2',
  bas: 'Tableau 3',
  tab4: 'Tableau 4',
};

export interface Club {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  level: Level;
  clubId?: string;
}

export interface Court {
  id: string;
  name: string;
  active: boolean;
  /** Position dans le plan du gymnase (absente tant que le terrain n'est pas placé). */
  row?: number;
  col?: number;
}

export interface Team {
  id: string;
  playerIds: string[];
  forced: boolean;
  withdrawn?: boolean;
}

export interface SetScore {
  a: number;
  b: number;
}

export interface Match {
  id: string;
  phase: Phase;
  round: number;
  label: string;
  poolId?: string;
  order: number;
  teamA: string;
  teamB: string;
  sets: SetScore[];
  status: 'pending' | 'playing' | 'done';
  courtId: string | null;
  winner: string | null;
}

export interface Pool {
  id: string;
  name: string;
  teamIds: string[];
}

export interface Bracket {
  phase: BracketPhase;
  entrants: string[];
}

/** Modes de déroulement du tournoi. */
export type Format = 'classement' | 'consolante' | 'croisement' | 'niveau' | 'poules' | 'suisse';
export const FORMATS: Record<Format, string> = {
  classement: 'Poules puis tableaux par classement',
  consolante: 'Poules puis tableau principal + consolante',
  croisement: 'Poules puis tableau unique (croisement)',
  niveau: 'Poules de niveau puis tableaux par classement',
  poules: 'Poules puis poule finale (sans tableau)',
  suisse: 'Système suisse (sans poules)',
};

/** À qui correspond chaque mode, affiché sous le choix du mode. */
export const FORMAT_HINTS: Record<Format, string> = {
  classement: 'Tournoi de club avec beaucoup d’équipes : après les poules, les meilleures jouent le tableau 1, les suivantes le tableau 2, etc.',
  consolante: 'Pour les joueurs qui veulent jouer plusieurs matchs : les qualifiés jouent le tableau principal, les autres une consolante.',
  croisement: 'Tournoi court et compétitif : seuls les qualifiés jouent, en croisant les poules pour éviter les revanches précoces. Pas de consolante.',
  niveau: 'Tournoi mélangé avec de grands écarts de niveau : les poules sont équilibrées par niveau, puis les tableaux suivent le classement.',
  poules: 'Format convivial sans élimination : les poules donnent le classement, et les qualifiés se retrouvent en poule finale.',
  suisse: 'Grand nombre d’équipes où tout le monde joue le même nombre de matchs : les équipes à égalité de victoires s’affrontent, sans poules.',
};

export interface Settings {
  format?: Format;
  /** Système suisse : nombre de tours. */
  swissRounds?: number;
  teamType: TeamType;
  mixed: boolean;
  setsToWin: 1 | 2;
  pools: number;
  qualifiedPerPool: number;
  /** Nombre de tableaux finaux (1 à 4) et nombre d'équipes de chaque tableau, du meilleur au plus faible. */
  zones?: number;
  zoneSizes?: number[];
}

export interface TournamentState {
  gym: { rows: number; cols: number };
  clubs: Club[];
  players: Player[];
  courts: Court[];
  teams: Team[];
  settings: Settings;
  pools: Pool[];
  brackets: Bracket[];
  matches: Match[];
}
