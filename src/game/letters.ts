import { DAILY_LETTER_WORDS, SPANISH_WORDS } from '../data/spanishWords';
import { createRng, pick, shuffle } from './random';

export type LettersChallenge = {
  dateKey: string;
  letters: string[];
  bestWords: string[];
};

export type LettersAttemptResult = {
  valid: boolean;
  normalizedWord: string;
  score: number;
  message: string;
};

const VOWELS = 'AAEEEIIOOU';
const CONSONANTS = 'BBCDDFGGHJKLMNNPQRSTTVVZ';
const WORD_SET = new Set(SPANISH_WORDS.map(normalizeWord));

export function generateLettersChallenge(dateKey: string): LettersChallenge {
  const rng = createRng(`letters:${dateKey}`);
  const baseWord = normalizeWord(pick(DAILY_LETTER_WORDS, rng));
  const letters = baseWord.split('');

  while (letters.length < 9) {
    const pool = letters.length % 3 === 0 ? VOWELS : CONSONANTS;
    letters.push(pool[Math.floor(rng() * pool.length)]);
  }

  const shuffledLetters = shuffle(letters.slice(0, 9), rng);
  const bestWords = SPANISH_WORDS.map(normalizeWord)
    .filter((word) => canBuildWord(word, shuffledLetters))
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, 5);

  return {
    dateKey,
    letters: shuffledLetters,
    bestWords,
  };
}

export function evaluateLettersAttempt(word: string, challenge: LettersChallenge): LettersAttemptResult {
  const normalizedWord = normalizeWord(word);

  if (normalizedWord.length < 2) {
    return { valid: false, normalizedWord, score: 0, message: 'Escribe una palabra de al menos 2 letras.' };
  }

  if (!canBuildWord(normalizedWord, challenge.letters)) {
    return { valid: false, normalizedWord, score: 0, message: 'La palabra usa letras que no están disponibles.' };
  }

  if (!WORD_SET.has(normalizedWord)) {
    return { valid: false, normalizedWord, score: 0, message: 'No está en el diccionario local.' };
  }

  const score = normalizedWord.length === 9 ? 18 : normalizedWord.length;
  return {
    valid: true,
    normalizedWord,
    score,
    message: normalizedWord.length === 9 ? 'Palabra de 9 letras.' : `${normalizedWord.length} letras.`,
  };
}

export function canBuildWord(word: string, letters: string[]) {
  const counts = new Map<string, number>();
  for (const letter of letters) {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }

  for (const letter of normalizeWord(word)) {
    const available = counts.get(letter) ?? 0;
    if (available <= 0) return false;
    counts.set(letter, available - 1);
  }

  return true;
}

export function normalizeWord(word: string) {
  return word
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/Ñ/g, 'N')
    .replace(/ñ/g, 'n')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
}
