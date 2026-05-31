const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.jsx')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const pagesDir = path.join(__dirname, 'frontend/src/pages');
const files = walkSync(pagesDir);

const replacements = {
  '\\bbg-white\\b(?!\\s+dark:)': 'bg-white dark:bg-slate-800',
  '\\bbg-slate-50\\b(?!\\s+dark:)': 'bg-slate-50 dark:bg-slate-900',
  '\\btext-slate-900\\b(?!\\s+dark:)': 'text-slate-900 dark:text-white',
  '\\btext-slate-800\\b(?!\\s+dark:)': 'text-slate-800 dark:text-slate-200',
  '\\btext-slate-700\\b(?!\\s+dark:)': 'text-slate-700 dark:text-slate-300',
  '\\btext-slate-600\\b(?!\\s+dark:)': 'text-slate-600 dark:text-slate-400',
  '\\btext-slate-500\\b(?!\\s+dark:)': 'text-slate-500 dark:text-slate-400',
  '\\btext-slate-400\\b(?!\\s+dark:)': 'text-slate-400 dark:text-slate-500',
  '\\btext-slate-300\\b(?!\\s+dark:)': 'text-slate-300 dark:text-slate-600',
  '\\bborder-slate-100\\b(?!\\s+dark:)': 'border-slate-100 dark:border-slate-700',
  '\\bborder-slate-200\\b(?!\\s+dark:)': 'border-slate-200 dark:border-slate-600'
};

let modifiedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  for (const [pattern, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(pattern, 'g');
    content = content.replace(regex, replacement);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedFiles++;
    console.log(`Modified: ${file}`);
  }
});

console.log(`Done! Modified ${modifiedFiles} files.`);
