import { useEffect, useMemo, useState } from 'react';
import Admin from './Admin';
import Display from './Display';
import { type Lang, LangContext, loadLang, saveLang, translate } from './i18n';
import { useTournament } from './store';

/** Mode admin (#/admin, par défaut) ou affichage public (#/display). */
export default function App() {
  const [hash, setHash] = useState(location.hash);
  const [state, update] = useTournament();
  const [lang, setLangState] = useState<Lang>(loadLang);

  useEffect(() => {
    const onHash = () => setHash(location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const translator = useMemo(
    () => ({
      lang,
      t: (text: string) => translate(lang, text),
      setLang: (l: Lang) => {
        saveLang(l);
        setLangState(l);
      },
    }),
    [lang],
  );

  let page;
  if (hash.startsWith('#/display')) {
    const view = hash.startsWith('#/display/terrains')
      ? 'terrains'
      : hash.startsWith('#/display/matchs')
        ? 'matchs'
        : hash.startsWith('#/display/stats')
          ? 'stats'
          : 'general';
    page = <Display state={state} view={view} />;
  } else {
    page = <Admin state={state} update={update} />;
  }

  return (
    <LangContext.Provider value={translator}>
      {page}
      <div className="lang-switch" role="group" aria-label="Language">
        {(['fr', 'en'] as Lang[]).map((l) => (
          <button key={l} className={lang === l ? 'active' : ''} onClick={() => translator.setLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </LangContext.Provider>
  );
}
