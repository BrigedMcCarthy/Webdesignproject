#!/usr/bin/env node
// generate_filetree.js
// Walks the workspace and writes filetree.json at repository root.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outFile = path.join(root, 'filetree.json');

function shouldSkip(name){
  // skip node_modules, .git, and the generated file itself and scripts folder watcher
  if (name === 'node_modules' || name === '.git' || name === 'filetree.json') return true;
  return false;
}

function walk(dir){
  const name = path.basename(dir);
  const item = { name: name, path: path.relative(root, dir), type: 'directory', children: [] };
  let entries = [];
  try{ entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch(e){ return item; }
  entries.forEach(ent => {
    if (shouldSkip(ent.name)) return;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()){
      item.children.push(walk(full));
    } else if (ent.isFile()){
      try{
        const st = fs.statSync(full);
        item.children.push({ name: ent.name, path: path.relative(root, full), type: 'file', size: st.size, mtime: st.mtimeMs });
      }catch(e){}
    }
  });
  // sort directories first then files
  item.children.sort((a,b)=>{ if (a.type!==b.type) return a.type==='directory'?-1:1; return a.name.localeCompare(b.name); });
  return item;
}

function write(){
  const tree = walk(root);
  // increment build number starting at 1 if previous file exists
  try{
    if (fs.existsSync(outFile)){
      const prev = JSON.parse(fs.readFileSync(outFile,'utf8'));
      if (prev && typeof prev.build === 'number') tree.build = prev.build + 1;
      else tree.build = 1;
    } else tree.build = 1;
  } catch(e){ tree.build = 1; }
  tree.buildTime = Date.now();
  try{
    fs.writeFileSync(outFile, JSON.stringify(tree, null, 2), 'utf8');
    console.log('Wrote', outFile);
  }catch(e){ console.error('Failed to write', e); }
}

if (process.argv.indexOf('--watch') !== -1){
  // optional watcher using chokidar
  let chokidar;
  try{ chokidar = require('chokidar'); }
  catch(e){ console.error('chokidar not installed. Run `npm install` to enable --watch.'); write(); process.exit(0); }
  write();
  const watcher = chokidar.watch(root, { ignored: [ /node_modules/, /\.git/, outFile ], persistent: true, ignoreInitial: true });
  watcher.on('all', (ev, p) => { console.log('change', ev, p); write(); });
  console.log('Watching', root);
} else {
  write();
}
