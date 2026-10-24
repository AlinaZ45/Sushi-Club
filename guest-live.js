(function(){
const API='https://fkztipofuahmxenisayd.supabase.co/functions/v1/guest-reservations';
function restaurantSlug(){const v=new URLSearchParams(location.search).get('restaurant')||'my-restaurant';return /^[a-z0-9][a-z0-9-]{1,48}$/.test(v)?v:'my-restaurant'}
let remoteReservations=[];
function refs(){try{return JSON.parse(localStorage.getItem('sushiClubRemoteRefs')||'[]')}catch(e){return[]}}
function saveRefs(v){localStorage.setItem('sushiClubRemoteRefs',JSON.stringify(v.slice(0,20)))}
function addRef(code,token){const a=refs().filter(x=>x.code!==code);a.unshift({code,token});saveRefs(a)}
async function apiGet(params){const u=new URL(API);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));if(params.action==='availability')u.searchParams.set('restaurant',restaurantSlug());const r=await fetch(u);const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'Request failed'),{code:j.error,status:r.status,data:j});return j}
async function apiPost(body){const payload=body.action==='create'?Object.assign({},body,{restaurantSlug:restaurantSlug()}):body;const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'Request failed'),{code:j.error,status:r.status,data:j});return j}
function errText(e){if(e&&e.code==='unavailable')return msg('unavailable');if(e&&e.code==='duplicate')return msg('duplicate');if(e&&e.code==='contact_required')return msg('enterOutsideContact');return msg('genericError')}
async function refreshRemoteMyReservations(){const out=[];for(const x of refs()){try{const j=await apiGet({action:'get',code:x.code,token:x.token});if(j.reservation){j.reservation._token=x.token;out.push(j.reservation)}}catch(e){}}remoteReservations=out;renderMyReservations();refreshMyHome();}
window.myReservations=function(){return remoteReservations.slice().sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))};
window.rememberMyReservation=function(){};
window.renderGuestTimes=async function(){const date=document.getElementById('rdate').value||today();const party=Number(document.getElementById('guests').value||1);let slots=[];try{const availability=await apiGet({action:'availability',date,party});slots=availability.slots||[];if(availability.restaurant?.name){const title=document.querySelector('.future-home-kicker');if(title)title.textContent=availability.restaurant.name;document.title=availability.restaurant.name+' · Reservations'}}catch(e){}let first=null;document.querySelectorAll('#reserveTimes .time').forEach(b=>{const s=slots.find(x=>x.time===b.innerText);const unavailable=s?!s.available:false;b.disabled=unavailable;b.style.opacity=unavailable?'.35':'1';b.style.cursor=unavailable?'not-allowed':'pointer';if(unavailable)b.classList.remove('active');if(!unavailable&&!first)first=b});if(!document.querySelector('#reserveTimes .time.active')&&first)first.classList.add('active');syncSelectedTime()};
window.confirmReservation=async function(){const rules=document.getElementById('v13RulesAck');if(!rules||!rules.checked)return alert(msg('agreePolicy'));const name=document.getElementById('rname').value.trim(),date=document.getElementById('rdate').value,guests=Number(document.getElementById('guests').value),active=document.querySelector('#reserveTimes .time.active:not(:disabled)');const room=guestType==='hotel'?document.getElementById('rroom').value.trim():'';const hotelContact=document.getElementById('hotelContact').value.trim(),outsidePhone=document.getElementById('outsidePhone').value.trim(),outsideEmail=document.getElementById('outsideEmail').value.trim();const email=guestType==='outside'?outsideEmail:'',contact=guestType==='hotel'?hotelContact:outsidePhone,request=document.getElementById('rrequest').value.trim();if(!name||!date||!guests||guests<1||!active)return alert(msg('mainRequired'));if(guestType==='hotel'&&!room)return alert(msg('enterRoom'));if(!contact&&!email)return alert(msg('enterOutsideContact'));if(contact&&!( /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)||/^\+?[\d\s().-]{6,40}$/.test(contact)))return alert('Please enter a valid WhatsApp number or email address.');if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return alert('Please enter a valid email address.');try{const j=await apiPost({action:'create',name,date,time:active.innerText,guests,guestType,room,contact,email,request,message:(document.getElementById('reservationMessage')?.value||'').trim(),rulesVersion:'1.0'});addRef(j.reservation.requestId,j.manageToken);j.reservation._token=j.manageToken;remoteReservations.unshift(j.reservation);refreshMyHome();document.getElementById('successTitle').innerText=msg('sentTitle');document.getElementById('successText').innerText=msg('sentText');const r=j.reservation;document.getElementById('summary').innerHTML='<b>'+escapeHtml(msg('request'))+' '+escapeHtml(r.requestId)+'</b><br><br><b>'+escapeHtml(msg('leadGuest'))+':</b> '+escapeHtml(r.name)+'<br><b>'+escapeHtml(msg('dateTime'))+':</b> '+r.date+' · '+r.time+'<br><b>'+escapeHtml(msg('partySize'))+':</b> '+r.guests+' '+escapeHtml(guestWord(r.guests))+(r.room?'<br><b>'+escapeHtml(msg('room'))+':</b> '+escapeHtml(r.room):'')+(r.contact?'<br><b>'+escapeHtml(r.contact.includes('@')?'Email':'WhatsApp')+':</b> '+escapeHtml(r.contact):'')+(r.email?'<br><b>Email:</b> '+escapeHtml(r.email):'');show('success')}catch(e){alert(errText(e));await renderGuestTimes()}};
const CHAT_COPY={
 en:['Messages with Sushi Club','Write a message','SEND','Guest','Sushi Club','New reply','Message sent','Unable to send. Please try again.'],
 tr:['Sushi Club ile Mesajlar','Mesaj yazın','GÖNDER','Misafir','Sushi Club','Yeni yanıt','Mesaj gönderildi','Mesaj gönderilemedi. Tekrar deneyin.'],
 ru:['Сообщения с Sushi Club','Напишите сообщение','ОТПРАВИТЬ','Гость','Sushi Club','Новый ответ','Сообщение отправлено','Ошибка отправки. Попробуйте снова.'],
 de:['Nachrichten mit Sushi Club','Nachricht schreiben','SENDEN','Gast','Sushi Club','Neue Antwort','Nachricht gesendet','Bitte erneut versuchen.'],
 fr:['Messages avec Sushi Club','Écrivez un message','ENVOYER','Client','Sushi Club','Nouvelle réponse','Message envoyé','Veuillez réessayer.'],
 zh:['与 Sushi Club 的消息','输入消息','发送','客人','Sushi Club','新回复','消息已发送','发送失败，请重试。']
};
function cc(i){return (CHAT_COPY[typeof currentLanguage==='string'?currentLanguage:'en']||CHAT_COPY.en)[i]}
const expandedChats=new Set();
function chatMarkup(r){
 const id=Number(r.id),msgs=Array.isArray(r.messages)?r.messages:[];
 const opened=expandedChats.has(id);
 const unseen=msgs.filter(m=>m.sender==='staff'&&Number(m.id)>Number(localStorage.getItem('sushiChatRead:'+r.requestId)||0)).length;
 const inner=msgs.map(m=>'<div style="margin:8px 0;padding:11px 13px;border-radius:13px;background:'+(m.sender==='staff'?'#e8ddd0':'#f9f3ed')+';overflow-wrap:anywhere"><b>'+escapeHtml(m.sender==='staff'?cc(4):cc(3))+'</b><div style="white-space:pre-wrap;margin-top:5px">'+escapeHtml(m.body)+'</div></div>').join('');
 return '<div class="reservation-chat" style="margin-top:14px;border-top:1px solid #d9c9bc;padding-top:12px"><button type="button" style="width:100%;padding:12px;border-radius:12px;background:#eee0d2;color:#57483e;border:0;font-weight:600" onclick="toggleReservationChat('+id+')">'+escapeHtml(cc(0))+(unseen?' · '+unseen+' '+escapeHtml(cc(5)):'')+'</button>'+(opened?'<div class="chat-thread" style="margin-top:10px">'+(inner||'<p class="smallnote">—</p>')+'</div><textarea id="guestChatInput-'+id+'" maxlength="2000" rows="3" style="margin-top:10px;width:100%;box-sizing:border-box;border-radius:12px;padding:12px" placeholder="'+escapeHtml(cc(1))+'"></textarea><button type="button" class="btn dark" onclick="sendReservationChat('+id+')" style="margin-top:8px">'+escapeHtml(cc(2))+'</button>':'')+'</div>';
}
window.reservationChatMarkup=chatMarkup;
window.toggleReservationChat=function(id){if(expandedChats.has(id))expandedChats.delete(id);else expandedChats.add(id);const r=remoteReservations.find(x=>Number(x.id)===Number(id));if(r&&expandedChats.has(id)){const n=(r.messages||[]).filter(x=>x.sender==='staff').at(-1);if(n)localStorage.setItem('sushiChatRead:'+r.requestId,n.id)}renderMyReservations()};
window.sendReservationChat=async function(id){const r=remoteReservations.find(x=>Number(x.id)===Number(id)),input=document.getElementById('guestChatInput-'+id);if(!r||!input)return;const message=input.value.trim();if(!message)return;input.disabled=true;try{const ref=refs().find(x=>x.code===r.requestId);const result=await apiPost({action:'guest_message',code:r.requestId,token:ref?.token,message});r.messages=r.messages||[];r.messages.push(result.message);renderMyReservations()}catch(e){input.disabled=false;alert(cc(7))}};

