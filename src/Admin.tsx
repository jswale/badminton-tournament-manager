import { useState, type DragEvent } from 'react';
import { useT } from './i18n';
import { CourtPlan, Icon, type IconName } from './Icons';
import { FormatDiagram, FormatTable } from './FormatDiagram';
import { MatchVersus } from './MatchVersus';
import {
  balanceTeams,
  buildTeams,
  bracketRound,
  bracketCount,
  canStartBracket,
  matchStats,
  poolSizes,
  formatOf,
  poolsDone,
  qualifiedTeams,
  startPoolFinal,
  swissNextRound,
  dispatch,
  firstFreeCell,
  generatePools,
  moveTeamToPool,
  placeCourt,
  assignTo,
  removeFromCourt,
  poolsEditable,
  tiers,
  randomSets,
  recordScore,
  startBracket,
  swapPlayers,
  swapTeamsInPools,
  teamLabel,
  withdrawTeam,
  teamLevel,
  uid,
} from './logic';
import { BRACKET_PHASES, FORMATS, FORMAT_HINTS, LEVELS, LEVEL_LIST, PHASES, type BracketPhase, type Court, type Format, type Gender, type Level, type Match, type Player, type SetScore, type TournamentState } from './types';

type Update = (fn: (s: TournamentState) => TournamentState) => void;
type Tab = 'joueurs' | 'terrains' | 'equipes' | 'tournoi' | 'matchs';

const TABS: [Tab, string, IconName][] = [
  ['joueurs', 'Joueurs', 'player'],
  ['terrains', 'Terrains', 'court'],
  ['equipes', 'Équipes', 'team'],
  ['tournoi', 'Tournoi', 'trophy'],
  ['matchs', 'Matchs & scores', 'shuttle'],
];

/** Icône qui illustre chaque mode de tournoi. */
const FORMAT_ICONS: Record<Format, IconName> = {
  classement: 'list',
  consolante: 'team',
  croisement: 'trophy',
  niveau: 'player',
  poules: 'court',
  suisse: 'clock',
};

/** Taille de chaque poule avant génération : les premières poules reçoivent une équipe de plus si le reste n'est pas nul. */

/** Toute modification de joueurs / équipes remet le tournoi à zéro (poules et tableaux obsolètes). */
const resetTournament = (s: TournamentState) => ({ ...s, pools: [], brackets: [], matches: [] });

export default function Admin({ state, update }: { state: TournamentState; update: Update }) {
  const tr = useT();
  const [tab, setTab] = useState<Tab>('joueurs');
  return (
    <div className="admin">
      <header className="topbar">
        <h1>
          <Icon name="shuttle" size={24} /> {tr("Tournoi de badminton")}
        </h1>
        <a href="#/display" target="_blank" rel="noreferrer" className="btn">
          {tr("Ouvrir l’affichage ↗")}
        </a>
      </header>
      <nav className="tabs">
        {TABS.map(([id, label, icon]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={()=> setTab(id)}>
            <Icon name={icon} /> {tr(label)}
          </button>
        ))}
      </nav>
      <main>
        {tab === 'joueurs' && <PlayersTab state={state} update={update} />}
        {tab === 'terrains' && <CourtsTab state={state} update={update} />}
        {tab === 'equipes' && <TeamsTab state={state} update={update} />}
        {tab === 'tournoi' && <TournamentTab state={state} update={update} />}
        {tab === 'matchs' && <MatchesTab state={state} update={update} />}
      </main>
    </div>
  );
}

type NewPlayer = { name: string; gender: Gender; level: Level; clubId?: string; clubName?: string };

