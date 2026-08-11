const fs = require('fs');
const lines = JSON.parse(fs.readFileSync('C:\\Users\\karti\\Desktop\\EndoScribe\\scratch_recovery.json', 'utf8'));

for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i];
  if (line.includes('"name":"default_api:multi_replace_file_content"')) {
    const data = JSON.parse(line);
    if (data.type === 'PLANNER_RESPONSE' && data.tool_calls) {
      for (const call of data.tool_calls) {
         if (call.name === 'default_api:replace_file_content' || call.name === 'default_api:write_to_file') {
             // Let's just find the first big write or the last view_file
         }
      }
    }
  }
}

let latestCode = "";
for (let i = lines.length - 1; i >= 0; i--) {
  try {
     const data = JSON.parse(lines[i]);
     if (data.type === 'PLANNER_RESPONSE' && data.tool_calls) {
        for (const call of data.tool_calls) {
           if (call.name === 'default_api:write_to_file' && call.arguments && call.arguments.TargetFile.includes('reportGenerator.ts')) {
               latestCode = call.arguments.CodeContent;
               fs.writeFileSync('C:\\Users\\karti\\Desktop\\EndoScribe\\recovered_reportGenerator.ts', latestCode);
               console.log("Recovered from write_to_file!");
               process.exit(0);
           }
        }
     }
  } catch(e) {}
}
