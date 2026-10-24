import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = process.cwd();
const out = path.join(root, 'dist');
const names = ['index.html', 'menu.html', 'guest-core.js', 'guest-live.js', 'staff.html', 'staff.js', 'reliability.js'];
const source = Object.fromEntries(names.map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')]));

for (const name of names) {
  assert(source[name].length > 100, `${name}: empty or incomplete source`);
  if (name.endsWith('.html')) {
    assert(/<body[\\s>]/i.test(source[name]) && /<\\/body>\\s*<\\/html>\\s*$/i.test(source[name]), `${name}: incomplete HTML`);
    assert.equal((source[name].match(/<style[\\s>]/gi)||[]).length, (source[name].match(/<\\/style>/gi)||[]).length, `${name}: unclosed stylesheet`);
  } else {
    new vm.Script(source[name], {filename:name});
  }
  assert(!/sb_secret_[A-Za-z0-9_-]+/.test(source[name]), `${name}: private key in client source`);
}

let index = source['index.html'];
let menu = source['menu.html'];
let staff = source['staff.html'];
index = index.replace(/<script src="https:\\/\\/cdn\\.jsdelivr\\.net\\/npm\\/@supabase\\/supabase-js@2"><\\/script>/g, '');
for (const name of ['menu.html','staff.html','guest-core.js','guest-live.js','reliability.js','manifest.webmanifest','staff.js','staff-manifest.webmanifest','staff-icon.svg','staff-sw.js']) {
  index = index.replaceAll(`"/${name}"`, `"${name}"`).replaceAll(`'/${name}'`, `'${name}'`);
}
menu = menu.replaceAll('href="/"','href="index.html"').replaceAll('href="/#reserve"','href="index.html#reserve"');
staff = staff.replace('supabase-js@2"','supabase-js@2.57.4"')
  .replaceAll('src="/staff.js"','src="staff.js"')
  .replaceAll('href="/staff-manifest.webmanifest"','href="staff-manifest.webmanifest"')
  .replaceAll('href="/staff-icon.svg"','href="staff-icon.svg"')
  .replaceAll('href="/"','href="index.html"');
index = index.replace(/<link rel="preload" as="image" href="\\/assets\\/sushi-intro-approved\\.webp">/g, '');
if (!index.includes('src="reliability.js"')) index = index.replace('</body>', '<script src="reliability.js"></script>\\n</body>');

const revision = /^[a-f0-9]{40}$/i.test(process.env.GITHUB_SHA||'') ? process.env.GITHUB_SHA : 'local-verification';
const stamp = html => html.replace('</head>', `<meta name="restaurant-app-build" content="${revision}"></head>`);
const output = {
  'index.html':stamp(index),
  'menu.html':stamp(menu),
  'guest-core.js':source['guest-core.js'],
  'guest-live.js':source['guest-live.js'],
  'staff.html':stamp(staff),
  'staff.js':source['staff.js'],
  'reliability.js':source['reliability.js']
};
for (const [name, content] of Object.entries(output)) {
  if (name.endsWith('.js')) new vm.Script(content,{filename:name});
  if (name.endsWith('.html')) {
    for (const m of content.matchAll(/<script(\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)) {
      if (!/\\bsrc=/.test(m[1]||'')) new vm.Script(m[2],{filename:name+' inline'});
    }
  }
}
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for (const [name,content] of Object.entries(output)) fs.writeFileSync(path.join(out,name),content);
for (const name of ['manifest.webmanifest','staff-manifest.webmanifest','staff-sw.js','staff-icon.svg']) {
  const src=path.join(root,name);
  assert(fs.existsSync(src), `Missing app asset: ${name}`);
  fs.copyFileSync(src,path.join(out,name));
}
const report = {
  revision,
  product:'Restaurant App',
  tenantAware:true,
  menuMode:'database',
  dishCount:0,
  photoCount:0,
  files:Object.entries(output).map(([name,content])=>({name,bytes:Buffer.byteLength(content),sha256:crypto.createHash('sha256').update(content).digest('hex')}))
};
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({ok:true,tenantAware:true,menuMode:'database',files:Object.keys(output).length,revision}));
