import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const TIMES=Array.from({length:21},(_,i)=>`${17+Math.floor(i/4)}:${String(i%4*15).padStart(2,'0')}`);
const HEADERS={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const db=createClient(Deno.env.get('SUPABASE_URL'),keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
class Problem extends Error { constructor(code,status=400){super(code);this.status=status;this.code=code;} }
const fail=(code,status=400)=>{throw new Problem(code,status)};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const norm=v=>String(v||'').toLowerCase().replace(/[\s()+-]/g,'');
const clean=(v,max)=>{const s=String(v??'').trim();if(s.length>max)fail('invalid_input');return s;};
const sha=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24))).map(x=>x.toString(16).padStart(2,'0')).join('');
const code=()=>`SC-${String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0')}`;
function localNow(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const g=k=>p.find(x=>x.type===k).value;return {date:`${g('year')}-${g('month')}-${g('day')}`,time:`${g('hour')}:${g('minute')}`};}
function validateDate(v){const s=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))fail('invalid_date');const d=new Date(s+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)fail('invalid_date');return s;}
function party(v){const n=Number(v);if(!Number.isInteger(n)||n<1||n>20)fail('invalid_party_size');return n;}
function future(date,time){const now=localNow();if(date<now.date||(date===now.date&&time<=now.time))fail('time_in_past');}
function publicRow(r){return r?{id:r.id,requestId:r.reservation_code,date:r.reservation_date,time:String(r.reservation_time).slice(0,5),guests:r.party_size,originalGuests:r.original_party_size,name:r.lead_guest_name,guestType:r.guest_type,room:r.room_number||'',contact:r.phone||'',email:r.email||'',request:r.special_request||'',status:r.status,createdAt:r.created_at,holdUntil:r.arrival_hold_until||null}:null;}
function input(b,r=null){
 const date=validateDate(b.date??r?.reservation_date),time=String(b.time??String(r?.reservation_time||'').slice(0,5)),guests=party(b.guests??r?.party_size),name=clean(b.name??r?.lead_guest_name,120);
 if(!name||!TIMES.includes(time))fail('invalid_input');future(date,time);
 const guestType=r?.guest_type||(b.guestType==='outside'?'outside':'hotel');
 const room=guestType==='hotel'?clean(b.room??r?.room_number,20):'';
 let contact=clean(b.contact??r?.phone,254),email=clean(b.email??r?.email,254).toLowerCase();
 if(!email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)){email=contact.toLowerCase();contact='';}
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('invalid_email');
 if(contact&&!/^\+?[\d\s().-]{6,40}$/.test(contact))fail('invalid_phone');
 if(guestType==='hotel'&&!room)fail('room_required');
 if(guestType==='outside'&&!contact&&!email)fail('contact_required');
 return {date,time,guests,name,guestType,room,contact,email,request:clean(b.request??r?.special_request,2000)};
}
async function inventory(date,excludeId=null){
 let a=db.from('table_assignments').select('table_id,service_time').eq('service_date',date).eq('occupied',true);
 if(excludeId!==null)a=a.neq('reservation_id',excludeId);
 const results=await Promise.all([
   db.from('restaurant_tables').select('id,seats').eq('active',true),
   a,
   db.from('blocked_slots').select('reservation_time').eq('reservation_date',date).eq('active',true)
 ]);
 for(const r of results)if(r.error)throw r.error;
 const occupiedByTime=new Map();
 for(const x of results[1].data||[]){
   const time=String(x.service_time||'').slice(0,5);
   if(!occupiedByTime.has(time))occupiedByTime.set(time,new Set());
   occupiedByTime.get(time).add(String(x.table_id));
 }
 return {
   tables:results[0].data||[],
   occupiedByTime,
   blocked:new Set((results[2].data||[]).map(x=>String(x.reservation_time).slice(0,5)))
 };
}
function hasCapacity(inv,n,time){
 const occupied=inv.occupiedByTime.get(time)||new Set();
 return inv.tables.filter(t=>!occupied.has(String(t.id))).reduce((s,t)=>s+Number(t.seats),0)>=n;
}
async function available(date,time,n,excludeId=null){
 const inv=await inventory(date,excludeId);
 if(inv.blocked.has(time)||!hasCapacity(inv,n,time))fail('unavailable',409);
}
async function byToken(c,t){
 c=clean(c,40).toUpperCase();t=clean(t,256);
 if(!/^SC-\d{6}$/.test(c)||!t)fail('not_found',404);
 const {data,error}=await db.from('reservations').select('*').eq('reservation_code',c).eq('manage_token_hash',await sha(t)).maybeSingle();
 if(error)throw error;if(!data)fail('not_found',404);return data;
}
async function rate(key,limit){const {data,error}=await db.rpc('sushi_check_rate',{p_key:key,p_limit:limit});if(error)throw error;if(data!==true)fail('too_many_requests',429);}
async function identityRow(c,identity){
 c=clean(c,40).toUpperCase();identity=norm(clean(identity,254));
 if(!/^SC-\d{6}$/.test(c)||!identity)fail('not_found',404);
 await rate('claim:'+await sha(c),10);
 const {data,error}=await db.from('reservations').select('*').eq('reservation_code',c).maybeSingle();
 if(error)throw error;
 if(!data||![data.room_number,data.phone,data.email].map(norm).filter(Boolean).includes(identity))fail('not_found',404);
 return data;
}
async function patch(r,values){const {data,error}=await db.from('reservations').update(values).eq('id',r.id).eq('updated_at',r.updated_at).select('*').maybeSingle();if(error)throw error;if(!data)fail('reservation_changed',409);return data;}
async function audit(r,action,oldStatus,details={}){const {error}=await db.from('reservation_audit').insert({reservation_id:r.id,action,old_status:oldStatus,new_status:r.status,details});if(error)console.error('audit_write_failed',error.code);}
const manageable=r=>{if(!['pending','confirmed','reconfirmed'].includes(r.status))fail('not_manageable',409);};

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:HEADERS});
 try{
  if(!['GET','POST'].includes(req.method))return json({ok:false,error:'method_not_allowed'},405);
  const url=new URL(req.url);
  if(req.method==='GET'){
   const action=url.searchParams.get('action');
   if(action==='health')return json({ok:true,version:'5',capacityMode:'time_slot_release',timezone:'Europe/Istanbul'});
   if(action==='availability'){
    const date=validateDate(url.searchParams.get('date')),n=party(url.searchParams.get('party')||1),inv=await inventory(date),now=localNow();
    return json({ok:true,capacityMode:'time_slot_release',slots:TIMES.map(time=>({time,available:date>=now.date&&!(date===now.date&&time<=now.time)&&!inv.blocked.has(time)&&hasCapacity(inv,n,time)}))});
   }
   if(action==='get')return json({ok:true,reservation:publicRow(await byToken(url.searchParams.get('code'),url.searchParams.get('token')))});
   if(action==='lookup')return json({ok:true,reservation:publicRow(await identityRow(url.searchParams.get('code'),url.searchParams.get('identity')))});
   fail('not_found',404);
  }
  if(!(req.headers.get('content-type')||'').toLowerCase().includes('application/json'))fail('json_required',415);
  const text=await req.text();if(text.length>16384)fail('request_too_large',413);
  let b;try{b=JSON.parse(text);}catch{fail('invalid_json');}
  if(!b||typeof b!=='object'||Array.isArray(b))fail('invalid_input');
  const ip=(req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  await rate('write:'+await sha(ip),100);
  if(b.action==='create'){
   const x=input(b);
   if(b.rulesAccepted===false||String(b.rulesVersion||'')!=='1.0')fail('rules_required');
   await available(x.date,x.time,x.guests);
   const manageToken=token(),manageHash=await sha(manageToken);
   for(let attempt=0;attempt<4;attempt++){
    const reservationCode=code();
    const {data,error}=await db.from('reservations').insert({reservation_code:reservationCode,request_id:reservationCode,manage_token_hash:manageHash,reservation_date:x.date,reservation_time:x.time+':00',party_size:x.guests,original_party_size:x.guests,lead_guest_name:x.name,guest_type:x.guestType,room_number:x.room||null,phone:x.contact||null,email:x.email||null,special_request:x.request||null,status:'pending',source:'guest',rules_accepted:true,rules_accepted_at:new Date().toISOString(),rules_version:'1.0'}).select('*').single();
    if(error){if(error.code==='23505'&&String(error.message).includes('reservation_code'))continue;if(error.code==='23505')fail('duplicate',409);throw error;}
    await audit(data,'CREATED',null,{source:'guest'});return json({ok:true,reservation:publicRow(data),manageToken},201);
   }
   fail('try_again',503);
  }
  if(b.action==='claim'){
   const r=await identityRow(b.code,b.identity),manageToken=token();
   const updated=await patch(r,{manage_token_hash:await sha(manageToken)});await audit(updated,'GUEST_CLAIM',r.status);
   return json({ok:true,reservation:publicRow(updated),manageToken});
  }
  if(b.action==='cancel'){
   const r=await byToken(b.code,b.token);manageable(r);
   const updated=await patch(r,{status:'cancelled',cancelled_at:new Date().toISOString()});await audit(updated,'GUEST_CANCELLATION',r.status);
   return json({ok:true,reservation:publicRow(updated)});
  }
  if(b.action==='update'){
   const r=await byToken(b.code,b.token);manageable(r);const x=input(b,r);
   const changed=x.date!==r.reservation_date||x.time!==String(r.reservation_time).slice(0,5)||x.guests!==r.party_size;
   if(changed)await available(x.date,x.time,x.guests,r.id);
   const updated=await patch(r,{reservation_date:x.date,reservation_time:x.time+':00',party_size:x.guests,lead_guest_name:x.name,room_number:x.room||null,phone:x.contact||null,email:x.email||null,special_request:x.request||null,status:changed?'pending':r.status});
   await audit(updated,'GUEST_EDIT',r.status,{changed_capacity:changed});return json({ok:true,reservation:publicRow(updated)});
  }
  fail('not_found',404);
 }catch(e){
  if(e instanceof Problem)return json({ok:false,error:e.code},e.status);
  if(e?.code==='23505')return json({ok:false,error:'duplicate'},409);
  const message=String(e?.message||'');
  if(/TABLE_|NO_FREE_TABLES|INSUFFICIENT_TABLE_SEATS|SLOT_BLOCKED/.test(message))return json({ok:false,error:'unavailable'},409);
  if(/RESERVATION_CLOSED|RESERVATION_ALREADY_SEATED/.test(message))return json({ok:false,error:'not_manageable'},409);
  console.error('guest_request_failed',e?.code||'unknown');return json({ok:false,error:'service_unavailable'},503);
 }
});
