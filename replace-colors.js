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
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(targetDir);
let changedCount = 0;

// Regex for tailwind colors (exclude emerald, green, lime, neutral, gray, slate, stone, zinc, black, white)
const tailwindRegex = /\b(bg|text|border|ring|shadow|fill|stroke|outline)-(blue|amber|orange|purple|red|yellow|cyan|indigo|fuchsia|pink|rose|teal|sky|violet)-([0-9]{2,3})\b/g;

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Replace Tailwind classes
  newContent = newContent.replace(tailwindRegex, '$1-emerald-$3');

  // Replace CSS variable names
  newContent = newContent
    .replace(/--interactive-blue/g, '--interactive-green')
    .replace(/--action-blue/g, '--action-green')
    .replace(/--sky-blue/g, '--sky-green')
    .replace(/--blue-010/g, '--green-010')
    .replace(/--blue-020/g, '--green-020')
    .replace(/--orange-010/g, '--green-010')
    .replace(/--deep-plum/g, '--deep-green')
    .replace(/--warm-taupe/g, '--warm-green')
    .replace(/--vibrant-orange/g, '--vibrant-green');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
  }
});

console.log(`Replaced colors in ${changedCount} files.`);
