import Fastify from 'fastify';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const fastify = Fastify({ logger: false });
const __dirname = dirname(fileURLToPath(import.meta.url));

const CSV_URL = 'https://docs.google.com/spreadsheets/d/1ljCjgfixPIROtZHAuu831AsEcKxOIa4d4HpmQNq4TDE/export?format=csv&gid=1484059711';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else current += char;
  }
  result.push(current);
  return result;
}

async function fetchData() {
  const resp = await fetch(CSV_URL);
  const text = await resp.text();
  const lines = text.split('\n');
  const deptData = {};

  lines.slice(2).forEach(line => {
    const cols = parseCSVLine(line);
    const numero = cols[0]?.trim();
    const name = cols[1]?.trim();
    const scoreS2Raw = cols[3]?.trim();

    if (!numero || (!(!isNaN(parseInt(numero))) && !/^2[AB]$/i.test(numero))) return;
    if (!name) return;

    const scoreS2 = scoreS2Raw ? parseInt(scoreS2Raw.replace(/\s/g, '').replace(',', '')) : null;
    const code = numero.toString().padStart(2, '0').toUpperCase();
    const svgId = 'FR' + (/^2[Aa]$/.test(numero) ? '2A' : /^2[Bb]$/.test(numero) ? '2B' : code);

    deptData[svgId] = { name, code, score: isNaN(scoreS2) ? null : scoreS2 };
  });

  return deptData;
}

let htmlTemplate = '';
let cachedData = {};

fastify.get('/', async (request, reply) => {
  try {
    cachedData = await fetchData();
  } catch (e) {
    console.error('Erreur fetch:', e);
  }

  const html = htmlTemplate.replace(
    '</head>',
    `<script>window.DEPT_DATA = ${JSON.stringify(cachedData)};</script>\n</head>`
  );

  return reply.type('text/html').send(html);
});

fastify.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  // Charge le HTML au démarrage
  htmlTemplate = readFileSync(`${__dirname}/index.html`, 'utf-8');

  console.log('Serveur sur http://localhost:3000');
});
