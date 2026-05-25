import { SPANISH_WORDS } from '../data/spanishWords';

type DictionaryPayload = {
  source: string;
  count: number;
  words: string[];
};

const DICTIONARY_URL = '/dictionaries/es-words.json';

let dictionaryPromise: Promise<string[]> | null = null;

export function getFallbackLetterDictionary() {
  return [...SPANISH_WORDS];
}

export async function loadLetterDictionary() {
  if (!dictionaryPromise) {
    dictionaryPromise = fetch(DICTIONARY_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Dictionary request failed: ${response.status}`);
        const payload = (await response.json()) as DictionaryPayload;
        if (!Array.isArray(payload.words) || payload.words.length === 0) {
          throw new Error('Dictionary payload is empty.');
        }
        return payload.words;
      })
      .catch(() => getFallbackLetterDictionary());
  }

  return dictionaryPromise;
}
