import { DAILY_LETTER_WORDS, SPANISH_WORDS } from '../data/spanishWords';
import { createRng, pick, shuffle } from './random';

export type LettersChallenge = {
  dateKey: string;
  letters: string[];
  bestWords: string[];
  dictionarySize: number;
  wordSet: Set<string>;
};

export type LettersAttemptResult = {
  valid: boolean;
  normalizedWord: string;
  score: number;
  message: string;
};

const VOWELS = 'AAEEEIIOOU';
const CONSONANTS = 'BBCDDFGGHJKLMNNPQRSTTVVZ';
const FALLBACK_WORDS = buildDictionaryWords(SPANISH_WORDS);

export function generateLettersChallenge(dateKey: string, dictionaryWords: readonly string[] = FALLBACK_WORDS): LettersChallenge {
  const rng = createRng(`letters:${dateKey}`);
  const words = buildDictionaryWords(dictionaryWords);
  const wordSet = new Set(words);
  const baseCandidates = words.filter((word) => word.length >= 5 && word.length <= 9);
  const baseWord = normalizeWord(pick(baseCandidates.length > 0 ? baseCandidates : DAILY_LETTER_WORDS, rng));
  const letters = baseWord.split('');

  while (letters.length < 9) {
    const pool = letters.length % 3 === 0 ? VOWELS : CONSONANTS;
    letters.push(pool[Math.floor(rng() * pool.length)]);
  }

  const shuffledLetters = shuffle(letters.slice(0, 9), rng);
  const bestWords = words
    .filter((word) => canBuildWord(word, shuffledLetters))
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, 5);

  return {
    dateKey,
    letters: shuffledLetters,
    bestWords,
    dictionarySize: words.length,
    wordSet,
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

  if (!challenge.wordSet.has(normalizedWord)) {
    return { valid: false, normalizedWord, score: 0, message: 'No está en el diccionario español.' };
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

function buildDictionaryWords(words: readonly string[]) {
  return [...new Set(words.map(normalizeWord).filter((word) => word.length >= 2 && word.length <= 9))];
}
