import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

function fix(dir) {
  for (const file of fs.readdirSync(dir)) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      fix(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let content = fs.readFileSync(p, 'utf8');
      
      const relToSrc = path.relative(path.dirname(p), srcDir).replace(/\\/g, '/') || '.';
      
      let newContent = content.replace(/from\s+['"]@\/([^'"]+)['"]/g, 'from "' + relToSrc + '/$1"');
      newContent = newContent.replace(/import\s+['"]@\/([^'"]+)['"]/g, 'import "' + relToSrc + '/$1"');
      // What about default imports? They are handled by the first replace.
      
      if (content !== newContent) {
        fs.writeFileSync(p, newContent);
        console.log("Fixed " + p);
      }
    }
  }
}

fix(srcDir);
