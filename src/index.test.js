import { generateRandomName } from './index.js';

test('generates a random name', () => {
  expect(generateRandomName()).toBe(3);
});