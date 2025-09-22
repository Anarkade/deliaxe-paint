const fs = require('fs');
const path = process.argv[2];
const start = parseInt(process.argv[3]||'1',10);
const end = parseInt(process.argv[4]||'200',10);
if(!path){ console.error('Usage: node print_lines.cjs <file> [start] [end]'); process.exit(2); }
const txt = fs.readFileSync(path,'utf8').split('\n');
for(let i=start-1;i<Math.min(end,txt.length);i++){
  const num = (i+1).toString().padStart(3,' ');
  console.log(`${num}: ${txt[i]}`);
}
