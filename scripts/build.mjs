import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root=process.cwd();
const out=path.join(root,'dist');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const guest=read('generic-guest.html');
let staff=read('staff.html');
const staffJs=read('staff.js');
const config={
  supabaseUrl:process.env.SUPABASE_URL||'',
  supabasePublishableKey:process.env.SUPABASE_PUBLISHABLE_KEY||''
};
assert(config.supabaseUrl.startsWith('https://'),'SUPABASE_URL is required');
assert(config.supabasePublishableKey.length>10,'SUPABASE_PUBLISHABLE_KEY is required');
assert(!/sb_secret_[A-Za-z0-9_-]+/.test(config.supabasePublishableKey),'A secret key cannot be used in the browser');

function checkHtml(name,html){
  assert(/<body[\s>]/i.test(html)&&/<\/body>\s*<\/html>\s*$/i.test(html),name+': incomplete HTML');
  for(const match of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)){
    if(!/\bsrc=/.test(match[1]||''))new vm.Script(match[2],{filename:name+' inline'});
  }
}
checkHtml('generic-guest.html',guest);
checkHtml('staff.html',staff);
new vm.Script(staffJs,{filename:'staff.js'});

staff=staff
  .replaceAll('Sushi Staff','Restaurant Staff')
  .replaceAll('Sushi Club Staff','Restaurant Staff')
  .replaceAll('href="/staff-manifest.webmanifest"','href="/staff-manifest.webmanifest"')
  .replaceAll('content="Sushi Staff"','content="Restaurant Staff"');

const manifest={
  name:'Restaurant Staff',
  short_name:'Staff',
  description:'Restaurant reservations and table management.',
  start_url:'/staff',
  scope:'/',
  display:'standalone',
  background_color:'#f3ebe4',
  theme_color:'#efe4da',
  icons:[{src:'/staff-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]
};
const icon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#191714"/><circle cx="256" cy="256" r="174" fill="none" stroke="#c8aa7b" stroke-width="10"/><text x="256" y="290" text-anchor="middle" fill="#fffdf9" font-family="Arial,sans-serif" font-size="104" font-weight="700" letter-spacing="4">RS</text></svg>';
const sw=`const CACHE_NAME='restaurant-staff-v1';
const APP_SHELL=['/staff','/staff.html','/staff.js','/platform-config.js','/staff-manifest.webmanifest','/staff-icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy)).catch(()=>{});return response;}).catch(()=>caches.match(event.request)));});
`;
const platformConfig='window.PLATFORM_CONFIG = '+JSON.stringify(config)+';';
const files={
  'index.html':guest,
  'staff.html':staff,
  'staff.js':staffJs,
  'platform-config.js':platformConfig,
  'staff-manifest.webmanifest':JSON.stringify(manifest,null,2),
  'staff-icon.svg':icon,
  'staff-sw.js':sw
};
for(const [name,content] of Object.entries(files)){
  if(name.endsWith('.js'))new vm.Script(content,{filename:name});
  assert(!/sushiclub|delta hotels|sushiclara/i.test(content),name+': legacy brand reference');
}
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const [name,content] of Object.entries(files))fs.writeFileSync(path.join(out,name),content);
fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({
  product:'generic-restaurant-booking-platform',
  generatedAt:new Date().toISOString(),
  files:Object.entries(files).map(([name,content])=>({name,bytes:Buffer.byteLength(content),sha256:crypto.createHash('sha256').update(content).digest('hex')}))
},null,2));
console.log(JSON.stringify({ok:true,output:'dist',files:Object.keys(files)}));
