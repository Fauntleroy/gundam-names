import data from './data.json';

function sample(array) {
  const length = array == null ? 0 : array.length
  return length ? array[Math.floor(Math.random() * length)] : undefined
}

export function generateName (options) {
  options = { middleNameRarity: 0.01, ...options };
  let collection;
  if (options.collection) {
    collection = data[options.collection];
  }
  else {
    collection = [];
    for (const collectionName in data) {
      collection = collection.concat(data[collectionName]);
    }
  }

  const firstNames = [];
  const middleNames = [];
  const lastNames = [];

  for (const nameGroup of collection) {
    if (nameGroup[0]) firstNames.push(nameGroup[0]);
    if (nameGroup[1]) middleNames.push(nameGroup[1]);
    if (nameGroup[2]) lastNames.push(nameGroup[2]);
  }

  const firstName = sample(firstNames);
  const middleName = Math.random() > (1 - options.middleNameRarity) ? sample(middleNames) : null;
  const lastName = sample(lastNames);

  return [firstName, middleName, lastName].join(' ');
}