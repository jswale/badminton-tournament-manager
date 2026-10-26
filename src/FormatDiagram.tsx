import { useT } from './i18n';
import { poolSizes, tableauxOf } from './logic';
import type { Format, TournamentState } from './types';

type Settings = TournamentState['settings'];
interface Props {
  format: Format;
  settings: Settings;
  teams: number;
}

/** Nombre de matchs par tour d'un tableau de n équipes, du 1er tour à la finale. */
export function roundCounts(n: number): number[] {
  const out: number[] = [];
  for (let c = n; c > 1; c = Math.ceil(c / 2)) out.push(Math.ceil(c / 2));
  return out.length ? out : [1];
}

/** Une poule : un rectangle avec une équipe par point (8 au plus). */
function pool(x: number, y: number, w: number, h: number, count: number, levels = false) {
  const n = Math.min(Math.max(count, 1), 8);
  const rows = Math.ceil(n / 2);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} className="fd-box" />
      {Array.from({ length: n }, (_, k) => (
        <circle
          key={k}
          cx={x + (k % 2 === 0 ? 0.3 : 0.7) * w}
          cy={y + ((Math.floor(k / 2) + 0.5) * h) / rows}
          r={3}
          className={levels ? `fd-dot fd-l${(k % 4) + 1}` : 'fd-dot'}
        />
      ))}
    </g>
  );
}

/** Un tableau à élimination, une colonne par tour, chaque match relié au tour suivant. */
function bracket(x0: number, y0: number, W: number, H: number, counts: number[], soft = false) {
  const w = 18;
  const h = Math.min(12, H / counts[0] - 2);
  const colW = counts.length > 1 ? (W - w) / (counts.length - 1) : 0;
  const at = (k: number, j: number) => ({ x: x0 + k * colW, y: y0 + (H / counts[k]) * (j + 0.5) });
  return (
    <g>
      {counts.map((c, k) =>
        Array.from({ length: c }, (_, j) => (
          <rect key={`b${k}-${j}`} x={at(k, j).x} y={at(k, j).y - h / 2} width={w} height={h} rx={3} className={soft ? 'fd-box fd-soft' : 'fd-box'} />
        )),
      )}
      {counts.slice(0, -1).map((c, k) =>
        Array.from({ length: c }, (_, j) => {
          const a = at(k, j);
          const b = at(k + 1, Math.floor(j / 2));
          const mid = a.x + w + (colW - w) / 2;
          return <path key={`l${k}-${j}`} d={`M${a.x + w} ${a.y} H${mid} V${b.y} H${b.x}`} className="fd-line" />;
        }),
      )}
    </g>
  );
}

/** Système suisse : une colonne par tour, les paires changent à chaque tour. */
function swiss(rounds: number, n: number) {
  const cols = Math.min(rounds, 6);
  const count = Math.min(Math.max(n, 2), 8);
  const ys = Array.from({ length: count }, (_, i) => 12 + (i * 96) / Math.max(count - 1, 1));
  return Array.from({ length: cols }, (_, r) => {
    const x = 12 + (r * 216) / Math.max(cols - 1, 1);
    const order = Array.from({ length: count }, (_, i) => (i + r) % count);
    return (
      <g key={r}>
        {order.filter((_, i) => i % 2 === 0).map((a, k) => {
          const b = order[k * 2 + 1];
          if (b === undefined) return null;
          return <path key={k} d={`M${x} ${ys[a]} H${x + 10} V${ys[b]} H${x}`} className="fd-line" />;
        })}
        {ys.map((y, i) => (
          <circle key={i} cx={x} cy={y} r={3} className="fd-dot" />
        ))}
      </g>
    );
  });
}

/** Schéma d'un mode, dessiné avec le nombre réel de poules, de tableaux et d'équipes. */
export function FormatDiagram({ format, settings, teams }: Props) {
  let body;
  if (format === 'suisse') {
    body = swiss(settings.swissRounds ?? 4, teams);
  } else {
    const sizes = poolSizes(teams, Math.max(1, settings.pools));
    const pools = sizes.length;
    const slot = 120 / pools;
    const left = sizes.map((n, i) => pool(4, i * slot + 3, 92, slot - 6, n, format === 'niveau'));
    const tabs = tableauxOf(settings, teams);
    let right;
    if (format === 'poules') {
      const q = Math.min(settings.qualifiedPerPool * pools, teams);
      right = pool(150, 20, 86, 80, q);
    } else {
      const s = 120 / Math.max(tabs.length, 1);
      right = tabs.map((n, i) => bracket(104, i * s + 3, 128, s - 6, roundCounts(n), format === 'consolante' && i > 0));
    }
    body = (
      <>
        {left}
        {right}
      </>
    );
  }
  return (
    <svg className="format-svg" viewBox="0 0 240 120" role="img" aria-hidden="true">
      {body}
    </svg>
  );
}

/** Tableau réel de la structure : poules, tableaux ou tours, avec le nombre d'équipes. */
export function FormatTable({ format, settings, teams }: Props) {
  const tr = useT();
  const rows: [string, string, string][] = [];
  if (format === 'suisse') {
    rows.push([tr('Tours'), `${settings.swissRounds ?? 4}`, tr(`${teams} équipes`)]);
  } else {
    const sizes = poolSizes(teams, Math.max(1, settings.pools));
    rows.push([tr('Poules'), `${sizes.length}`, sizes.join(' · ')]);
    if (format === 'poules') {
      const q = Math.min(settings.qualifiedPerPool * sizes.length, teams);
      rows.push([tr('Poule finale'), `${q}`, tr(`${q} équipes`)]);
    } else {
      tableauxOf(settings, teams).forEach((n, i) =>
        rows.push([tr(`Tableau ${i + 1}`), `${n}`, tr(`${roundCounts(n).length} tour(s)`)]),
      );
    }
  }
  return (
    <table className="format-table">
      <thead>
        <tr>
          <th>{tr('Étape')}</th>
          <th>{tr('Nombre')}</th>
          <th>{tr('Détail')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b, c]) => (
          <tr key={a}>
            <td>{a}</td>
            <td>{b}</td>
            <td>{c}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
