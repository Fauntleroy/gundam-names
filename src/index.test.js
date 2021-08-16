import { generateName } from './index.js';

test('generates a random name', () => {
  expect(generateName()).toBe(3);
});