window.cancelMyReservation=async function(id){const r=remoteReservations.find(x=>Number(x.id)===Number(id));if(!r||!isManageable(r))return alert(msg('cannotCancel'));if(!confirm(msg('confirmCancel')))return;try{const x=refs().find(z=>z.code===r.requestId);await apiPost({action:'cancel',code:r.requestId,token:x&&x.token});await refreshRemoteMyReservations();await renderGuestTimes()}catch(e){alert(errText(e))}};
window.editMyReservation=function(id){const r=remoteReservations.find(x=>Number(x.id)===Number(id));if(!r||!isManageable(r))return alert(msg('cannotEdit'));guestEditingId=Number(id);document.getElementById('guestEditRef').textContent=(r.requestId||msg('reservation'))+' · '+msg('currentStatus')+': '+statusText(r.status);document.getElementById('geDate').value=r.date||today();document.getElementById('geDate').min=today();document.getElementById('geTime').innerHTML=TIMES.map(t=>'<option value="'+t+'" '+(t===r.time?'selected':'')+'>'+t+'</option>').join('');document.getElementById('geGuests').value=r.guests||1;document.getElementById('geName').value=r.name||'';document.getElementById('geRoom').value=r.room||'';document.getElementById('gePhone').value=r.contact||'';document.getElementById('geEmail').value=r.email||'';document.getElementById('geRequest').value=r.request||'';document.getElementById('guestEditOverlay').style.display='flex'};
window.saveGuestEdit=async function(){const r=remoteReservations.find(x=>Number(x.id)===Number(guestEditingId));if(!r)return;const body={action:'update',code:r.requestId,token:(refs().find(z=>z.code===r.requestId)||{}).token,date:document.getElementById('geDate').value,time:document.getElementById('geTime').value,guests:Number(document.getElementById('geGuests').value),name:document.getElementById('geName').value.trim(),room:document.getElementById('geRoom').value.trim(),contact:document.getElementById('gePhone').value.trim(),email:document.getElementById('geEmail').value.trim(),request:document.getElementById('geRequest').value.trim()};try{await apiPost(body);closeGuestEdit();await refreshRemoteMyReservations();await renderGuestTimes();alert(msg('editUpdated'))}catch(e){alert(errText(e))}};
window.findReservation=async function(){const ref=document.getElementById('findRef').value.trim().toUpperCase(),identity=document.getElementById('findIdentity').value.trim(),result=document.getElementById('findResult');try{const j=await apiPost({action:'claim',code:ref,identity});addRef(ref,j.manageToken);j.reservation._token=j.manageToken;await refreshRemoteMyReservations();result.innerHTML=bookingCard(j.reservation,true);refreshMyHome()}catch(e){result.innerHTML='<div class="smallnote">'+escapeHtml(e.code==='identity_mismatch'?msg('detailsMismatch'):msg('notFound'))+'</div>'}};

