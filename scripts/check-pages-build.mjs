import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const output = process.argv[2] || 'dist';
const html = await readFile(path.join(output, 'index.html'), 'utf8');
const prefix = '/sol-amigo-pro/';
const modules = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
if (!modules.length || modules.some(src => !src.startsWith(prefix + 'assets/') || !src.endsWith('.js'))) {
  throw new Error('Pages requires compiled JavaScript under /sol-amigo-pro/assets/. Source HTML must never be deployed.');
}
for (const src of modules) await access(path.join(output, src.slice(prefix.length)));
if (/(?:src|href)=["']\/assets\//i.test(html) || /\/src\/main\.tsx/.test(html)) {
  throw new Error('Pages HTML contains development paths or assets outside the published subpath.');
}
console.log('PASS Pages: compiled entry files exist and use the correct subpath.');
