import { useT } from './i18n';
import { MatchVersus } from './MatchVersus';
import { teamLabel } from './logic';
import type { BracketPhase, Match, TournamentState } from './types';

// Dimensions en px : une carte de match, l'écart entre tours, et la hauteur d'un emplacement au 1er tour
const CARD_W = 220;
const CARD_H = 120;
const GAP = 56;
const UNIT = 140;
const HEAD = 30;

/** Un emplacement du tableau : un match, ou une équipe exemptée du 1er tour (bye). */
interface Slot {
  match: Match | null;
  bye?: string;
}

/** Libellé d'un tour selon le nombre d'équipes qui y entrent. */
const roundName = (entering: number, round: number) =>
  entering === 2 ? 'Finale' : entering === 4 ? 'Demi-finales' : entering === 8 ? 'Quarts de finale' : `Tour ${round}`;

/** Équipe qui sort d'un emplacement (exempt, ou vainqueur du match une fois joué). */
const valueOf = (s: Slot) => s.bye ?? (s.match?.status === 'done' ? s.match.winner : null);

/**
 * Tableau à élimination directe façon tennis : chaque tour est une colonne, reliée au tour suivant.
 * Le 1er tour affiche aussi les équipes exemptées (cartes « Exempt »), pour que chaque demi-finale soit reliée à sa colonne.
 */
export function Bracket({ state, phase }: { state: TournamentState; phase: BracketPhase }) {
  const tr = useT();
  const entrantIds = state.brackets.find((b) => b.phase === phase)?.entrants ?? [];
  const entrants = entrantIds.length;
  if (entrants < 2) return null;

  // p = taille de la puissance de 2 supérieure ; le 1er tour a p/2 emplacements (matchs ou exemptés)
  const p = 2 ** Math.ceil(Math.log2(entrants));
  const total = Math.log2(p);
  const played = state.matches.filter((m) => m.phase === phase);

  const columns = Array.from({ length: total }, (_, k) => {
    const round = k + 1;
    const count = p / 2 ** round;
    const real = played.filter((m) => m.round === round).sort((x, y) => x.order - y.order);
    let slots: Slot[];
    if (k === 0) {
      const inRound1 = new Set(real.flatMap((m) => [m.teamA, m.teamB]));
      const byes = entrantIds.filter((id) => !inRound1.has(id));
      slots = [...byes.map((id) => ({ match: null, bye: id })), ...real.map((m) => ({ match: m }))];
    } else {
      slots = real.map((m) => ({ match: m }));
    }
    while (slots.length < count) slots.push({ match: null });
    const entering = k === 0 ? entrants : p / 2 ** k;
    return { round, label: roundName(entering, round), slots };
  });
  const width = columns.length * CARD_W + (columns.length - 1) * GAP;
  const height = HEAD + UNIT * columns[0].slots.length;
  // Centre vertical du match j du tour k : entre les deux emplacements qui le alimentent
  const cy = (k: number, j: number) => HEAD + UNIT * 2 ** k * (j + 0.5);
  const x = (k: number) => k * (CARD_W + GAP);

  const lines: string[] = [];
  columns.forEach((col, k) => {
    if (k === columns.length - 1) return;
    col.slots.forEach((_, j) => {
      const x1 = x(k) + CARD_W;
      const xm = x1 + GAP / 2;
      lines.push(`M${x1} ${cy(k, j)} H${xm} V${cy(k + 1, Math.floor(j / 2))} H${x(k + 1)}`);
    });
  });

  return (
    <div className="tennis-bracket" style={{ width, height }}>
      <svg className="bracket-lines" width={width} height={height} aria-hidden="true">
        {lines.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
      {columns.map((col, k) => (
        <div key={col.round}>
          <span className="bracket-title" style={{ left: x(k), width: CARD_W }}>
            {tr(col.label)}
          </span>
          {col.slots.map((slot, j) => {
            const style = { left: x(k), top: cy(k, j) - CARD_H / 2, width: CARD_W, height: CARD_H };
            if (slot.bye) {
              return (
                <div key={`bye-${slot.bye}`} className="bracket-match bye" style={style}>
                  <span className="team-name">{teamLabel(state, slot.bye)}</span>
                  <span className="hint">{tr('Exempt du 1er tour')}</span>
                </div>
              );
            }
            const m = slot.match;
            if (m) {
              return (
                <div key={m.id} className={`bracket-match ${m.status}`} style={style}>
                  <MatchVersus state={state} match={m} stacked trophy />
                  {m.status === 'done' && <span className="score">{m.sets.map((s) => `${s.a}-${s.b}`).join(' · ')}</span>}
                  {m.status === 'playing' && <span className="tag live">{tr('en cours')}</span>}
                </div>
              );
            }
            // Emplacement pas encore joué : on affiche les équipes déjà connues, « ? » pour les autres
            const prev = k > 0 ? columns[k - 1].slots : [];
            const a = k > 0 ? valueOf(prev[2 * j]) : null;
            const b = k > 0 ? valueOf(prev[2 * j + 1]) : null;
            return (
              <div key={`${col.round}-${j}`} className="bracket-match empty" style={style}>
                {a || b ? (
                  <div className="versus stacked">
                    <span className="team-name">{a ? teamLabel(state, a) : '?'}</span>
                    <span className="vs">VS</span>
                    <span className="team-name">{b ? teamLabel(state, b) : '?'}</span>
                  </div>
                ) : (
                  <span className="hint">{tr('En attente')}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
