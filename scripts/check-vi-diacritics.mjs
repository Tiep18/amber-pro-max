import {readFileSync} from 'node:fs';

const path = 'src/messages/vi.json';
const data = JSON.parse(readFileSync(path, 'utf8'));

// Scoped to the checkout/payment/order-recovery namespaces this guard was
// introduced for (2026-08 checkout flow review). Other namespaces
// (catalog, product, auth, account, footer, wishlist, ...) still contain
// unaccented Vietnamese strings from earlier work and need a separate,
// dedicated content pass before they can be added here without breaking CI.
const SCOPED_NAMESPACES = ['orders', 'payments', 'guestAccess', 'checkout', 'cart'];

// Common Vietnamese words that are frequently typed without diacritics.
// A hit means a string almost certainly needs accents but does not have any
// Vietnamese accented character at all. This is a lint, not a translator —
// it only catches the "typed in plain ASCII" failure mode.
const SUSPECT_WORDS =
  /\b(khong|thanh toan|don hang|gio hang|san pham|dia chi|giao hang|mien phi|ma giam gia|dang nhap|tai khoan|xac nhan|thong tin|nguoi dung|vui long|duoc|hang hoa)\b/i;
const HAS_DIACRITIC = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀ-Ỵ]/;

const hits = [];

function walk(obj, path) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const nextPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string') {
      if (SUSPECT_WORDS.test(value) && !HAS_DIACRITIC.test(value)) {
        hits.push({path: nextPath, value});
      }
    } else if (value && typeof value === 'object') {
      walk(value, nextPath);
    }
  }
}

for (const namespace of SCOPED_NAMESPACES) {
  if (data[namespace]) {
    walk(data[namespace], namespace);
  }
}

if (hits.length > 0) {
  console.error(`Found ${hits.length} likely unaccented Vietnamese string(s) in ${path}:\n`);
  for (const hit of hits) {
    console.error(`  ${hit.path}: "${hit.value}"`);
  }
  console.error('\nAdd full Vietnamese diacritics before merging.');
  process.exit(1);
}

console.log(`vi.json: no obviously unaccented strings found in ${SCOPED_NAMESPACES.join(', ')}.`);
