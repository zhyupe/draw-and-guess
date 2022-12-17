import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

let store: Record<string, string[]> | null = null;
export function getWordList() {
  if (store) {
    return store;
  }

  const list = readdirSync(join(__dirname, '../words')).filter(
    (item) => !item.startsWith('.'),
  );

  store = {};
  for (const item of list) {
    const content = readFileSync(join(__dirname, '../words', item), 'utf-8');

    store[item.replace('.txt', '')] = content
      .split('\n')
      .filter((item) => !item.startsWith('#'))
      .map((item) => item.trim());
  }

  return store;
}
