import { readFileSync } from 'fs';
import { join } from 'path';

export function getConfig() {
  try {
    return JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf-8'));
  } catch (e) {
    return {};
  }
}
