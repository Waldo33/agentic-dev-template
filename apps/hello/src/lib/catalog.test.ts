import { describe, expect, it } from 'vitest';
import { events } from './events';
import { flagDefs } from './flags';

describe('каталоги', () => {
  it('базовые события на месте', () => {
    for (const e of ['page_view', 'signup', 'activation']) expect(events.has(e)).toBe(true);
  });

  it('у каждого флага есть описание', () => {
    for (const [key, def] of Object.entries(flagDefs)) expect(def.description, key).not.toBe('');
  });
});