async function handleReservationDeepLink(){
  const params=new URLSearchParams(location.search);
  const code=(params.get('reservation')||'').trim().toUpperCase();
  const view=params.get('view')||'';
  if(!/^SC-\d{6}$/.test(code) && view!=='myReservations')return;
  if(typeof window.show==='function')window.show('myReservations');
  const ref=document.getElementById('findRef');
  if(ref&&/^SC-\d{6}$/.test(code))ref.value=code;
  await refreshRemoteMyReservations();
  if(/^SC-\d{6}$/.test(code)){
    const known=refs().some(x=>x.code===code);
    if(!known){
      const identity=document.getElementById('findIdentity');
      if(identity)identity.focus({preventScroll:true});
      const find=document.getElementById('findResult');
      if(find)find.innerHTML='<div class="smallnote">'+escapeHtml(msg('bookingReadyVerify',{code}))+'</div>';
    }
  }
}
window.refreshGuestLiveLanguage=function(){
  if(typeof renderMyReservations==='function')renderMyReservations();
  if(typeof refreshMyHome==='function')refreshMyHome();
  const params=new URLSearchParams(location.search);
  const code=(params.get('reservation')||'').trim().toUpperCase();
  const find=document.getElementById('findResult');
  const known=refs().some(x=>x.code===code);
  if(find&&/^SC-\d{6}$/.test(code)&&!known){
    find.innerHTML='<div class="smallnote">'+escapeHtml(msg('bookingReadyVerify',{code}))+'</div>';
  }
};
const oldShow=window.show;
window.show=function(id){oldShow(id);if(id==='myReservations')refreshRemoteMyReservations();if(id==='reserve')renderGuestTimes();};
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('a[href="menu.html"]').forEach(a=>a.href='menu.html?restaurant='+encodeURIComponent(restaurantSlug()));refreshRemoteMyReservations();renderGuestTimes();handleReservationDeepLink();});
setTimeout(()=>{refreshRemoteMyReservations();renderGuestTimes();handleReservationDeepLink()},300);
})();