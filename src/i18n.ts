import { createContext, useContext } from 'react';

export type Lang = 'fr' | 'en';

const KEY = 'badminton-lang';

/** Langue choisie par l'utilisateur, mémorisée dans son navigateur. */
export function loadLang(): Lang {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // stockage indisponible : la langue reste active pour la session
  }
}

/** Les textes sources sont en français ; chaque clé est le texte français. */
const EN: Record<string, string> = {
  '% victoires': '% wins',
  '- Match en cours': '- Match in progress',
  '1. Générer les poules': '1. Generate pools',
  '16 joueurs fictifs': '16 fake players',
  'Ajoute des terrains pour lancer les matchs.': 'Add courts to start matches.',
  'Ajouter le club': 'Add club',
  'Ajouter le terrain': 'Add court',
  Ajouter: 'Add',
  Annuler: 'Cancel',
  'Aucun match en cours.': 'No match in progress.',
  'Aucun match terminé.': 'No finished match.',
  'Aucun terrain configuré.': 'No court configured.',
  'Classement général': 'Overall ranking',
  'Classement par club': 'Club ranking',
  'Classements des poules': 'Pool rankings',
  Club: 'Club',
  Colonnes: 'Columns',
  'Confirmer le forfait': 'Confirm withdrawal',
  Confirmer: 'Confirm',
  Diff: 'Diff',
  Double: 'Doubles',
  'Doubles mixtes en priorité': 'Mixed doubles first',
  'Déclarer forfait': 'Declare withdrawal',
  'Déplacer vers': 'Move to',
  'En cours': 'In progress',
  Enregistrer: 'Save',
  'Entrée du gymnase en bas': 'Gym entrance at the bottom',
  Femme: 'Woman',
  'Former l’équipe': 'Form team',
  'Former une équipe imposée': 'Form a set team',
  Genre: 'Gender',
  Homme: 'Man',
  'Il faut au moins 2 équipes par poule.': 'Each pool needs at least 2 teams.',
  'Import en masse': 'Bulk import',
  Importer: 'Import',
  J: 'P',
  Joueurs: 'Players',
  'Le classement apparaîtra après les premiers scores.': 'The ranking will appear after the first scores.',
  'Le mode se change après une réinitialisation du tournoi.': 'The mode can only be changed after resetting the tournament.',
  'Les statistiques apparaîtront après les premiers scores.': 'Statistics will appear after the first scores.',
  'Les terrains libres reçoivent automatiquement le prochain match jouable.': 'Free courts automatically get the next playable match.',
  Libre: 'Free',
  Lignes: 'Rows',
  Matchs: 'Matches',
  'Mode du tournoi': 'Tournament mode',
  Niveau: 'Level',
  'Nom du club': 'Club name',
  'Nom du terrain (ex. T1)': 'Court name (e.g. C1)',
  Nom: 'Name',
  'Nombre de poules': 'Number of pools',
  'Nombre de tableaux': 'Number of brackets',
  'Nombre de tours': 'Number of rounds',
  'Ouvrir l’affichage ↗': 'Open the display ↗',
  Podium: 'Podium',
  'Points pour / contre': 'Points for / against',
  Prochain: 'Next',
  'Qualifiés par poule': 'Qualified per pool',
  'Retirer du terrain': 'Remove from court',
  'Réaffecter automatiquement': 'Reassign automatically',
  Réglages: 'Settings',
  'Réinitialiser le tournoi': 'Reset tournament',
  'Répartition des poules': 'Pool split',
  Rééquilibrer: 'Rebalance',
  'Sans club': 'No club',
  'Sets gagnants': 'Sets to win',
  Simple: 'Singles',
  'Simuler les matchs en cours': 'Simulate matches in progress',
  'Statistiques des équipes': 'Team statistics',
  Statistiques: 'Statistics',
  Supprimer: 'Delete',
  'Tableau de bord': 'Dashboard',
  Terminé: 'Finished',
  'Terrains non placés sur le plan': 'Courts not placed on the plan',
  Terrains: 'Courts',
  'Tirage aléatoire': 'Random draw',
  'Tirage équilibré par niveau': 'Level-balanced draw',
  'Tour en cours': 'Round in progress',
  'Tour suivant': 'Next round',
  'Tournoi de badminton': 'Badminton tournament',
  Tournoi: 'Tournament',
  Type: 'Type',
  V: 'W',
  Victoires: 'Wins',
  forfait: 'withdrawn',
  imposée: 'forced',
  'matchs terminés': 'matches finished',
  pts: 'pts',
  'terrain(s) libre(s)': 'court(s) free',
  'À venir': 'Upcoming',
  'Échanger avec': 'Swap with',
  'Échanger deux joueurs': 'Swap two players',
  Échanger: 'Swap',
  Équipe: 'Team',
  Équipes: 'Teams',
  Étapes: 'Steps',
  '— joueur —': '— player —',
  '— partenaire —': '— partner —',
  '⇄ échanger / déplacer…': '⇄ swap / move…',
  Activer: 'Enable',
  'Affecter à un terrain…': 'Assign to a court…',
  'Ajoute des équipes pour voir le nombre de matchs.': 'Add teams to see the number of matches.',
  'Aucun match jouable (équipes occupées)': 'No playable match (teams busy)',
  'Choisir le prochain match…': 'Choose the next match…',
  Désactiver: 'Disable',
  Détail: 'Detail',
  'En attente : les équipes suivantes jouent encore': 'Waiting: the next teams are still playing',
  'En attente': 'Waiting',
  'Exempt du 1er tour': 'Bye in round 1',
  Fermé: 'Closed',
  Inactif: 'Inactive',
  Nombre: 'Count',
  Occupé: 'Busy',
  'Plus de match à venir': 'No more upcoming match',
  'Poule finale': 'Final pool',
  Poules: 'Pools',
  'Tournoi terminé': 'Tournament finished',
  Tours: 'Rounds',
  'en cours': 'in progress',
  libre: 'free',
  remplace: 'replaces',
  tableau: 'bracket',
  tableaux: 'brackets',
  'Équipes encore en jeu': 'Teams still playing',
  Étape: 'Step',
  Terminée: 'Finished',
  'Tour terminé': 'Round finished',
  'Non générée': 'Not generated',
  Débutant: 'Beginner',
  Intermédiaire: 'Intermediate',
  Avancé: 'Advanced',
  Fort: 'Strong',
  H: 'M',
  F: 'W',
  'Matchs & scores': 'Matches & scores',
  Finale: 'Final',
  'Demi-finales': 'Semi-finals',
  'Quarts de finale': 'Quarter-finals',
  'Match introuvable': 'Match not found',
  'Le match est déjà gagné avant ce set': 'The match is already won before this set',
  'Tableau 1': 'Bracket 1',
  'Tableau 2': 'Bracket 2',
  'Tableau 3': 'Bracket 3',
  'Tableau 4': 'Bracket 4',
  'Poules puis tableaux par classement': 'Pools then brackets by ranking',
  'Poules puis tableau principal + consolante': 'Pools then main bracket + consolation',
  'Poules puis tableau unique (croisement)': 'Pools then single bracket (crossover)',
  'Poules de niveau puis tableaux par classement': 'Level pools then brackets by ranking',
  'Poules puis poule finale (sans tableau)': 'Pools then final pool (no bracket)',
  'Système suisse (sans poules)': 'Swiss system (no pools)',
  'Tournoi de club avec beaucoup d’équipes : après les poules, les meilleures jouent le tableau 1, les suivantes le tableau 2, etc.':
    'Club tournament with many teams: after the pools, the best teams play bracket 1, the next ones bracket 2, etc.',
  'Pour les joueurs qui veulent jouer plusieurs matchs : les qualifiés jouent le tableau principal, les autres une consolante.':
    'For players who want to play several matches: qualified teams play the main bracket, the others a consolation bracket.',
  'Tournoi court et compétitif : seuls les qualifiés jouent, en croisant les poules pour éviter les revanches précoces. Pas de consolante.':
    'Short and competitive tournament: only qualified teams play, crossing the pools to avoid early rematches. No consolation.',
  'Tournoi mélangé avec de grands écarts de niveau : les poules sont équilibrées par niveau, puis les tableaux suivent le classement.':
    'Mixed tournament with large level gaps: pools are balanced by level, then the brackets follow the ranking.',
  'Format convivial sans élimination : les poules donnent le classement, et les qualifiés se retrouvent en poule finale.':
    'Friendly format without elimination: the pools give the ranking, and qualified teams meet in a final pool.',
  'Grand nombre d’équipes où tout le monde joue le même nombre de matchs : les équipes à égalité de victoires s’affrontent, sans poules.':
    'Many teams where everyone plays the same number of matches: teams with the same number of wins play each other, no pools.',
  'Podium – ': 'Podium – ',
  '1 set (21 pts)': '1 set (21 pts)',
  '2 sets gagnants (en 3 sets)': '2 sets to win (best of 3)',
  'Match le plus long': 'Longest match',
  'Match le plus court': 'Shortest match',
  'Non placés (glisser ici pour retirer du plan) :': 'Not placed (drag here to remove from the plan):',
  'équipe(s). Une modification des équipes remet les poules et tableaux à zéro.': 'team(s). Changing teams resets pools and brackets.',
  'Équipes dans le tableau': 'Teams in bracket',
  'Le nombre de poules a changé : réinitialise le tournoi puis régénère les poules pour l’appliquer.': 'The number of pools changed: reset the tournament, then regenerate the pools to apply it.',
  'matchs de poule joués': 'pool matches played',
  'équipes': 'teams',
  'Effacer poules, tableaux et scores ? Joueurs et équipes sont conservés.': 'Clear pools, brackets and scores? Players and teams are kept.',
  'Les équipes ne peuvent plus être échangées : un match de poule est déjà terminé.': 'Teams can no longer be swapped: a pool match is already finished.',
  'Terminés': 'Finished',
  'Clubs': 'Clubs',
  'joueur(s)': 'player(s)',
};

