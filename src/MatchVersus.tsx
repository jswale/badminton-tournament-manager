import { Icon } from './Icons';
import type { Match, TournamentState } from './types';

/** Affiche un match « Joueur1 / Joueur2 VS Joueur3 / Joueur4 » avec un badge VS façon volant. */
export function MatchVersus({
  state,
  match,
  stacked = false,
  trophy = false,
}: {
  state: TournamentState;
  match: Match;
  stacked?: boolean;
  trophy?: boolean;
}) {
  const side = (teamId: string) => {
    const names = state.teams.find((t) => t.id === teamId)?.playerIds.map((id) => state.players.find((p) => p.id === id)?.name ?? '?') ?? [];
    return (
      <span className={`team-name ${match.winner === teamId ? 'win' : ''}`}>
        {trophy && match.winner === teamId && <Icon name="trophy" size={14} />}
        {names.map((n, i) => (
          <span key={i}>
            {i > 0 && <span className="slash">/</span>}
            {n}
          </span>
        ))}
      </span>
    );
  };
  return (
    <span className={`versus ${stacked ? 'stacked' : ''}`}>
      {side(match.teamA)}
      <span className="vs">VS</span>
      {side(match.teamB)}
    </span>
  );
}
