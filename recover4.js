const fs = require('fs');
const lines = JSON.parse(fs.readFileSync('C:\\Users\\karti\\Desktop\\EndoScribe\\scratch_recovery.json', 'utf8'));

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('export const exportAsWord')) {
    fs.appendFileSync('C:\\Users\\karti\\Desktop\\EndoScribe\\dump.txt', lines[i] + "\n\n=====\n\n");
  }
}
