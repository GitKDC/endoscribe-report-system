const fs = require('fs');
const readline = require('readline');

async function recover() {
  const fileStream = fs.createReadStream('C:\\Users\\karti\\.gemini\\antigravity\\brain\\e1d3a2d6-3c49-4d88-810b-eae0499bda0b\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let latestFullFile = null;
  let lines = [];
  
  for await (const line of rl) {
    if (line.includes('reportGenerator.ts')) {
      lines.push(line);
    }
  }
  fs.writeFileSync('C:\\Users\\karti\\Desktop\\EndoScribe\\scratch_recovery.json', JSON.stringify(lines, null, 2));
}

recover();
