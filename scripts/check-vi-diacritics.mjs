import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

const messagesPath = 'src/messages/vi.json';

// This guard was originally scoped to the checkout/payment/order-recovery
// namespaces (2026-08 checkout flow review) because the rest of the app
// still had unaccented Vietnamese strings from earlier work. A dedicated
// content pass (2026-08) added full diacritics across every namespace in
// vi.json and every source file, so the guard now covers everything.
const SCOPED_NAMESPACES = null; // null means "all namespaces"

// The same scope, in component form. Checkout-flow (and other) components
// deliberately carry their own per-locale `copy` dictionaries rather than
// next-intl (see plans 017 and 019), so scanning vi.json alone misses them
// entirely — the whole cart page once shipped in unaccented Vietnamese while
// the guard passed. Scan the whole source tree instead of a component list.
const SCOPED_SOURCE_DIRS = ['src'];

// Common Vietnamese words that are frequently typed without diacritics.
// A hit means a string almost certainly needs accents but does not have any
// Vietnamese accented character at all. This is a lint, not a translator —
// it only catches the "typed in plain ASCII" failure mode.
const SUSPECT_WORDS =
  /\b(khong|thanh toan|don hang|gio hang|san pham|dia chi|giao hang|mien phi|ma giam gia|dang nhap|tai khoan|xac nhan|thong tin|nguoi dung|vui long|duoc|hang hoa|so luong|kiem tra|tiep tuc|bat dau|truoc khi|hoan tac|da xoa|yeu cau|lien ket|ngoai le|ton kho|dang gui|cap nhat)\b/i;
const HAS_DIACRITIC = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀ-Ỵ]/;

const hits = [];

function walkMessages(obj, path) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const nextPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string') {
      if (SUSPECT_WORDS.test(value) && !HAS_DIACRITIC.test(value)) {
        hits.push({where: `${messagesPath}:${nextPath}`, value});
      }
    } else if (value && typeof value === 'object') {
      walkMessages(value, nextPath);
    }
  }
}

function sourceFiles(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      entries.push(...sourceFiles(full));
    } else if (/\.(tsx?|mts)$/.test(name)) {
      entries.push(full);
    }
  }
  return entries;
}

// Everything a Vietnamese sentence can be written in. Scanning quoted
// single-line literals alone missed the two shapes a React component reaches
// for most: JSX text nodes, and template literals carrying an interpolation.
//
// This stays a regex scan rather than a TypeScript AST pass because it is a
// lint for one specific failure mode ("typed in plain ASCII"), not a
// translator — the suspect-word list keeps false positives near zero, and a
// missed hit is a missed reminder, not a broken build. If it ever needs to
// understand scope or types, promote it to an ESLint rule instead of growing
// this regex further.
const SOURCE_TEXT = [
  // 'single'  "double"
  /'((?:[^'\\\n]|\\.){4,})'/g,
  /"((?:[^"\\\n]|\\.){4,})"/g,
  // `template ${withInterpolation} and newlines`
  /`((?:[^`\\]|\\.){4,})`/g,
  // >JSX text< — including text that wraps across lines
  />([^<>{}]{4,})</g
];

// `${...}` is code, not copy: strip it so an interpolation neither hides the
// words around it nor contributes false ones.
function copyTextOf(raw) {
  return raw.replace(/\$\{[^}]*\}/g, ' ');
}

function scanSource(file) {
  const source = readFileSync(file, 'utf8');
  const lineStarts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') lineStarts.push(index + 1);
  }
  const lineOf = (offset) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (lineStarts[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };

  const seen = new Set();
  for (const pattern of SOURCE_TEXT) {
    for (const match of source.matchAll(pattern)) {
      const text = copyTextOf(match[1] ?? '').trim();
      if (!text || !SUSPECT_WORDS.test(text) || HAS_DIACRITIC.test(text)) continue;
      const where = `${file}:${lineOf(match.index)}`;
      const key = `${where}:${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({where, value: text});
    }
  }
}

walkMessages(
  SCOPED_NAMESPACES === null
    ? JSON.parse(readFileSync(messagesPath, 'utf8'))
    : Object.fromEntries(
        Object.entries(JSON.parse(readFileSync(messagesPath, 'utf8'))).filter(([namespace]) =>
          SCOPED_NAMESPACES.includes(namespace)
        )
      ),
  ''
);

for (const dir of SCOPED_SOURCE_DIRS) {
  for (const file of sourceFiles(dir)) {
    scanSource(file);
  }
}

if (hits.length > 0) {
  console.error(`Found ${hits.length} likely unaccented Vietnamese string(s):\n`);
  for (const hit of hits) {
    console.error(`  ${hit.where}: "${hit.value}"`);
  }
  console.error('\nAdd full Vietnamese diacritics before merging.');
  process.exit(1);
}

console.log(
  `No obviously unaccented Vietnamese strings in ${messagesPath} (all namespaces) or ${SCOPED_SOURCE_DIRS.join(', ')}.`
);