/** Libellés générés avec des valeurs : chaque motif produit sa traduction, en traduisant aussi les parties variables. */
const PATTERNS: [RegExp, (m: RegExpMatchArray, lang: Lang) => string][] = [
  [/^Poule ([A-Z])$/, (m) => `Pool ${m[1]}`],
  [/^Poule ([A-Z]) : (\d+) équipe\(s\)$/, (m) => `Pool ${m[1]}: ${m[2]} team(s)`],
  [/^Tableau (\d)$/, (m) => `Bracket ${m[1]}`],
  [/^Tour (\d+)$/, (m) => `Round ${m[1]}`],
  [/^Tour (\d+) \/ (\d+)$/, (m) => `Round ${m[1]} / ${m[2]}`],
  [/^En cours \((.+)\)$/, (m, lang) => `${translate(lang, 'En cours')} (${translate(lang, m[1])})`],
  [/^(\d+) équipe\(s\) ne joueront aucun tableau\.$/, (m) => `${m[1]} team(s) will play in no bracket.`],
  [
    /^Les tableaux demandent (\d+) équipe\(s\) de plus que d'équipes inscrites : le dernier sera réduit\.$/,
    (m) => `Brackets need ${m[1]} more team(s) than registered: the last one will be reduced.`,
  ],
  [/^Toutes les équipes sont réparties \((\d+)\)\.$/, (m) => `All teams are spread across brackets (${m[1]}).`],
  [/^(\d+) joueur\(s\) sans équipe \(nombre impair\)$/, (m) => `${m[1]} player(s) without team (odd number)`],
  [/^(\d+) matchs au total · (.+) match\(s\) par équipe$/, (m) => `${m[1]} matches in total · ${m[2]} match(es) per team`],
  [/^(\d+) équipes$/, (m) => `${m[1]} teams`],
  [/^(\d+) tour\(s\)$/, (m) => `${m[1]} round(s)`],
  [/^(\d+) \(prévues, créées à l’étape 1\)$/, (m) => `${m[1]} (planned, created in step 1)`],
  [/^(\d+) \(générées\)$/, (m) => `${m[1]} (generated)`],
  [/^Au maximum (\d+) set\(s\)$/, (m) => `Maximum ${m[1]} set(s)`],
  [
    /^Set (\d+) \((\d+)-(\d+)\) invalide : le set se termine à 21 avec 2 pts d’écart, plafond 30$/,
    (m) => `Set ${m[1]} (${m[2]}-${m[3]}) invalid: a set ends at 21 with a 2-point lead, capped at 30`,
  ],
];

export function translate(lang: Lang, text: string): string {
  if (lang === 'fr') return text;
  if (EN[text] !== undefined) return EN[text];
  for (const [re, rep] of PATTERNS) {
    const m = text.match(re);
    if (m) return rep(m, lang);
  }
  return text;
}

export interface Translator {
  lang: Lang;
  t: (text: string) => string;
  setLang: (lang: Lang) => void;
}

export const LangContext = createContext<Translator>({ lang: 'fr', t: (s) => s, setLang: () => {} });

/** Fonction de traduction du langage courant. */
export function useT() {
  return useContext(LangContext).t;
}
