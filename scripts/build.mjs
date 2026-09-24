import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = process.cwd();
const out = path.join(root, 'dist');
const names = ['index.html', 'menu.html', 'guest-core.js', 'guest-live.js', 'staff.html', 'staff.js', 'menu-images-lite.js'];
const source = Object.fromEntries(names.map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')]));
for (const name of names) {
  assert(source[name].length > 100, `${name}: empty or incomplete source`);
  if (name.endsWith('.html')) {
    assert(/<body[\s>]/i.test(source[name]) && /<\/body>\s*<\/html>\s*$/i.test(source[name]), `${name}: incomplete HTML`);
    assert.equal((source[name].match(/<style[\s>]/gi)||[]).length, (source[name].match(/<\/style>/gi)||[]).length, `${name}: unclosed stylesheet`);
  } else {
    new vm.Script(source[name], {filename: name});
  }
  assert(!/sb_secret_[A-Za-z0-9_-]+/.test(source[name]), `${name}: private key in client source`);
}
assert.equal((source['menu.html'].match(/<article\b[^>]*class="lux-menu-item"/g)||[]).length, 51, 'The approved menu must contain 51 dishes');

// Decode the existing approved photos at build time. No photo JS is required in a guest browser.
const images = new Map();
for (const block of source['menu-images-lite.js'].split('(function(){')) {
  const data = block.match(/const d='data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)'/);
  const key = block.match(/data-menu-img=\\?"([^"\\]+)\\?"/);
  if (!data && !key) continue;
  assert(data && key, 'Incomplete photo block');
  assert(/^[a-z0-9-]+$/.test(key[1]) && !images.has(key[1]), 'Invalid or duplicated photo key');
  const bytes = Buffer.from(data[2], 'base64');
  assert(bytes.length > 100, `Missing photo: ${key[1]}`);
  if (data[1] === 'webp') assert(bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP', `Corrupt photo: ${key[1]}`);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12);
  images.set(key[1], {bytes, file: `assets/menu/${key[1]}.${hash}.${data[1]}`});
}
assert.equal(images.size, 51, 'All 51 approved photos must be present');
let menu = source['menu.html'];
let attached = 0;
menu = menu.replace(/<img\b[^>]*>/g, tag => {
  const key = tag.match(/data-menu-img="([^"]+)"/);
  assert(key && images.has(key[1]), 'Dish has no matching approved photo');
  attached++;
  const src = images.get(key[1]).file;
  return tag.replace(/\s+src="[^"]*"/, ` src="${src}"`).replace(/\s+loading="[^"]*"/, '').replace(/\/>$/, ' loading="lazy" decoding="async"/>');
});
assert.equal(attached, 51, 'Menu/photo count mismatch');
menu = menu.replace(/<script\b[^>]*src="\/?menu-images(?:-lite)?\.js"[^>]*><\/script>/g, '');
assert(!menu.includes('menu-images'), 'Unresolved photo script');
menu = menu.replaceAll('href="/"', 'href="index.html"').replaceAll('href="/#reserve"', 'href="index.html#reserve"');

let index = source['index.html'];
index = index.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>/g, '');
for (const name of ['menu.html', 'staff.html', 'guest-core.js', 'guest-live.js']) {
  index = index.replaceAll(`"/${name}"`, `"${name}"`).replaceAll(`'/${name}'`, `'${name}'`);
}
const oldContact = "const email=guestType==='outside'?outsideEmail:'',contact=guestType==='hotel'?hotelContact:outsidePhone";
assert(source['guest-live.js'].includes(oldContact), 'Guest form changed; review email patch');
const live = source['guest-live.js'].replace(oldContact, "const hotelEmail=/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(hotelContact),email=guestType==='outside'?outsideEmail:(hotelEmail?hotelContact:''),contact=guestType==='hotel'?(hotelEmail?'':hotelContact):outsidePhone");
const dateFn = "function today(){return new Date().toISOString().slice(0,10)}";
assert(source['guest-core.js'].includes(dateFn), 'Review restaurant date patch');
const core = source['guest-core.js'].replace(dateFn, "function today(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=k=>p.find(x=>x.type===k).value;return g('year')+'-'+g('month')+'-'+g('day')}");
let staff = source['staff.html'].replace('supabase-js@2"','supabase-js@2.57.4"').replace('src="/staff.js"','src="staff.js"').replace('href="/"','href="index.html"');
const fix = fs.readFileSync(path.join(root, 'scripts/reliability.js'), 'utf8');
new vm.Script(fix, {filename: 'reliability.js'});
index = index.replace('</body>', '<script src="reliability.js"></script>\n</body>');
const revision = /^[a-f0-9]{40}$/i.test(process.env.VERCEL_GIT_COMMIT_SHA||'') ? process.env.VERCEL_GIT_COMMIT_SHA : 'local-verification';
const stamp = s => s.replace('</head>', `<meta name="sushi-build" content="${revision}"></head>`);
const output = {'index.html':stamp(index),'menu.html':stamp(menu),'guest-core.js':core,'guest-live.js':live,'staff.html':stamp(staff),'staff.js':source['staff.js'],'reliability.js':fix};
for (const [name, text] of Object.entries(output)) {
  if (name.endsWith('.js')) new vm.Script(text, {filename:name});
  if (name.endsWith('.html')) for (const m of text.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (!/\bsrc=/.test(m[1]||'')) new vm.Script(m[2],{filename:name+' inline'});
}
fs.mkdirSync(out, {recursive:true});
fs.mkdirSync(path.join(out, 'assets/menu'), {recursive:true});
fs.mkdirSync(path.join(out, 'assets'), {recursive:true});
const introHero = path.join(root, 'assets', 'sushi-intro-approved.webp');
assert(fs.existsSync(introHero), 'Missing Sushi Club intro hero');
fs.copyFileSync(introHero, path.join(out, 'assets', 'sushi-intro-approved.webp'));
for (const [name,text] of Object.entries(output)) fs.writeFileSync(path.join(out,name),text);
for (const staticName of ['staff-manifest.webmanifest','staff-sw.js','staff-icon.svg']) {
  const src = path.join(root, staticName);
  assert(fs.existsSync(src), `Missing staff app asset: ${staticName}`);
  fs.copyFileSync(src, path.join(out, staticName));
}
for (const {file,bytes} of images.values()) fs.writeFileSync(path.join(out,file),bytes);
const report = {revision, menuSource:'approved v13.49',dishCount:51,photoCount:images.size,files:Object.entries(output).map(([name,text])=>({name,bytes:Buffer.byteLength(text),sha256:crypto.createHash('sha256').update(text).digest('hex')}))};
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({ok:true, dishes:51,photos:images.size,output:'dist',revision}));
