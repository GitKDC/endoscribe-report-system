const fs = require('fs');
const lines = JSON.parse(fs.readFileSync('C:\\Users\\karti\\Desktop\\EndoScribe\\scratch_recovery.json', 'utf8'));

for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i];
  if (line.includes('"step_index":3753')) {
     const data = JSON.parse(line);
     const content = data.tool_calls[0].args.ReplacementContent;
     fs.writeFileSync('C:\\Users\\karti\\Desktop\\EndoScribe\\recovered.txt', content);
     console.log("Recovered!");
     break;
  }
}
