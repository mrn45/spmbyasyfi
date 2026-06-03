import fs from 'fs';
import path from 'path';

const filePath = path.resolve('./src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Better shadows for cards 
content = content.replace(/shadow-xl shadow-zinc-100/g, 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]');
content = content.replace(/shadow-xl/g, 'shadow-[0_8px_30px_rgb(0,0,0,0.06)]');
content = content.replace(/shadow-2xl/g, 'shadow-[0_12px_40px_rgb(0,0,0,0.08)]');
content = content.replace(/shadow-md/g, 'shadow-[0_4px_20px_rgb(0,0,0,0.05)]');

// 2. Refine border and bg for inputs to be very modern and subtle
content = content.replace(/border-zinc-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500\/20 focus:border-emerald-600 bg-zinc-50\/50/g, 
  'border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300');

content = content.replace(/border-zinc-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500\/20 focus:border-emerald-600 uppercase bg-zinc-50\/50/g, 
  'border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 uppercase');

content = content.replace(/border border-zinc-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500\/20 focus:border-emerald-600/g,
  'border border-zinc-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all duration-200 hover:border-zinc-300 bg-white');

// 3. Make main form container a bit sleeker
content = content.replace(/rounded-\[2.5rem\]/g, 'rounded-[2rem]');

// 4. Primary buttons
content = content.replace(/bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-8 py-4 rounded-3xl shadow-lg shadow-emerald-500\/20 transition-all duration-200 transform hover:-tranzinc-y-0.5/g,
  'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-white font-bold px-8 py-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.2)]');

// 5. Submit buttons inside form
content = content.replace(/bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl/g, 
  'bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-full shadow-[0_8px_20px_rgb(16,185,129,0.25)] hover:shadow-[0_12px_25px_rgb(16,185,129,0.35)] transition-all duration-300 hover:-translate-y-0.5');

content = content.replace(/bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl/g,
  'bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 px-6 rounded-full shadow-[0_8px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_12px_25px_rgb(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-0.5');

content = content.replace(/bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 px-6 rounded-2xl/g,
  'bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 px-6 rounded-full shadow-[0_8px_20px_rgb(0,0,0,0.1)] hover:shadow-[0_12px_25px_rgb(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-0.5');

content = content.replace(/bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl/g,
  'bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-full shadow-[0_8px_20px_rgb(16,185,129,0.25)] transition-all duration-300 hover:-translate-y-0.5');

// Form inner steps
content = content.replace(/shadow-sm border border-zinc-200\/60 p-4 rounded-2xl bg-emerald-50\/20/g,
  'shadow-[0_2px_15px_rgb(0,0,0,0.02)] border border-emerald-100/60 p-4 rounded-2xl bg-emerald-50/10 backdrop-blur-sm');

// Hero button hover fix
content = content.replace(/hover:-tranzinc-y-0.5/g, 'hover:-translate-y-0.5');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update modern styles applied.');
