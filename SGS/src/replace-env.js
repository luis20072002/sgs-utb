require('dotenv').config();

const fs = require('fs');

const filePath = './src/environments/environment.prod.ts';

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '__API_URL__',
  process.env.API_URL
);

fs.writeFileSync(filePath, content);

console.log('Variables reemplazadas');