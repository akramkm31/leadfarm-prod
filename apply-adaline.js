const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(targetDir);
let changedCount = 0;

const replacements = [
  // 1. Replace hardcoded github dark theme colors
  [/#161B22/g, '#fbfdf6'], // Canvas Ice
  [/#21262D/g, '#e0e5d5'], // Stone Moss / Mist Gray border
  [/#8B949E/g, '#31200b'], // Deep Earth secondary text
  [/#00D4AA/g, '#203b14'], // Valley Green accent

  // 2. Replace hardcoded white text
  [/\btext-white\/95\b/g, 'text-[var(--color-adaline-ink)]/95'],
  [/\btext-white\/90\b/g, 'text-[var(--color-adaline-ink)]/90'],
  [/\btext-white\/80\b/g, 'text-[var(--color-adaline-ink)]/80'],
  [/\btext-white\/70\b/g, 'text-[var(--color-adaline-ink)]/70'],
  [/\btext-white\/60\b/g, 'text-[var(--color-adaline-ink)]/60'],
  [/\btext-white\/50\b/g, 'text-[var(--color-adaline-ink)]/50'],
  [/\btext-white\/40\b/g, 'text-[var(--color-adaline-ink)]/40'],
  [/\btext-white\/30\b/g, 'text-[var(--color-adaline-ink)]/30'],
  [/\btext-white\/20\b/g, 'text-[var(--color-adaline-ink)]/20'],
  [/\btext-white\/10\b/g, 'text-[var(--color-adaline-ink)]/10'],
  [/\btext-white\b/g, 'text-[var(--color-adaline-ink)]'],

  // 3. Replace background/border white opacities (which would disappear on light theme)
  [/\bbg-white\/\[0\.02\]\b/g, 'bg-[var(--color-canvas-ice)]'],
  [/\bbg-white\/\[0\.03\]\b/g, 'bg-[var(--color-canvas-ice)]'],
  [/\bbg-white\/\[0\.04\]\b/g, 'bg-[var(--color-stone-moss)]/40'],
  [/\bbg-white\/\[0\.05\]\b/g, 'bg-[var(--color-stone-moss)]/50'],
  [/\bbg-white\/\[0\.06\]\b/g, 'bg-[var(--color-stone-moss)]/60'],
  [/\bbg-white\/\[0\.08\]\b/g, 'bg-[var(--color-stone-moss)]'],
  [/\bbg-white\/10\b/g, 'bg-[var(--color-stone-moss)]'],
  [/\bbg-white\/5\b/g, 'bg-[var(--color-canvas-ice)]'],
  [/\bbg-white\/20\b/g, 'bg-[var(--color-stone-moss)]'],
  [/\bbg-white\/30\b/g, 'bg-[var(--color-stone-moss)]'],
  [/\bbg-white\/80\b/g, 'bg-[var(--color-canvas-ice)]/80'],
  [/\bbg-white\/90\b/g, 'bg-[var(--color-canvas-ice)]/90'],

  [/\bborder-white\/\[0\.05\]\b/g, 'border-[var(--color-stone-moss)]'],
  [/\bborder-white\/\[0\.06\]\b/g, 'border-[var(--color-stone-moss)]'],
  [/\bborder-white\/10\b/g, 'border-[var(--color-stone-moss)]'],
  [/\bborder-white\/20\b/g, 'border-[var(--color-mist-gray)]'],
  [/\bborder-white\/30\b/g, 'border-[var(--color-mist-gray)]'],
  [/\bborder-white\/5\b/g, 'border-[var(--color-stone-moss)]'],

  // 4. Remove backdrop blurs as Adaline favors flat layouts
  [/\bbackdrop-blur-md\b/g, ''],
  [/\bbackdrop-blur-sm\b/g, ''],
  [/\bbackdrop-blur-lg\b/g, ''],
  [/\bbackdrop-blur-xl\b/g, ''],

  // 5. Replace emerald classes with valley-green / adaline-ink
  [/\bbg-emerald-500\/10\b/g, 'bg-[var(--color-valley-green)]/10'],
  [/\bbg-emerald-500\/\[0\.07\]\b/g, 'bg-[var(--color-valley-green)]/8'],
  [/\bbg-emerald-500\/\[0\.06\]\b/g, 'bg-[var(--color-valley-green)]/6'],
  [/\bbg-emerald-500\/5\b/g, 'bg-[var(--color-valley-green)]/5'],
  [/\bbg-emerald-500\/\[0\.05\]\b/g, 'bg-[var(--color-valley-green)]/5'],
  [/\bbg-emerald-500\/\[0\.03\]\b/g, 'bg-[var(--color-valley-green)]/3'],
  [/\bbg-emerald-500\/\[0\.04\]\b/g, 'bg-[var(--color-valley-green)]/4'],
  [/\bborder-emerald-500\/25\b/g, 'border-[var(--color-valley-green)]/25'],
  [/\bborder-emerald-500\/20\b/g, 'border-[var(--color-valley-green)]/20'],
  [/\bborder-emerald-500\/10\b/g, 'border-[var(--color-valley-green)]/10'],
  [/\bborder-emerald-500\/30\b/g, 'border-[var(--color-valley-green)]/30'],
  [/\btext-emerald-300\b/g, 'text-[var(--color-valley-green)]'],
  [/\btext-emerald-400\b/g, 'text-[var(--color-valley-green)]'],
  [/\btext-emerald-500\b/g, 'text-[var(--color-valley-green)]'],
  [/\btext-emerald-600\b/g, 'text-[var(--color-valley-green)]'],
  [/\btext-emerald-700\b/g, 'text-[var(--color-valley-green)]'],
  [/\bbg-emerald-500\b/g, 'bg-[var(--color-valley-green)]'],
  [/\bbg-emerald-600\b/g, 'bg-[var(--color-valley-green)]'],
  [/\bbg-emerald-700\b/g, 'bg-[var(--color-valley-green)]'],
];

files.forEach((file) => {
  if (file.endsWith('globals.css') || file.endsWith('apply-adaline.js') || file.endsWith('replace-colors.js') || file.endsWith('fix-ts.js')) {
    return; // Skip system/build/utility files
  }
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  replacements.forEach(([regex, replacement]) => {
    newContent = newContent.replace(regex, replacement);
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
  }
});

console.log(`Updated ${changedCount} files to Adaline styles.`);
