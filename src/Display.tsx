import { bracketPodium, clubStats, matchTotals, nextPlayable, standings, teamLabel, teamStats, tiers } from './logic';
import { useT } from './i18n';
import { CourtPlan, Icon } from './Icons';
import { Fragment } from 'react';
import { Bracket } from './Bracket';
import { MatchVersus } from './MatchVersus';
import { PHASES, type Court, type Match, type TournamentState } from './types';

const CONFETTI_COLORS = ['#f5b301', '#2563eb', '#dc2626', '#16a34a', '#a855f7'];

/** Confettis qui tombent sur la marche du 1er du podium (positions déterministes, pas d'aléatoire au rendu). */
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${((i * 0.13) % 1.5).toFixed(2)}s`, background: CONFETTI_COLORS[i % 5] }}
        />
      ))}
    </div>
  );
}

/** Séparateur du tableau de bord : une ligne avec un volant au centre. */
function DashSeparator() {
  return (
    <div className="dash-sep" aria-hidden="true">
      <Icon name="shuttle" size={20} />
    </div>
  );
}

export default function Display({ state, view = 'general' }: { state: TournamentState; view?: 'general' | 'matchs' | 'terrains' | 'stats' }) {
  const tr = useT();
  const playing = state.matches.filter((m) => m.status === 'playing').sort((a, b) => a.order - b.order);
  const pending = state.matches.filter((m) => m.status === 'pending').sort((a, b) => a.order - b.order);
  const done = state.matches.filter((m) => m.status === 'done').length;
  const next = nextPlayable(state);
  // Podium : une fois la poule finale terminée, les 3 premiers de son classement
  const finalePool = state.pools.find((p) => state.matches.some((m) => m.phase === 'finale' && m.poolId === p.id));
  const finaleMatches = state.matches.filter((m) => m.poolId && m.poolId === finalePool?.id);
  const podium =
    finalePool && finaleMatches.length && finaleMatches.every((m) => m.status === 'done')
      ? standings(finalePool.teamIds, finaleMatches).slice(0, 3)
      : [];
  const courtsFree = state.courts.filter((c) => c.active && !playing.some((m) => m.courtId === c.id));

  const label = (m: Match) => <MatchVersus state={state} match={m} />;
  const phaseName = (m: Match) => tr(m.label || PHASES[m.phase]);
  const inGym = (c: Court) => c.row !== undefined && c.col !== undefined && c.row < state.gym.rows && c.col < state.gym.cols;
  const unplaced = state.courts.filter((c) => !inGym(c));

  // Carte KPI : total de points d'un match, avec les équipes et le score
  const kpi = (title: string, hit?: { match: Match; total: number }) => (
    <div className="card kpi">
      <p className="kpi-label">{tr(title)}</p>
      {hit ? (
        <>
          <p className="kpi-value">
            {hit.total} <span>{tr("pts")}</span>
          </p>
          <MatchVersus state={state} match={hit.match} />
          <p className="score">{hit.match.sets.map((s) => `${s.a}-${s.b}`).join(' · ')}</p>
        </>
      ) : (
        <p className="hint">{tr("Aucun match terminé.")}</p>
      )}
    </div>
  );

  const courtCard = (c: Court) => {
    const m = playing.find((x) => x.courtId === c.id);
    return (
      <div key={c.id} className={`card court ${m ? 'busy' : c.active ? 'free' : 'off'}`}>
        <div className="court-head">
          <span className="court-name">{c.name}</span>
          <span className={`tag ${!c.active ? '' : m ? 'live' : 'free'}`}>{!c.active ? tr('Fermé') : m ? <><strong>{phaseName(m)}</strong> {tr("- Match en cours")}</> : tr('Libre')}</span>
        </div>
        <CourtPlan />
        {c.active && m && (
          <>
            <MatchVersus state={state} match={m} stacked />
            <p className="score">{m.sets.map((s) => `${s.a}-${s.b}`).join(' · ')}</p>
          </>
        )}
        {c.active && !m && next && <p className="hint">{tr("Prochain")} : {label(next)}</p>}
        {c.active && !m && !next && (
          <p className="hint">{pending.length ? tr('En attente : les équipes suivantes jouent encore') : tr('Plus de match à venir')}</p>
        )}
      </div>
    );
  };

  return (
    <div className="display">
      <header className="topbar">
        <h1>
          <Icon name="shuttle" size={24} /> {tr("Tournoi de badminton")}
        </h1>
        <span className="hint">
          {done}/{state.matches.length} {tr("matchs terminés")} · {courtsFree.length} {tr("terrain(s) libre(s)")}
        </span>
      </header>
      <nav className="tabs">
        <a href="#/display" className={view === 'general' ? 'active' : ''}>
          <Icon name="trophy" /> {tr("Tableau de bord")}
        </a>
        <a
          href="#/display/matchs"
          className={`${view === 'matchs' ? 'active' : ''} ${playing.length || pending.length ? '' : 'disabled'}`}
        >
          <Icon name="clock" /> {tr("Matchs")}
        </a>
        <a href="#/display/terrains" className={view === 'terrains' ? 'active' : ''}>
          <Icon name="court" /> {tr("Terrains")}
        </a>
        <a href="#/display/stats" className={view === 'stats' ? 'active' : ''}>
          <Icon name="chart" /> {tr("Statistiques")}
        </a>
      </nav>

      {view === 'terrains' && (
      <section>
        <h2>
          <Icon name="court" /> {tr("Terrains")}
        </h2>
        {state.courts.length === 0 && <p className="hint">{tr("Aucun terrain configuré.")}</p>}
        <div className="gym" style={{ gridTemplateColumns: `repeat(${state.gym.cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: state.gym.rows }, (_, r) =>
            Array.from({ length: state.gym.cols }, (_, c) => {
              const court = state.courts.find((x) => x.row === r && x.col === c);
              return (
                <div key={`${r}-${c}`} className="gym-cell display-cell">
                  {court && courtCard(court)}
                </div>
              );
            }),
          )}
        </div>
        {unplaced.length > 0 && (
          <>
            <p className="hint">{tr("Terrains non placés sur le plan")}</p>
            <div className="grid3">{unplaced.map(courtCard)}</div>
          </>
        )}
      </section>
      )}

      {view === 'matchs' && (
      <section className="grid2">
        <div>
          <h2>
            <Icon name="shuttle" /> {tr("En cours")}
          </h2>
          {playing.length ? (
            <ul className="list">
              {playing.map((m) => (
                <li key={m.id}>
                  <span className="tag live">{phaseName(m)}</span> {label(m)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">{tr("Aucun match en cours.")}</p>
          )}
        </div>
        <div>
          <h2>
            <Icon name="clock" /> {tr("À venir")} ({pending.length})
          </h2>
          <ol className="list">
            {pending.slice(0, 12).map((m) => (
              <li key={m.id}>
                <span className="tag">{phaseName(m)}</span> {label(m)}
              </li>
            ))}
          </ol>
          {pending.length > 12 && <p className="hint">… {pending.length - 12} autres</p>}
        </div>
      </section>
      )}

      {view === 'general' && (
        <>
      {podium.length > 0 && (
        <section>
          <h2>
            <Icon name="trophy" /> {tr("Podium")}
          </h2>
          <div className="podium">
            {[1, 0, 2].map((k) => (
              <div key={`rank-${k}`} className={`podium-step rank-${k + 1}`}>
                {k === 0 && <Confetti />}
                <span className="medal">{['🥇', '🥈', '🥉'][k]}</span>
                {podium[k] ? <strong>{teamLabel(state, podium[k].teamId)}</strong> : <span className="hint">—</span>}
              </div>
            ))}
          </div>
        </section>
      )}
      {state.brackets.map((b) => bracketPodium(state, b.phase).length > 0 && (
        <section key={b.phase}>
          <h2>
            <Icon name="trophy" /> {tr("Podium")} – {tr(PHASES[b.phase])}
          </h2>
          <div className="podium">
            {[2, 1, 3].map((place) => {
              const step = bracketPodium(state, b.phase).find((p) => p.place === place);
              return (
                <div key={place} className={`podium-step rank-${place}`}>
                  {place === 1 && <Confetti />}
                  <span className="medal">{['🥇', '🥈', '🥉'][place - 1]}</span>
                  {step ? (
                    step.teams.map((t) => <strong key={t}>{teamLabel(state, t)}</strong>)
                  ) : (
                    <span className="hint">—</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {state.brackets.map((b) => (
        <Fragment key={b.phase}>
        <DashSeparator />
        <section>
          <h2>
            <Icon name="trophy" /> {tr(PHASES[b.phase])}
          </h2>
          <div className="bracket-scroll">
            <Bracket state={state} phase={b.phase} />
          </div>
        </section>
        </Fragment>
      ))}
      {state.settings.format === 'suisse' && (
        <section>
          <h2>
            <Icon name="trophy" /> {tr("Classement général")}
          </h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{tr("Équipe")}</th>
                <th>{tr("J")}</th>
                <th>{tr("V")}</th>
                <th>{tr("Diff")}</th>
              </tr>
            </thead>
            <tbody>
              {standings(
                state.teams.map((t) => t.id),
                state.matches.filter((m) => m.phase === 'poule' && !m.poolId),
              ).map((r, i) => (
                <tr key={r.teamId}>
                  <td>{['🥇', '🥈', '🥉'][i] ?? i + 1}</td>
                  <td>{teamLabel(state, r.teamId)}</td>
                  <td>{r.played}</td>
                  <td>{r.wins}</td>
                  <td>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {state.settings.format !== 'suisse' && (
        <>
        <DashSeparator />
      <section>
        <h2>
          <Icon name="trophy" /> {tr("Classements des poules")}
        </h2>
        <div className="grid3">
          {state.pools.map((pool) => {
            const rows = standings(pool.teamIds, state.matches.filter((m) => m.poolId === pool.id));
            return (
              <div className="card" key={pool.id}>
                <h3>{tr(pool.name)}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>{tr("Équipe")}</th>
                      <th>{tr("J")}</th>
                      <th>{tr("V")}</th>
                      <th>{tr("Diff")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.teamId} className={tiers(state).finale.includes(r.teamId) && r.played > 0 ? 'qualified' : ''}>
                        <td>
                          {i === 0 && r.played > 0 ? <strong>{teamLabel(state, r.teamId)}</strong> : teamLabel(state, r.teamId)}
                          {state.teams.find((t) => t.id === r.teamId)?.withdrawn && <span className="tag live">{tr("forfait")}</span>}
                        </td>
                        <td>{r.played}</td>
                        <td>{r.wins}</td>
                        <td>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>
        </>
      )}

        </>
      )}

      {view === 'stats' && (
        <>
      <section className="grid2">
        {kpi('Match le plus long', matchTotals(state)[0])}
        {kpi('Match le plus court', matchTotals(state).at(-1))}
      </section>

      <section>
        <h2>
          <Icon name="trophy" /> {tr("Classement par club")}
        </h2>
        {done === 0 ? (
          <p className="hint">{tr("Le classement apparaîtra après les premiers scores.")}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{tr("Club")}</th>
                <th>{tr("Joueurs")}</th>
                <th>{tr("Matchs")}</th>
                <th>{tr("Victoires")}</th>
                <th>{tr("% victoires")}</th>
              </tr>
            </thead>
            <tbody>
              {clubStats(state)
                .filter((c) => c.played > 0)
                .map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td>{tr(c.name)}</td>
                    <td>{c.players}</td>
                    <td>{c.played}</td>
                    <td>{c.wins}</td>
                    <td>{Math.round(c.rate * 100)} %</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        <h2>
          <Icon name="chart" /> {tr("Statistiques des équipes")}
        </h2>
        {done === 0 ? (
          <p className="hint">{tr("Les statistiques apparaîtront après les premiers scores.")}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{tr("Équipe")}</th>
                <th>{tr("Matchs")}</th>
                <th>{tr("Victoires")}</th>
                <th>{tr("% victoires")}</th>
                <th>{tr("Points pour / contre")}</th>
              </tr>
            </thead>
            <tbody>
              {teamStats(state).map((s) => (
                <tr key={s.id}>
                  <td>{teamLabel(state, s.id)}</td>
                  <td>{s.played}</td>
                  <td>{s.wins}</td>
                  <td>{Math.round(s.rate * 100)} %</td>
                  <td>
                    {s.pf} / {s.pa}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
        </>
      )}
    </div>
  );
}
