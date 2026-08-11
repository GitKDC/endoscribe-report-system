const fs = require('fs');
const lines = JSON.parse(fs.readFileSync('C:\\Users\\karti\\Desktop\\EndoScribe\\scratch_recovery.json', 'utf8'));

let fullContent = "";

for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i];
  if (line.includes("Showing lines 1 to 85")) {
     const data = JSON.parse(line);
     if (data.type === 'MODEL_RESPONSE' || data.type === 'TOOL_RESPONSE' || data.type === 'PLANNER_RESPONSE' || data.type === 'SYSTEM') {
        const text = data.content || JSON.stringify(data);
        if (text.includes('export const exportAsWord')) {
           console.log("Found view_file output!");
           // Extract the content from the view_file output
           fs.writeFileSync('C:\\Users\\karti\\Desktop\\EndoScribe\\recovered_view.txt', text);
           break;
        }
     }
  }
}
