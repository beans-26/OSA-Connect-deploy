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

let modifiedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix text-slate double injection
  // e.g. dark:text-slate-400 dark:text-slate-500 -> dark:text-slate-400
  content = content.replace(/(dark:text-slate-\d+)\s+dark:text-slate-\d+/g, '$1');
  
  // Fix border-slate double injection
  // e.g. dark:border-slate-800 dark:border-slate-600 -> dark:border-slate-800
  content = content.replace(/(dark:border-slate-\d+)\s+dark:border-slate-\d+/g, '$1');

  // Fix bg-slate double injection
  // e.g. dark:bg-slate-900 dark:bg-slate-800 -> dark:bg-slate-900
  content = content.replace(/(dark:bg-slate-\d+)\s+dark:bg-slate-\d+/g, '$1');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedFiles++;
    console.log(`Cleaned: ${file}`);
  }
});

console.log(`Done! Cleaned ${modifiedFiles} files.`);
