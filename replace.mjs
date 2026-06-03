import fs from 'fs';
import path from 'path';

const filePath = path.resolve('./src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Colors
content = content.replace(/slate-/g, 'zinc-');
content = content.replace(/blue-/g, 'emerald-');
content = content.replace(/indigo-/g, 'teal-');

// Shapes
content = content.replace(/rounded-3xl/g, 'rounded-[2.5rem]');
content = content.replace(/rounded-2xl/g, 'rounded-3xl');
content = content.replace(/rounded-xl/g, 'rounded-2xl');

// Typography
// Let's replace "font-display" with a new font or keep it but change the hero section
content = content.replace(/bg-zinc-950/g, 'bg-zinc-900');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated the design');