function PlayersTab({ state, update }: { state: TournamentState; update: Update }) {
  const tr = useT();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('H');
  const [level, setLevel] = useState<Level>(2);
  const [clubId, setClubId] = useState('');
  const [newClub, setNewClub] = useState('');
  const [bulk, setBulk] = useState('');

  // Les clubs cités par nom à l'import sont créés s'ils n'existent pas
  const add = (list: NewPlayer[]) =>
    update((s) => {
      const clubs = [...s.clubs];
      const idOf = (n?: string) => {
        if (!n?.trim()) return undefined;
        const key = n.trim().toLowerCase();
        let c = clubs.find((x) => x.name.toLowerCase() === key);
        if (!c) {
          c = { id: uid(), name: n.trim() };
          clubs.push(c);
        }
        return c.id;
      };
      const players = [
        ...s.players,
        ...list.map((p) => ({ id: uid(), name: p.name, gender: p.gender, level: p.level, clubId: p.clubId ?? idOf(p.clubName) })),
      ];
      return resetTournament({ ...s, clubs, players });
    });

  const addOne = () => {
    if (!name.trim()) return;
    add([{ name: name.trim(), gender, level, clubId: clubId || undefined }]);
    setName('');
  };

  const addClub = () => {
    if (!newClub.trim()) return;
    update((s) => ({ ...s, clubs: [...s.clubs, { id: uid(), name: newClub.trim() }] }));
    setNewClub('');
  };

  const removeClub = (id: string) =>
    update((s) => ({
      ...s,
      clubs: s.clubs.filter((c) => c.id !== id),
      players: s.players.map((p) => (p.clubId === id ? { ...p, clubId: undefined } : p)),
    }));

  const setPlayerClub = (id: string, value: string) =>
    update((s) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, clubId: value || undefined } : p)) }));

  const importBulk = () => {
    // Format : une ligne par joueur, "Nom;H;3;Club" (genre H/F, niveau 1 à 4, club optionnel)
    const parsed: NewPlayer[] = bulk
      .split('\n')
      .map((l) => l.split(';').map((x) => x.trim()))
      .filter((c) => c[0])
      .map(([n, g, l, club]) => ({
        name: n,
        gender: (g?.toUpperCase() === 'F' ? 'F' : 'H') as Gender,
        level: Math.min(4, Math.max(1, Number(l) || 2)) as Level,
        clubName: club || undefined,
      }));
    if (parsed.length) add(parsed);
    setBulk('');
  };

  const fake = () => {
    // Mélange de prénoms courts, composés et longs pour tester la mise en page
    const names = [
      'Alice',
      'Bruno-Pierre',
      'Chloé',
      'David',
      'Marie-Christine',
      'Farid',
      'Gaëlle-Anne-Sophie',
      'Hugo',
      'Inès',
      'Jean-Baptiste',
      'Karim',
      'Léa',
      'Maximilien-Alexandre',
      'Nina',
      'Olivier',
      'Paule',
    ];
    add(names.map((n, i) => ({ name: n, gender: i % 2 ? 'F' : 'H', level: ((i % 4) + 1) as Level, clubName: `Club ${'ABC'[i % 3]}` })));
  };

  const clubOptions = state.clubs.map((c) => (
    <option key={c.id} value={c.id}>
      {c.name}
    </option>
  ));

  return (
    <section>
      <h2>{tr('Clubs')} ({state.clubs.length})</h2>
      <div className="row">
        <input placeholder={tr("Nom du club")} value={newClub} onChange={(e) => setNewClub(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addClub()} />
        <button onClick={addClub}>{tr("Ajouter le club")}</button>
      </div>
      {state.clubs.length > 0 && (
        <ul className="list">
          {state.clubs.map((c) => (
            <li key={c.id}>
              <strong>{c.name}</strong>
              <span className="tag">{state.players.filter((p) => p.clubId === c.id).length} {tr('joueur(s)')}</span>
              <button className="danger" onClick={()=> removeClub(c.id)}>{tr("Supprimer")}</button>
            </li>
          ))}
        </ul>
      )}

      <h2>{tr('Joueurs')} ({state.players.length})</h2>
      <div className="row">
        <input placeholder={tr("Nom")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addOne()} />
        <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
          <option value="H">{tr("Homme")}</option>
          <option value="F">{tr("Femme")}</option>
        </select>
        <select value={level} onChange={(e) => setLevel(Number(e.target.value) as Level)}>
          {LEVEL_LIST.map((l) => (
            <option key={l} value={l}>
              {tr(LEVELS[l])}
            </option>
          ))}
        </select>
        <select value={clubId} onChange={(e) => setClubId(e.target.value)}>
          <option value="">{tr("Sans club")}</option>
          {clubOptions}
        </select>
        <button className="primary" onClick={addOne}>{tr("Ajouter")}</button>
        <button onClick={fake}>{tr("16 joueurs fictifs")}</button>
      </div>
      <details>
        <summary>{tr("Import en masse")}</summary>
        <textarea
          rows={5}
          placeholder={'Nom;H;3;Club\nNom;F;1'}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
        />
        <button onClick={importBulk}>{tr("Importer")}</button>
      </details>
      <table>
        <thead>
          <tr>
            <th>{tr("Nom")}</th>
            <th>{tr("Genre")}</th>
            <th>{tr("Niveau")}</th>
            <th>{tr("Club")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {state.players.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{tr(p.gender === 'H' ? 'H' : 'F')}</td>
              <td>
                <select value={p.clubId ?? ''} onChange={(e) => setPlayerClub(p.id, e.target.value)}>
                  <option value="">{tr("Sans club")}</option>
                  {clubOptions}
                </select>
              </td>
              <td>
                <select
                  value={p.level}
                  onChange={(e) =>
                    update((s) => ({
                      ...s,
                      players: s.players.map((x) => (x.id === p.id ? { ...x, level: Number(e.target.value) as Level } : x)),
                    }))
                  }
                >
                  {LEVEL_LIST.map((l) => (
                    <option key={l} value={l}>
                      {tr(LEVELS[l])}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  className="danger"
                  onClick={()=>
                    update((s) =>
                      resetTournament({
                        ...s,
                        teams: s.teams.filter((t) => !t.playerIds.includes(p.id)),
                        players: s.players.filter((x) => x.id !== p.id),
                      }),
                    )
                  }
                >
                  {tr("Supprimer")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CourtsTab({ state, update }: { state: TournamentState; update: Update }) {
  const tr = useT();
  const [name, setName] = useState('');
  const add = () => {
    if (!name.trim()) return;
    // Le nouveau terrain prend la première case libre du plan (sinon il reste non placé)
    update((s) => dispatch({ ...s, courts: [...s.courts, { id: uid(), name: name.trim(), active: true, ...firstFreeCell(s) }] }));
    setName('');
  };
  return (
    <section>
      <h2>{tr("Terrains")}</h2>
      <p className="hint">{tr("Les terrains libres reçoivent automatiquement le prochain match jouable.")}</p>
      <GymMap state={state} update={update} />
      <div className="row">
        <input placeholder={tr("Nom du terrain (ex. T1)")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="primary" onClick={add}>{tr("Ajouter le terrain")}</button>
      </div>
      <ul className="list">
        {state.courts.map((c) => {
          const m = state.matches.find((x) => x.status === 'playing' && x.courtId === c.id);
          return (
            <li key={c.id}>
              <strong>{c.name}</strong>
              <span className={m ? 'tag live' : c.active ? 'tag free' : 'tag'}>
                {!c.active ? tr('Inactif') : m ? tr('Occupé') : tr('Libre')}
              </span>
              <button
                onClick={()=>
                  update((s) =>
                    dispatch({ ...s, courts: s.courts.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)) }),
                  )
                }
              >
                {c.active ? tr('Désactiver') : tr('Activer')}
              </button>
              <button
                className="danger"
                disabled={!!m}
                onClick={()=> update((s) => ({ ...s, courts: s.courts.filter((x) => x.id !== c.id) }))}
              >
                {tr("Supprimer")}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Plan du gymnase : glisser un terrain dans une case, sur une autre case pour échanger, ou dans « Non placés » pour retirer. */
function GymMap({ state, update }: { state: TournamentState; update: Update }) {
  const tr = useT();
  const { rows, cols } = state.gym;
  const inGym = (c: Court) => c.row !== undefined && c.col !== undefined && c.row < rows && c.col < cols;
  const at = (r: number, c: number) => state.courts.find((x) => inGym(x) && x.row === r && x.col === c);
  const unplaced = state.courts.filter((c) => !inGym(c));
  const busy = (id: string) => state.matches.some((m) => m.status === 'playing' && m.courtId === id);

  const dropOn = (cell: { row: number; col: number } | null) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) update((s) => placeCourt(s, id, cell));
  };
  const allowDrop = (e: DragEvent) => e.preventDefault();

  const card = (c: Court) => (
    <div
      key={c.id}
      className={`gym-court ${!c.active ? 'off' : busy(c.id) ? 'busy' : 'free'}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
    >
      <CourtPlan />
      <div className="court-head">
        <span className="court-name">{c.name}</span>
        <span className={`tag ${!c.active ? '' : busy(c.id) ? 'live' : 'free'}`}>
          {!c.active ? tr('Inactif') : busy(c.id) ? tr('Occupé') : tr('Libre')}
        </span>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="row">
        <label>
          {tr("Lignes")}
          <input
            type="number"
            min={1}
            value={rows}
            onChange={(e) => update((s) => ({ ...s, gym: { ...s.gym, rows: Math.max(1, Number(e.target.value)) } }))}
          />
        </label>
        <label>
          {tr("Colonnes")}
          <input
            type="number"
            min={1}
            value={cols}
            onChange={(e) => update((s) => ({ ...s, gym: { ...s.gym, cols: Math.max(1, Number(e.target.value)) } }))}
          />
        </label>
        <span className="hint">{tr("Entrée du gymnase en bas")}</span>
      </div>
      <div className="gym" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const court = at(r, c);
            return (
              <div
                key={`${r}-${c}`}
                className={`gym-cell ${court ? 'filled' : ''}`}
                onDragOver={allowDrop}
                onDrop={dropOn({ row: r, col: c })}
              >
                {court ? card(court) : <span className="hint">{tr("Libre")}</span>}
              </div>
            );
          }),
        )}
      </div>
      <div className="gym-unplaced" onDragOver={allowDrop} onDrop={dropOn(null)}>
        <span className="hint">{tr('Non placés (glisser ici pour retirer du plan) :')}</span>
        <div className="row">{unplaced.map(card)}</div>
      </div>
    </div>
  );
}

function TeamsTab({ state, update }: { state: TournamentState; update: Update }) {
  const tr = useT();
  const { settings, players, teams } = state;
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [msg, setMsg] = useState('');
  const [withdrawId, setWithdrawId] = useState('');
  const pname = (id: string) => players.find((p) => p.id === id)?.name ?? '?';
  const inTeam = new Set(teams.flatMap((t) => t.playerIds));
  const free = players.filter((p) => !inTeam.has(p.id));

  const setSettings = (patch: Partial<typeof settings>) =>
    update((s) => resetTournament({ ...s, settings: { ...s.settings, ...patch } }));

  const generate = (balance: boolean) => {
    const forced = teams.filter((t) => t.forced).map((t) => t.playerIds);
    const { teams: built, leftover } = buildTeams(players, settings.teamType, settings.mixed, forced);
    setMsg(leftover.length ? tr(`${leftover.length} joueur(s) sans équipe (nombre impair)`) : '');
    update((s) => resetTournament({ ...s, teams: balance ? balanceTeams({ ...s, teams: built }) : built }));
  };

  const rebalance = () => update((s) => resetTournament({ ...s, teams: balanceTeams(s) }));

  const forceTeam = () => {
    const ids = settings.teamType === 'double' ? [p1, p2] : [p1];
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return;
    update((s) =>
      resetTournament({
        ...s,
        teams: [...s.teams.filter((t) => !ids.some((id) => t.playerIds.includes(id))), { id: uid(), playerIds: ids, forced: true }],
      }),
    );
    setP1('');
    setP2('');
  };

  const swap = () => {
    if (!s1 || !s2 || s1 === s2) return;
    update((s) => resetTournament({ ...s, teams: swapPlayers(s.teams, s1, s2) }));
  };

  const options = (list: Player[]) =>
    list.map((p) => (
      <option key={p.id} value={p.id}>
        {p.name} ({tr(LEVELS[p.level])})
      </option>
    ));

  return (
    <section>
      <h2>{tr("Équipes")}</h2>
      <div className="row">
        <label>
          {tr("Type")}
          <select value={settings.teamType} onChange={(e) => setSettings({ teamType: e.target.value as 'simple' | 'double' })}>
            <option value="simple">{tr("Simple")}</option>
            <option value="double">{tr("Double")}</option>
          </select>
        </label>
        {settings.teamType === 'double' && (
          <label className="check">
            <input type="checkbox" checked={settings.mixed} onChange={(e) => setSettings({ mixed: e.target.checked })} />
            {tr("Doubles mixtes en priorité")}
          </label>
        )}
        <button className="primary" onClick={()=> generate(false)} disabled={players.length < 2}>
          {tr("Tirage aléatoire")}
        </button>
        <button onClick={()=> generate(true)} disabled={players.length < 2 || settings.teamType === 'simple'}>
          {tr("Tirage équilibré par niveau")}
        </button>
        <button onClick={rebalance} disabled={teams.length < 2 || settings.teamType === 'simple'}>
          {tr("Rééquilibrer")}
        </button>
      </div>
      {msg && <p className="warn">{msg}</p>}

      <h3>{tr("Former une équipe imposée")}</h3>
      <div className="row">
        <select value={p1} onChange={(e) => setP1(e.target.value)}>
          <option value="">{tr("— joueur —")}</option>
          {options(free)}
        </select>
        {settings.teamType === 'double' && (
          <select value={p2} onChange={(e) => setP2(e.target.value)}>
            <option value="">{tr("— partenaire —")}</option>
            {options(free.filter((p) => p.id !== p1))}
          </select>
        )}
        <button onClick={forceTeam}>{tr("Former l’équipe")}</button>
      </div>

      <h3>{tr("Échanger deux joueurs")}</h3>
      <div className="row">
        <select value={s1} onChange={(e) => setS1(e.target.value)}>
          <option value="">{tr("— joueur —")}</option>
          {options(players.filter((p) => inTeam.has(p.id)))}
        </select>
        <select value={s2} onChange={(e) => setS2(e.target.value)}>
          <option value="">{tr("— joueur —")}</option>
          {options(players.filter((p) => inTeam.has(p.id)))}
        </select>
        <button onClick={swap}>{tr("Échanger")}</button>
      </div>

      <ul className="list">
        {teams.map((t) => (
          <li key={t.id}>
            <strong>{t.playerIds.map(pname).join(' / ')}</strong>
            <span className="tag">niveau {teamLevel(state, t)}</span>
            {t.forced && <span className="tag">{tr("imposée")}</span>}
            {t.withdrawn && <span className="tag live">{tr("forfait")}</span>}
            {!t.withdrawn &&
              state.matches.length > 0 &&
              (withdrawId === t.id ? (
                <button
                  className="danger"
                  onClick={()=> {
                    update((s) => withdrawTeam(s, t.id));
                    setWithdrawId('');
                  }}
                >
                  {tr("Confirmer le forfait")}
                </button>
              ) : (
                <button onClick={()=> setWithdrawId(t.id)}>{tr("Déclarer forfait")}</button>
              ))}
            <button
              className="danger"
              onClick={()=> update((s) => resetTournament({ ...s, teams: s.teams.filter((x) => x.id !== t.id) }))}
            >
              {tr("Supprimer")}
            </button>
          </li>
        ))}
      </ul>
      <p className="hint">{teams.length} {tr('équipe(s). Une modification des équipes remet les poules et tableaux à zéro.')}</p>
    </section>
  );
}

function TournamentTab({ state, update }: { state: TournamentState; update: Update }) {
  const tr = useT();
  const { settings } = state;
  const [askReset, setAskReset] = useState(false);
  const zones = settings.zones ?? 3;
  const zoneSizes = settings.zoneSizes ?? [4, 8, 4];
  const tier = tiers(state);
  const hasPools = state.pools.length > 0;
  // Système suisse : tours joués et tour en cours (sans poules)
  const swissMatches = state.matches.filter((m) => m.phase === 'poule' && !m.poolId);
  const swissDone = swissMatches.reduce((r, m) => Math.max(r, m.round), 0);
  const swissRunning = swissMatches.some((m) => m.status !== 'done');
  const pouleMatches = state.matches.filter((m) => m.phase === 'poule');
  const pouleDone = pouleMatches.length ? pouleMatches.filter((m) => m.status === 'done').length : 0;

  const setSettings = (patch: Partial<typeof settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const isOpen = (phase: BracketPhase) => state.matches.some((m) => m.phase === phase && m.status !== 'done');

  const phaseStatus = (phase: BracketPhase) => {
    const ms = state.matches.filter((m) => m.phase === phase);
    if (!ms.length) return 'Non générée';
    const round = Math.max(...ms.map((m) => m.round));
    const last = ms.filter((m) => m.round === round);
    if (isOpen(phase)) return `En cours (${last[0].label})`;
    return last.length === 1 ? 'Terminée' : 'Tour terminé';
  };

  // Confirmation intégrée : window.confirm est bloqué dans l'application desktop et renvoie faux sans rien afficher
  const reset = () => {
    update((s) => ({ ...s, pools: [], brackets: [], matches: [] }));
    setAskReset(false);
  };

  return (
    <section>
      <h2>{tr("Tournoi")}</h2>
      <div className="grid2">
        <div className="card">
          <h3>{tr("Réglages")}</h3>
          <label>
            {tr("Mode du tournoi")}
            <select
              value={formatOf(state)}
              disabled={state.matches.length > 0}
              onChange={(e) => setSettings({ format: e.target.value as Format })}
            >
              {(Object.keys(FORMATS) as Format[]).map((f) => (
                <option key={f} value={f}>
                  {tr(FORMATS[f])}
                </option>
              ))}
            </select>
          </label>
          <FormatDiagram format={formatOf(state)} settings={settings} teams={state.teams.length} />
          {state.teams.length >= 2 && <FormatTable format={formatOf(state)} settings={settings} teams={state.teams.length} />}
          <div className="format-hint">
            <Icon name={FORMAT_ICONS[formatOf(state)]} size={20} />
            <span>
              {tr(FORMAT_HINTS[formatOf(state)])}
              <strong className="format-stats">
                {(() => {
                  const ms = matchStats(state.settings, state.teams.length);
                  if (!ms) return tr('Ajoute des équipes pour voir le nombre de matchs.');
                  const par = ms.min === ms.max ? `${ms.min}` : `${ms.min} à ${ms.max}`;
                  return tr(`${ms.total} matchs au total · ${par} match(s) par équipe`);
                })()}
              </strong>
            </span>
          </div>
          {state.matches.length > 0 && <p className="hint">{tr("Le mode se change après une réinitialisation du tournoi.")}</p>}
          {formatOf(state) !== 'suisse' && (
            <label>
              {tr("Nombre de poules")}
              <input type="number" min={1} value={settings.pools} onChange={(e) => setSettings({ pools: Math.max(1, Number(e.target.value)) })} />
            </label>
          )}
          {['consolante', 'croisement', 'poules'].includes(formatOf(state)) && (
            <label>
              {tr("Qualifiés par poule")}
              <input
                type="number"
                min={1}
                value={settings.qualifiedPerPool}
                onChange={(e) => setSettings({ qualifiedPerPool: Math.max(1, Number(e.target.value)) })}
              />
            </label>
          )}
          {formatOf(state) === 'suisse' && (
            <label>
              {tr("Nombre de tours")}
              <input
                type="number"
                min={1}
                value={settings.swissRounds ?? 4}
                onChange={(e) => setSettings({ swissRounds: Math.max(1, Number(e.target.value)) })}
              />
            </label>
          )}
          {['classement', 'niveau'].includes(formatOf(state)) && (
            <>
          <label>
            {tr("Nombre de tableaux")}
            <select value={zones} onChange={(e) => setSettings({ zones: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n > 1 ? tr('tableaux') : tr('tableau')} {n}
                </option>
              ))}
            </select>
          </label>
          {Array.from({ length: zones }, (_, z) => (
            <label key={z}>
              {tr('Équipes dans le tableau')} {z + 1}
              <input
                type="number"
                min={2}
                value={zoneSizes[z] ?? 4}
                onChange={(e) => {
                  const next = Array.from({ length: zones }, (_, k) => zoneSizes[k] ?? 4);
                  next[z] = Math.max(2, Number(e.target.value));
                  setSettings({ zoneSizes: next });
                }}
              />
            </label>
          ))}
          <p className="hint">
            {(() => {
              const placed = zoneSizes.slice(0, zones).reduce((a, b) => a + b, 0);
              const diff = state.teams.length - placed;
              if (diff > 0) return tr(`${diff} équipe(s) ne joueront aucun tableau.`);
              if (diff < 0) return tr(`Les tableaux demandent ${-diff} équipe(s) de plus que d'équipes inscrites : le dernier sera réduit.`);
              return tr(`Toutes les équipes sont réparties (${placed}).`);
            })()}
          </p>
            </>
          )}
          <label>
            {tr("Sets gagnants")}
            <select value={settings.setsToWin} onChange={(e) => setSettings({ setsToWin: Number(e.target.value) as 1 | 2 })}>
              <option value={1}>{tr('1 set (21 pts)')}</option>
              <option value={2}>{tr('2 sets gagnants (en 3 sets)')}</option>
            </select>
          </label>
          <p className="hint">
            {tr('Équipes')} : {state.teams.length} · {tr('Poules')} :{' '}
            {hasPools
              ? tr(`${state.pools.length} (générées)`)
              : tr(`${settings.pools} (prévues, créées à l’étape 1)`)}
          </p>
          {!hasPools && state.teams.length > 0 && (
            <div className="row">
              {poolSizes(state.teams.length, settings.pools).map((n, i) => (
                <span key={i} className="tag">
                  {tr(`Poule ${String.fromCharCode(65 + i)} : ${n} équipe(s)`)}
                </span>
              ))}
              {settings.pools * 2 > state.teams.length && <span className="warn">{tr("Il faut au moins 2 équipes par poule.")}</span>}
            </div>
          )}
          {hasPools && state.pools.length !== settings.pools && (
            <p className="warn">{tr('Le nombre de poules a changé : réinitialise le tournoi puis régénère les poules pour l’appliquer.')}</p>
          )}
        </div>

        <div className="card">
          <h3>{tr("Étapes")}</h3>
          <ol className="steps">
            {formatOf(state) !== 'suisse' && (
              <li>
                <button
                  className="primary"
                  disabled={state.teams.length < settings.pools * 2 || hasPools}
                  onClick={()=> update((s) => generatePools(s))}
                >
                  {tr("1. Générer les poules")}
                </button>
                {hasPools && (
                  <span className="hint">
                    {pouleDone}/{pouleMatches.length} {tr('matchs de poule joués')}
                  </span>
                )}
              </li>
            )}
            {formatOf(state) === 'poules' && (
              <li>
                <button
                  disabled={!poolsDone(state) || state.matches.some((m) => m.phase === 'finale')}
                  onClick={()=> update((s) => startPoolFinal(s))}
                >
                  2. {tr('Poule finale')} ({qualifiedTeams(state).qualified.length} {tr('équipes')})
                </button>
              </li>
            )}
            {formatOf(state) === 'suisse' && (
              <li>
                <button
                  className="primary"
                  disabled={swissDone >= (settings.swissRounds ?? 4) || swissRunning || state.teams.length < 2}
                  onClick={()=> update((s) => swissNextRound(s))}
                >
                  {swissDone >= (settings.swissRounds ?? 4) ? tr('Tournoi terminé') : tr(`Tour ${swissDone + 1} / ${settings.swissRounds ?? 4}`)}
                </button>
                {swissRunning && <span className="hint">{tr("Tour en cours")}</span>}
              </li>
            )}
            {BRACKET_PHASES.slice(0, bracketCount(state)).map((phase, i) => (
              <li key={phase}>
                <button
                  disabled={!canStartBracket(state, phase) || state.brackets.some((b) => b.phase === phase)}
                  onClick={()=> update((s) => startBracket(s, phase, tiers(s)[phase]))}
                >
                  {i + 2}. {tr(PHASES[phase])} ({tier[phase].length} équipes)
                </button>
                <span className="hint">{tr(phaseStatus(phase))}</span>
                <button
                  disabled={!state.brackets.some((b) => b.phase === phase) || isOpen(phase) || phaseStatus(phase) === 'Terminée'}
                  onClick={()=> update((s) => bracketRound(s, phase))}
                >
                  {tr("Tour suivant")}
                </button>
              </li>
            ))}
          </ol>
          {askReset ? (
            <div className="row">
              <span className="warn">{tr('Effacer poules, tableaux et scores ? Joueurs et équipes sont conservés.')}</span>
              <button className="danger" onClick={reset}>
                {tr("Confirmer")}
              </button>
              <button onClick={()=> setAskReset(false)}>{tr("Annuler")}</button>
            </div>
          ) : (
            <button className="danger" onClick={()=> setAskReset(true)} disabled={!state.matches.length}>
              {tr("Réinitialiser le tournoi")}
            </button>
          )}
        </div>
      </div>

      {hasPools && (
        <>
          <h2>{tr("Répartition des poules")}</h2>
          {!poolsEditable(state) && (
            <p className="hint">{tr('Les équipes ne peuvent plus être échangées : un match de poule est déjà terminé.')}</p>
          )}
          <div className="grid3">
            {state.pools.map((p) => (
              <div className="card" key={p.id}>
                <h3>{tr(p.name)}</h3>
                <ul className="list">
                  {p.teamIds.map((id) => (
                    <li key={id}>
                      {teamLabel(state, id)}
                      <select
                        value=""
                        disabled={!poolsEditable(state)}
                        onChange={(e) => {
                          const [kind, target] = [e.target.value.slice(0, 4), e.target.value.slice(5)];
                          if (kind === 'team') update((s) => swapTeamsInPools(s, id, target));
                          if (kind === 'pool') update((s) => moveTeamToPool(s, id, target));
                        }}
                      >
                        <option value="">{tr("⇄ échanger / déplacer…")}</option>
                        <optgroup label={tr("Échanger avec")}>
                          {state.pools
                            .filter((q) => q.id !== p.id)
                            .flatMap((q) =>
                              q.teamIds.map((o) => (
                                <option key={o} value={`team:${o}`}>
                                  {q.name} : {teamLabel(state, o)}
                                </option>
                              )),
                            )}
                        </optgroup>
                        <optgroup label={tr("Déplacer vers")}>
                          {state.pools
                            .filter((q) => q.id !== p.id)
                            .map((q) => (
                              <option key={q.id} value={`pool:${q.id}`}>
                                {q.name}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function MatchesTab({ state, update }: { state: TournamentState; update: Update }) {
  const tr = useT();
  const playing = state.matches.filter((m) => m.status === 'playing').sort((a, b) => a.order - b.order);
  const pending = state.matches.filter((m) => m.status === 'pending').sort((a, b) => a.order - b.order);
  const done = state.matches.filter((m) => m.status === 'done').sort((a, b) => b.order - a.order);
  const courtName = (id: string | null) => state.courts.find((c) => c.id === id)?.name ?? '—';

  const row = (m: Match, extra?: string) => (
    <ScoreRow key={m.id} match={m} state={state} update={update} extra={extra ?? courtName(m.courtId)} />
  );

  return (
    <section>
      <button
        onClick={()=>
          update((s) => {
            // Score aléatoire pour chaque match en cours (outil de test)
            const ids = s.matches.filter((m) => m.status === 'playing').map((m) => m.id);
            return ids.reduce((st, id) => recordScore(st, id, randomSets(st.settings.setsToWin)).state, s);
          })
        }
      >
        {tr("Simuler les matchs en cours")}
      </button>
      {state.courts.length === 0 && <p className="warn">{tr("Ajoute des terrains pour lancer les matchs.")}</p>}
      <h2>{tr('En cours')} ({playing.length})</h2>
      {playing.length ? playing.map((m) => row(m)) : <p className="hint">{tr("Aucun match en cours.")}</p>}
      <h2>{tr('À venir')} ({pending.length})</h2>
      {pending.slice(0, 30).map((m, i) => row(m, `#${i + 1}`))}
      {pending.length > 30 && <p className="hint">… {pending.length - 30} autres</p>}
      <h2>{tr('Terminés')} ({done.length})</h2>
      {done.map((m) => row(m, courtName(m.courtId)))}
    </section>
  );
}

function ScoreRow({ match, state, update, extra }: { match: Match; state: TournamentState; update: Update; extra: string }) {
  const tr = useT();
  const max = 2 * state.settings.setsToWin - 1;
  const [sets, setSets] = useState<(SetScore | null)[]>(() =>
    Array.from({ length: max }, (_, i) => match.sets[i] ?? null),
  );
  const [error, setError] = useState('');

  // Les premiers sets sont toujours proposés ; un set supplémentaire n'apparaît que si les sets précédents sont à égalité
  // Il faut que les i premiers sets soient tous remplis et répartis (0-0 ne compte pas comme une égalité)
  const tiedBefore = (i: number) => {
    const done = sets.slice(0, i).filter((s): s is SetScore => !!s && !(s.a === 0 && s.b === 0));
    const wins = done.filter((s) => s.a > s.b).length;
    return done.length === i && wins * 2 === i;
  };
  const visible = sets.slice(0, sets.filter((_, i) => i < state.settings.setsToWin || tiedBefore(i)).length);

  const save = () => {
    // On s'arrête au premier set vide : seuls les sets saisis en début de liste sont enregistrés
    const empty = visible.findIndex((s) => !s || (s.a === 0 && s.b === 0));
    const res = recordScore(state, match.id, (empty < 0 ? visible : visible.slice(0, empty)) as SetScore[]);
    if (res.error) return setError(res.error);
    setError('');
    update(() => res.state);
  };

  const setVal = (i: number, side: 'a' | 'b', v: string) =>
    setSets((prev) => prev.map((s, j) => (j === i ? { ...(s ?? { a: 0, b: 0 }), [side]: v === '' ? 0 : Number(v) } : s)));

  // Retrait d'un match en cours : réaffectation automatique, ou choix du prochain match pour ce terrain
  const [asking, setAsking] = useState(false);
  const busyTeams = new Set(
    state.matches.filter((x) => x.status === 'playing' && x.id !== match.id).flatMap((x) => [x.teamA, x.teamB]),
  );
  const candidates = state.matches
    .filter((x) => x.status === 'pending' && !busyTeams.has(x.teamA) && !busyTeams.has(x.teamB))
    .sort((x, y) => x.order - y.order);
  // Équipes de ce match déjà en jeu sur un autre terrain
  const teamsBusy = state.matches.some(
    (x) => x.status === 'playing' && [x.teamA, x.teamB].some((t) => t === match.teamA || t === match.teamB),
  );
  const controls =
    match.status === 'playing' ? (
      asking ? (
        <>
          <button
            className="primary"
            onClick={()=> {
              update((s) => removeFromCourt(s, match.id));
              setAsking(false);
            }}
          >
            {tr("Réaffecter automatiquement")}
          </button>
          <select
            value=""
            disabled={candidates.length === 0}
            onChange={(e) => {
              if (!e.target.value) return;
              update((s) => removeFromCourt(s, match.id, e.target.value));
              setAsking(false);
            }}
          >
            <option value="">
              {candidates.length ? tr('Choisir le prochain match…') : tr('Aucun match jouable (équipes occupées)')}
            </option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {tr(c.label)}: {teamLabel(state, c.teamA)} – {teamLabel(state, c.teamB)}
              </option>
            ))}
          </select>
          <button onClick={()=> setAsking(false)}>{tr("Annuler")}</button>
        </>
      ) : (
        <button onClick={()=> setAsking(true)}>
          <Icon name="exit" size={16} /> {tr("Retirer du terrain")}
        </button>
      )
    ) : match.status === 'pending' ? (
      <select
        value=""
        disabled={teamsBusy}
        onChange={(e) => e.target.value && update((s) => assignTo(s, match.id, e.target.value))}
      >
        <option value="">{teamsBusy ? tr('Équipes encore en jeu') : tr('Affecter à un terrain…')}</option>
        {state.courts
          .filter((c) => c.active)
          .map((c) => {
            const cur = state.matches.find((x) => x.status === 'playing' && x.courtId === c.id);
            return (
              <option key={c.id} value={c.id}>
                {c.name}
                {cur ? ` (${tr('remplace')} ${teamLabel(state, cur.teamA)} – ${teamLabel(state, cur.teamB)})` : ` (${tr('libre')})`}
              </option>
            );
          })}
      </select>
    ) : null;

  return (
    <div className={`match ${match.status}`}>
      <div className="match-head">
        <span className="tag">{tr(match.label || PHASES[match.phase])}</span>
        <span className="tag">{extra}</span>
        {match.status === 'done' && <span className="tag done">{tr("Terminé")}</span>}
      </div>
      <div className="match-teams">
        <MatchVersus state={state} match={match} />
      </div>
      <div className="row">
        {visible.map((s, i) => (
          <span key={i} className="set set-box">
            <span className="badge-set">Set {i + 1}</span>
            <input type="number" min={0} max={30} value={s?.a ?? ''} onChange={(e) => setVal(i, 'a', e.target.value)} />
            –
            <input type="number" min={0} max={30} value={s?.b ?? ''} onChange={(e) => setVal(i, 'b', e.target.value)} />
          </span>
        ))}
        <button className="primary" onClick={save}>
          {tr("Enregistrer")}
        </button>
        {error && <span className="error">{tr(error)}</span>}
      </div>
      {controls && <div className="row">{controls}</div>}
    </div>
  );
}
