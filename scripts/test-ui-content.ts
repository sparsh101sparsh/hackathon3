import fs from 'node:fs';
import path from 'node:path';

const roots = ['app', 'components', 'lib'];
const extensions = new Set(['.ts', '.tsx']);
const emojiPattern = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const forbiddenBrand = /chaicode/i;
const failures: string[] = [];

function walk(directory: string) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (extensions.has(path.extname(entry.name))) {
      const source = fs.readFileSync(fullPath, 'utf8');
      if (emojiPattern.test(source)) failures.push(`${fullPath}: emoji character found`);
      if (forbiddenBrand.test(source)) failures.push(`${fullPath}: forbidden brand reference found`);
    }
  }
}

for (const root of roots) walk(root);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('UI content contract: no emoji characters or forbidden brand references found.');
