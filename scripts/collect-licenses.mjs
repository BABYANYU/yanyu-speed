import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const notices = [];
for (const [name, item] of Object.entries(lock.packages)) {
  if (!name || item.dev || item.devOptional || item.link) continue;
  const directory = path.join(root, name);
  let files;
  try { files = await readdir(directory); } catch { continue; } // Optional binaries for other operating systems.
  for (const file of files.sort()) {
    if (!/^(?:license|licence|notice|copying)/i.test(file)) continue;
    let text;
    try { text = await readFile(path.join(directory, file), 'utf8'); } catch { continue; }
    notices.push(`\n==== ${name.replace(/^node_modules\//, '')} ${item.version} / ${file} ====\n${text.replace(/\r\n?/g, '\n')}`);
  }
}
if (notices.length === 0) throw new Error('No dependency licenses found; run npm ci first.');
await writeFile(path.join(root, 'public/DEPENDENCY-LICENSES.txt'), notices.join('\n'));
await writeFile(path.join(root, 'public/THIRD_PARTY_NOTICES.txt'), await readFile(path.join(root, 'THIRD_PARTY_NOTICES')));
console.log(`Collected ${notices.length} dependency license files.`);
