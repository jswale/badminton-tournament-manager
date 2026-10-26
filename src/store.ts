import { useCallback, useEffect, useState } from 'react';
import { emptyState } from './logic';
import type { TournamentState } from './types';

const KEY = 'badminton-tournoi-v1';

export function loadState(): TournamentState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
}

function saveState(state: TournamentState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // stockage indisponible (mode privé, quota) : l'état reste en mémoire
  }
}

/** État du tournoi persisté dans le localStorage, synchronisé entre onglets (admin / affichage). */
export function useTournament() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setState(loadState());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((fn: (s: TournamentState) => TournamentState) => {
    setState((prev) => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  return [state, update] as const;
}
