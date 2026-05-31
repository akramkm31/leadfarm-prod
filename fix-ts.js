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

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Replace type castings
  newContent = newContent
    .replace(/as Treatment\[\]/g, 'as any[]')
    .replace(/\(t: Treatment\)/g, '(t: any)')
    .replace(/\(treatment: Treatment\)/g, '(treatment: any)');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
  }
});

console.log(`Replaced Treatment types in ${changedCount} files.`);
