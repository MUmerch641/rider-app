const fs = require("fs");
const path = require("path");
const glob = require("glob"); // or use fs.readdirSync recursively

// ─── 1. CONFIG ───────────────────────────────────────────
const LOCALES_DIR = "./locales"; // adjust to your path
const SRC_DIRS = ["./app", "./components", "./context", "./utils", "./hooks"];
const LOCALE_FILES = ["en", "ar", "ku"];

// ─── 2. LOAD & FLATTEN LOCALE JSONs ──────────────────────
function flattenKeys(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      Object.assign(acc, flattenKeys(obj[key], full));
    } else {
      acc[full] = obj[key];
    }
    return acc;
  }, {});
}

const locales = {};
for (const lang of LOCALE_FILES) {
  const raw = fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), "utf8");
  locales[lang] = flattenKeys(JSON.parse(raw));
}

// ─── 3. FIND MISSING KEYS ────────────────────────────────
const allKeys = new Set([
  ...Object.keys(locales.en),
  ...Object.keys(locales.ar),
  ...Object.keys(locales.ku),
]);

console.log("\n## Missing Translation Keys\n");
for (const lang of LOCALE_FILES) {
  const missing = [...allKeys].filter((k) => !(k in locales[lang]));
  if (missing.length) {
    console.log(`### Missing from ${lang}.json (${missing.length} keys)`);
    missing.forEach((k) => console.log(`  - ${k}`));
    console.log();
  }
}

// ─── 4. SCAN SOURCE FILES ────────────────────────────────
function getAllFiles(dirs) {
  const files = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) files.push(full);
      }
    };
    walk(dir);
  }
  return files;
}

const sourceFiles = getAllFiles(SRC_DIRS);

// ─── 5. ZERO i18n FILES ──────────────────────────────────
console.log("\n## Files With ZERO i18n\n");
const zeroI18n = sourceFiles.filter((f) => {
  const content = fs.readFileSync(f, "utf8");
  const hasJSX = /<[A-Z]/.test(content) || /return \(/.test(content);
  const hasTranslation = /useTranslation/.test(content);
  return hasJSX && !hasTranslation;
});
zeroI18n.forEach((f) => console.log(`  - ${f}`));

// ─── 6. PARTIAL i18n FILES ──────────────────────────────
// Files that DO use useTranslation but still have raw string literals in JSX
console.log("\n## Partially Translated Files\n");
const hardcodedStringRegex = />([A-Z][^<{]{4,})</g;

const partial = [];
for (const f of sourceFiles) {
  const content = fs.readFileSync(f, "utf8");
  if (!content.includes("useTranslation")) continue;
  const matches = [...content.matchAll(hardcodedStringRegex)]
    .map((m) => m[1].trim())
    .filter((s) => !/^\s*$/.test(s));
  if (matches.length > 0) partial.push({ file: f, strings: matches });
}
partial.forEach(({ file, strings }) => {
  console.log(`### ${file}`);
  strings.forEach((s) => console.log(`  - "${s}"`));
  console.log();
});

// ─── 7. SUMMARY ─────────────────────────────────────────
console.log("\n## Summary");
console.log(`  Zero i18n files:       ${zeroI18n.length}`);
console.log(`  Partial i18n files:    ${partial.length}`);
