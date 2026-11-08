import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;

const PAGES = [
  'index.html',
  'onboard.html',
  'hunter.html',
  'dao.html',
  'dispute.html',
  'ens.html',
  'faucet.html',
];

const SCREENSHOTS = ['screen-hunter.png', 'screen-dao.png', 'screen-faucet.png'];

function ok(name) {
  console.log(`ok   ${name}`);
  passed += 1;
}

function fail(name, error) {
  console.error(`FAIL ${name}: ${error.message}`);
  failed += 1;
}

function check(name, fn) {
  try {
    fn();
    ok(name);
  } catch (error) {
    fail(name, error);
  }
}

function read(rel) {
  return readFileSync(path.join(root, rel), 'utf8');
}

function requireFile(rel) {
  if (!existsSync(path.join(root, rel))) {
    throw new Error(`${rel} is missing`);
  }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (['node_modules', '.git', '.netlify', '.temp'].includes(entry.name)) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

function pngSize(rel) {
  const buffer = readFileSync(path.join(root, rel));
  if (buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error(`${rel} is not a PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/`[^`]*`/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function checkMarkdown(rel) {
  const text = read(rel);
  if (text.includes('\u2014')) throw new Error(`${rel} contains an em dash`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) {
    throw new Error(`${rel} contains an emoji`);
  }
  if (text.toLowerCase().includes('codebuff')) throw new Error(`${rel} contains a Codebuff reference`);
  if (text.includes('geekman58748')) throw new Error(`${rel} contains the old repository username`);

  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (/^(https?:|#|mailto:)/.test(target)) continue;
    const local = target.split('#')[0];
    if (local && !existsSync(path.join(root, path.dirname(rel), local))) {
      throw new Error(`${rel} links to missing ${local}`);
    }
  }
}

function checkAnchors() {
  const text = read('README.md');
  const headings = new Set(
    [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slug(match[1])),
  );
  for (const match of text.matchAll(/\]\(#([^)]+)\)/g)) {
    if (!headings.has(match[1])) throw new Error(`README.md has a missing heading #${match[1]}`);
  }
}

function tracked() {
  try {
    return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

const required = [
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'SECURITY.md',
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  '.env.example',
  '.github/dependabot.yml',
  '.github/pull_request_template.md',
  '.github/workflows/check.yml',
  '.github/workflows/deploy-functions.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  'docs/brand.html',
  'docs/assets/banner.png',
  'docs/assets/social-preview.png',
  ...SCREENSHOTS.map((file) => `docs/assets/${file}`),
  'scripts/check-repo.mjs',
  'css/styles.css',
  'netlify.toml',
  'supabase/functions/faucet-claim/index.ts',
  'supabase/functions/README.md',
  ...PAGES,
  ...readdirSync(path.join(root, 'js'))
    .filter((file) => file.endsWith('.js'))
    .map((file) => `js/${file}`),
];

for (const file of required) {
  check(`${file} exists`, () => requireFile(file));
}

check('README has no em dashes or emojis', () => checkMarkdown('README.md'));
check('CONTRIBUTING has no em dashes or emojis', () => checkMarkdown('CONTRIBUTING.md'));
check('SECURITY has no em dashes or emojis', () => checkMarkdown('SECURITY.md'));
check('brand source has no em dashes or emojis', () => checkMarkdown('docs/brand.html'));
check('README internal anchors resolve', checkAnchors);

check('README contains the banner and screenshots', () => {
  const text = read('README.md');
  for (const image of [
    'docs/assets/banner.png',
    ...SCREENSHOTS.map((file) => `docs/assets/${file}`),
  ]) {
    if (!text.includes(image)) throw new Error(`README is missing ${image}`);
  }
});

check('README lists every page', () => {
  const text = read('README.md');
  for (const page of PAGES) {
    if (!text.includes(page)) throw new Error(`README does not mention ${page}`);
  }
});

check('banner is 2560 by 800', () => {
  const size = pngSize('docs/assets/banner.png');
  if (size.width !== 2560 || size.height !== 800) {
    throw new Error(`banner is ${size.width} by ${size.height}`);
  }
});

check('social preview is 1280 by 640', () => {
  const size = pngSize('docs/assets/social-preview.png');
  if (size.width !== 1280 || size.height !== 640) {
    throw new Error(`social preview is ${size.width} by ${size.height}`);
  }
});

check('screenshots are 1600 by 1000', () => {
  for (const file of SCREENSHOTS) {
    const size = pngSize(`docs/assets/${file}`);
    if (size.width !== 1600 || size.height !== 1000) {
      throw new Error(`${file} is ${size.width} by ${size.height}`);
    }
  }
});

check('license is MIT', () => {
  if (!read('LICENSE').includes('MIT License')) throw new Error('LICENSE is not MIT');
});

check('Netlify publishes the repo root with an SPA fallback', () => {
  const text = read('netlify.toml');
  if (!text.includes('publish = "."')) throw new Error('publish directory is not the repo root');
  if (!text.includes('to     = "/index.html"')) throw new Error('SPA fallback is missing');
});

check('CI runs the repository checks', () => {
  if (!read('.github/workflows/check.yml').includes('node scripts/check-repo.mjs')) {
    throw new Error('check workflow does not run the repository checks');
  }
});

check('the function workflow deploys faucet-claim', () => {
  const text = read('.github/workflows/deploy-functions.yml');
  if (!text.includes('supabase functions deploy faucet-claim')) {
    throw new Error('deploy workflow does not deploy faucet-claim');
  }
});

check('no service role key in the browser bundle', () => {
  const files = walk('.').filter((file) => /\.(html|js|mjs)$/.test(file));
  for (const file of files) {
    const normalized = file.split(path.sep).join('/');
    if (normalized.startsWith('supabase/functions/')) continue;
    const text = readFileSync(path.join(root, file), 'utf8');
    if (/service[_-]?role/i.test(text) && !/must never|never use|not in the browser/i.test(text)) {
      throw new Error(`${normalized} references a service role key`);
    }
  }
});

check('.env is not tracked', () => {
  const files = tracked();
  if (files.includes('.env')) throw new Error('.env is tracked');
  if (files.some((file) => file.startsWith('node_modules/'))) {
    throw new Error('node_modules is tracked');
  }
});

check('no Codebuff or old username references', () => {
  const textExtensions = new Set([
    '.md', '.js', '.mjs', '.json', '.yml', '.yaml', '.toml', '.html',
    '.css', '.ts', '.txt', '.example', '.gitignore', '.editorconfig', '.gitattributes',
  ]);
  for (const file of walk('.')) {
    const normalized = file.split(path.sep).join('/');
    if (normalized === 'scripts/check-repo.mjs') continue;
    const ext = path.extname(file) || (file.startsWith('.') ? file : '');
    if (!textExtensions.has(ext)) continue;
    const text = readFileSync(path.join(root, file), 'utf8').toLowerCase();
    if (text.includes('codebuff')) throw new Error(`${normalized} contains a Codebuff reference`);
    if (text.includes('geekman58748')) throw new Error(`${normalized} contains the old username`);
  }
});

check('pages only reference local files that exist', () => {
  // Alpine bindings use :src and x-bind:src, which are expressions, not paths.
  const pattern = /(?<![:\w-])(?:src|href)="(?!https?:|#|mailto:|javascript:)([^"]+)"/g;
  for (const page of PAGES) {
    const text = read(page);
    for (const match of text.matchAll(pattern)) {
      const target = match[1].split('?')[0].split('#')[0];
      if (!target || target.endsWith('/')) continue;
      if (!/[./]/.test(target)) continue;
      if (!existsSync(path.join(root, target))) {
        throw new Error(`${page} references missing ${target}`);
      }
    }
  }
});

check('JavaScript and MJS files parse', () => {
  const files = walk('.').filter((file) => /\.(mjs|js)$/.test(file));
  for (const file of files) {
    try {
      execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`${file}: ${error.stderr?.toString().split('\n')[0] || error.message}`);
    }
  }
});

console.log('');
console.log(`${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
