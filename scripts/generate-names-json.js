const fs = require('fs');
const path = require('path');
const parseSync = require('csv-parse/lib/sync');

const data = {};
const dataFiles = fs.readdirSync(`${process.cwd()}/data`);

for (const dataFileName of dataFiles) {
  const dataFileContents = fs.readFileSync(`${process.cwd()}/data/${dataFileName}`);
  const namesToAdd = parseSync(dataFileContents);
  const sourceName = path.parse(dataFileName).name;
  data[sourceName] = namesToAdd;
}

const dataJson = JSON.stringify(data, null, 2);

fs.writeFileSync(`${process.cwd()}/src/data.json`, dataJson);

console.log('src/data.json generated successfully');