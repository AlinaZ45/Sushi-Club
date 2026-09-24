(function(){
const SB_URL='https://poxuyzcaejbqouelzwob.supabase.co';
const SB_KEY='sb_publishable_0Mo43IoJgWOu-7_Vps-BEw_e64ucHKI';
const GUEST_API=SB_URL+'/functions/v1/guest-reservations';
const sb=window.supabase.createClient(SB_URL,SB_KEY);
const TIMES=[];for(let h=17;h<=22;h++){for(const m of [0,15,30,45]){if(h===22&&m>0)continue;TIMES.push(String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'))}}
const ACTIVE_FOR_TABLES=['pending','confirmed','reconfirmed','seated'];
const ACTIVE_FOR_CAPACITY=['confirmed','reconfirmed','seated'];
let rows=[],blocked=[],tables=[],allTables=[],assignments=[];
let assigningId=null;
let selectedTables=new Set();
const $=id=>document.getElementById(id);
let staffLang=localStorage.getItem('sushiStaffLang')||'en';
const I18N={
 en:{
  staffApp:'Staff App',headerSubtitle:'Reservations, table plan and live availability.',backGuest:'← Back to Guest App',staffEyebrow:'SUSHI CLUB STAFF',welcomeBack:'Welcome back',signInSub:'Sign in to manage reservations, tables and live availability.',email:'E-MAIL',password:'PASSWORD',signIn:'SIGN IN',showPassword:'SHOW',hidePassword:'HIDE',invalidCredentials:'Incorrect e-mail or password.',forgotPassword:'FORGOT PASSWORD?',firstSetup:'FIRST-TIME SETUP',signedIn:'SIGNED IN',security:'SECURITY',signOut:'SIGN OUT',date:'DATE',time:'TIME',status:'STATUS',all:'All',pending:'Pending',confirmed:'Confirmed',reconfirmed:'Reconfirmed',seated:'Seated',completed:'Completed',noShow:'No-show',declined:'Declined',cancelled:'Cancelled',total:'Total',guests:'Guests',reservations:'RESERVATIONS',tables:'TABLES',availability:'AVAILABILITY',free:'Free',assigned:'Assigned',addTable:'ADD TABLE',tableCode:'TABLE CODE',area:'AREA',seats:'SEATS',inside:'Inside',terrace:'Terrace',manageTables:'MANAGE TABLES',manageNote:'Edit table code, area or seats. A table can be temporarily disabled without deleting its history.',accountRecovery:'ACCOUNT RECOVERY',resetPassword:'Reset password',resetHelp:'Enter your approved staff e-mail. We will send a secure password-reset link.',sendResetLink:'SEND RESET LINK',accountSecurity:'ACCOUNT SECURITY',changePassword:'Change password',changePasswordHelp:'Confirm your current password, then choose a new one.',recoveryPasswordHelp:'Choose a new password for your staff account.',currentPassword:'CURRENT PASSWORD',newPassword:'NEW PASSWORD',confirmNewPassword:'CONFIRM NEW PASSWORD',updatePassword:'UPDATE PASSWORD',securityNote:'Use at least 8 characters. Do not share staff passwords between personal accounts.',tableAssignment:'TABLE ASSIGNMENT',assignTables:'Assign tables',autoSelect:'AUTO SELECT',saveTables:'SAVE TABLES',clearAssignment:'CLEAR ASSIGNMENT',allTimes:'All times',notAssigned:'Not assigned',confirm:'CONFIRM',decline:'DECLINE',noShowBtn:'NO-SHOW',complete:'COMPLETE',room:'Room',table:'Table',selectTime:'Select a time',slotBlocked:'Slot blocked',available:'Available',chooseTime:'Choose a time above to see the live table plan.',blockedNew:'{time} is blocked for new reservations.',closedNew:'Closed for new reservations',confirmedGuests:'{confirmed} / {capacity} confirmed guests · {tables} tables assigned',open:'OPEN',block:'BLOCK',usedBy:'Used by {name}',selected:'Selected',seatsSelected:'{seats} seats selected',forGuests:'for {guests} guest(s)',capacityOk:'capacity OK',selectMoreSeats:'select more seats',noReservations:'No reservations in this view.',guestCount:'{n} guest(s)',seatCount:'{n} seats',active:'Active',inactive:'Inactive',save:'SAVE',activate:'ACTIVATE',disable:'DISABLE',delete:'DELETE',noTables:'No tables configured.',
  signingIn:'Signing in...',inactiveAccount:'This account is not an active Sushi Club staff account.',setupInvalid:'Enter the approved staff e-mail and a password of at least 8 characters.',creatingAccount:'Creating staff account...',notApproved:'Account created, but this e-mail is not approved for Sushi Club staff access.',staffCreated:'Staff account created.',confirmEmail:'Account created. Please confirm the e-mail, then return here and sign in.',signedOut:'Signed out.',enterEmail:'Enter your staff e-mail address.',sendingReset:'Sending reset link...',resetSent:'Reset link sent. Please check your e-mail.',passwordMin:'New password must contain at least 8 characters.',passwordMismatch:'The new passwords do not match.',signAgain:'Please sign in again.',enterCurrent:'Enter your current password.',currentIncorrect:'Current password is incorrect.',updatingPassword:'Updating password...',passwordUpdated:'Password updated successfully.',assignedSeatsError:'Assigned tables do not have enough seats for this reservation.',assignedUsedError:'One of the assigned tables is already used by another confirmed reservation.',slotCapacityError:'This time no longer has enough table capacity. Please choose another time or free a table first.',availabilityError:'Availability could not be verified. Please try again.',noFreeCapacity:'There is not enough free table capacity for this reservation.',selectOneTable:'Select at least one table, or use Clear Assignment.',selectedSeatsError:'Selected tables do not have enough seats for this reservation.',clearPendingOnly:'Confirmed reservations must keep at least one table. Select replacement table(s) and press Save Tables instead.',tableCodeHint:'Use a short table code such as I8 or T10.',invalidAreaSeats:'Enter a valid area and seat count.',tableCodeExists:'This table code already exists.',tableAdded:'Table added.',tableUpdated:'Table updated.',disableHistory:'This table has reservation history. Disable it? Existing history will be kept.',tableActivated:'Table activated.',tableDisabled:'Table disabled.',deleteHistory:'This table has reservation history and cannot be deleted. Use Disable instead.',deleteConfirm:'Delete table {code} permanently?',tableDeleted:'Table deleted.'
 },
 tr:{
  staffApp:'Personel Uygulaması',headerSubtitle:'Rezervasyonlar, masa planı ve anlık müsaitlik.',backGuest:'← Misafir Uygulamasına Dön',staffEyebrow:'SUSHI CLUB PERSONEL',welcomeBack:'Tekrar hoş geldiniz',signInSub:'Rezervasyonları, masaları ve anlık müsaitliği yönetmek için giriş yapın.',email:'E-POSTA',password:'ŞİFRE',signIn:'GİRİŞ YAP',showPassword:'GÖSTER',hidePassword:'GİZLE',invalidCredentials:'E-posta veya şifre hatalı.',forgotPassword:'ŞİFREMİ UNUTTUM',firstSetup:'İLK KURULUM',signedIn:'GİRİŞ YAPILDI',security:'GÜVENLİK',signOut:'ÇIKIŞ YAP',date:'TARİH',time:'SAAT',status:'DURUM',all:'Tümü',pending:'Beklemede',confirmed:'Onaylandı',reconfirmed:'Yeniden Onaylandı',seated:'Masaya Alındı',completed:'Tamamlandı',noShow:'Gelmedi',declined:'Reddedildi',cancelled:'İptal Edildi',total:'Toplam',guests:'Misafir',reservations:'REZERVASYONLAR',tables:'MASALAR',availability:'MÜSAİTLİK',free:'Boş',assigned:'Atanmış',addTable:'MASA EKLE',tableCode:'MASA KODU',area:'ALAN',seats:'KİŞİ',inside:'İç Alan',terrace:'Teras',manageTables:'MASALARI YÖNET',manageNote:'Masa kodunu, alanı veya kişi sayısını düzenleyin. Geçmiş kayıtları silmeden bir masayı geçici olarak devre dışı bırakabilirsiniz.',accountRecovery:'HESAP KURTARMA',resetPassword:'Şifreyi sıfırla',resetHelp:'Onaylı personel e-posta adresinizi girin. Güvenli bir şifre sıfırlama bağlantısı göndereceğiz.',sendResetLink:'SIFIRLAMA BAĞLANTISI GÖNDER',accountSecurity:'HESAP GÜVENLİĞİ',changePassword:'Şifreyi değiştir',changePasswordHelp:'Mevcut şifrenizi doğrulayın, ardından yeni bir şifre seçin.',recoveryPasswordHelp:'Personel hesabınız için yeni bir şifre seçin.',currentPassword:'MEVCUT ŞİFRE',newPassword:'YENİ ŞİFRE',confirmNewPassword:'YENİ ŞİFREYİ ONAYLA',updatePassword:'ŞİFREYİ GÜNCELLE',securityNote:'En az 8 karakter kullanın. Personel şifresini kişisel hesaplar arasında paylaşmayın.',tableAssignment:'MASA ATAMA',assignTables:'Masaları ata',autoSelect:'OTOMATİK SEÇ',saveTables:'MASALARI KAYDET',clearAssignment:'ATAMAYI TEMİZLE',allTimes:'Tüm saatler',notAssigned:'Atanmadı',confirm:'ONAYLA',decline:'REDDET',noShowBtn:'GELMEDİ',complete:'TAMAMLA',room:'Oda',table:'Masa',selectTime:'Bir saat seçin',slotBlocked:'Saat kapalı',available:'Müsait',chooseTime:'Canlı masa planını görmek için yukarıdan bir saat seçin.',blockedNew:'{time} yeni rezervasyonlara kapalı.',closedNew:'Yeni rezervasyonlara kapalı',confirmedGuests:'{confirmed} / {capacity} onaylı misafir · {tables} masa atanmış',open:'AÇ',block:'KAPAT',usedBy:'{name} tarafından kullanılıyor',selected:'Seçildi',seatsSelected:'{seats} kişilik yer seçildi',forGuests:'{guests} misafir için',capacityOk:'kapasite uygun',selectMoreSeats:'daha fazla yer seçin',noReservations:'Bu görünümde rezervasyon yok.',guestCount:'{n} misafir',seatCount:'{n} kişilik',active:'Aktif',inactive:'Pasif',save:'KAYDET',activate:'AKTİF ET',disable:'DEVRE DIŞI',delete:'SİL',noTables:'Tanımlı masa yok.',
  signingIn:'Giriş yapılıyor...',inactiveAccount:'Bu hesap aktif bir Sushi Club personel hesabı değil.',setupInvalid:'Onaylı personel e-posta adresini ve en az 8 karakterli bir şifre girin.',creatingAccount:'Personel hesabı oluşturuluyor...',notApproved:'Hesap oluşturuldu ancak bu e-posta Sushi Club personel erişimi için onaylı değil.',staffCreated:'Personel hesabı oluşturuldu.',confirmEmail:'Hesap oluşturuldu. E-postanızı onayladıktan sonra buraya dönüp giriş yapın.',signedOut:'Çıkış yapıldı.',enterEmail:'Personel e-posta adresinizi girin.',sendingReset:'Sıfırlama bağlantısı gönderiliyor...',resetSent:'Sıfırlama bağlantısı gönderildi. Lütfen e-postanızı kontrol edin.',passwordMin:'Yeni şifre en az 8 karakter olmalıdır.',passwordMismatch:'Yeni şifreler eşleşmiyor.',signAgain:'Lütfen tekrar giriş yapın.',enterCurrent:'Mevcut şifrenizi girin.',currentIncorrect:'Mevcut şifre yanlış.',updatingPassword:'Şifre güncelleniyor...',passwordUpdated:'Şifre başarıyla güncellendi.',assignedSeatsError:'Atanan masalarda bu rezervasyon için yeterli yer yok.',assignedUsedError:'Atanan masalardan biri başka bir onaylı rezervasyon tarafından kullanılıyor.',slotCapacityError:'Bu saatte artık yeterli masa kapasitesi yok. Başka bir saat seçin veya önce bir masayı boşaltın.',availabilityError:'Müsaitlik doğrulanamadı. Lütfen tekrar deneyin.',noFreeCapacity:'Bu rezervasyon için yeterli boş masa kapasitesi yok.',selectOneTable:'En az bir masa seçin veya Atamayı Temizle seçeneğini kullanın.',selectedSeatsError:'Seçilen masalarda bu rezervasyon için yeterli yer yok.',clearPendingOnly:'Onaylı rezervasyonlarda en az bir masa kalmalıdır. Yeni masa(lar) seçip Masaları Kaydet düğmesine basın.',tableCodeHint:'I8 veya T10 gibi kısa bir masa kodu kullanın.',invalidAreaSeats:'Geçerli bir alan ve kişi sayısı girin.',tableCodeExists:'Bu masa kodu zaten mevcut.',tableAdded:'Masa eklendi.',tableUpdated:'Masa güncellendi.',disableHistory:'Bu masanın rezervasyon geçmişi var. Devre dışı bırakılsın mı? Mevcut geçmiş korunacaktır.',tableActivated:'Masa aktif edildi.',tableDisabled:'Masa devre dışı bırakıldı.',deleteHistory:'Bu masanın rezervasyon geçmişi var ve silinemez. Bunun yerine Devre Dışı kullanın.',deleteConfirm:'{code} masası kalıcı olarak silinsin mi?',tableDeleted:'Masa silindi.'
 }
};
function t(key,vars={}){
 const dict=I18N[staffLang]||I18N.en;
 let out=dict[key]??I18N.en[key]??key;
 return String(out).replace(/\{(\w+)\}/g,(_,k)=>vars[k]??'');
}
function statusLabel(status){
 const map={pending:'pending',confirmed:'confirmed',reconfirmed:'reconfirmed',seated:'seated',completed:'completed',no_show:'noShow',declined:'declined',cancelled:'cancelled'};
 return t(map[status]||status);
}
function applyStaticLanguage(){
 document.documentElement.lang=staffLang==='tr'?'tr':'en';
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n)});
 document.querySelectorAll('.staff-lang button').forEach(b=>b.classList.toggle('on',b.dataset.lang===staffLang));document.querySelectorAll('.password-toggle').forEach(b=>{const input=$(b.dataset.target);b.textContent=input&&input.type==='text'?t('hidePassword'):t('showPassword')});
}
function setStaffLanguage(lang){
 staffLang=lang==='tr'?'tr':'en';
 localStorage.setItem('sushiStaffLang',staffLang);
 applyStaticLanguage();
 populateTimeFilter();
 renderAll();
 if(assigningId!==null)renderAssignModal();
}

function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function authMsg(t,ok=false){$('authMessage').textContent=t||'';$('authMessage').className='message '+(ok?'ok':'err')}
function row(r){return{id:Number(r.id),code:r.reservation_code,date:r.reservation_date,time:String(r.reservation_time||'').slice(0,5),guests:Number(r.party_size||0),name:r.lead_guest_name||'',room:r.room_number||'',phone:r.phone||'',email:r.email||'',request:r.special_request||'',status:r.status||'',staffNote:r.staff_note||''}}
function tableById(id){return tables.find(t=>Number(t.id)===Number(id))}
function bookingById(id){return rows.find(r=>Number(r.id)===Number(id))}
function assignmentIds(reservationId){return assignments.filter(a=>Number(a.reservation_id)===Number(reservationId)).map(a=>Number(a.table_id))}
function assignedTables(reservationId){return assignmentIds(reservationId).map(tableById).filter(Boolean)}
function assignedCodes(reservationId){const x=assignedTables(reservationId);return x.length?x.map(t=>t.table_code).join(' + '):t('notAssigned')}
function assignedSeats(reservationId){return assignedTables(reservationId).reduce((n,t)=>n+Number(t.seats||0),0)}
function isBlocked(time){return blocked.some(x=>String(x.reservation_time||x.block_time||'').slice(0,5)===time)}
function currentServiceTime(){const d=new Date(),mins=d.getHours()*60+d.getMinutes();let best='17:00';for(const t of TIMES){const [h,m]=t.split(':').map(Number),v=h*60+m;if(v>=mins){best=t;break}best=t}return best}
async function apiGet(params){const u=new URL(GUEST_API);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,String(v)));const r=await fetch(u);const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Request failed');return j}
async function staffSession(){const {data:{session}}=await sb.auth.getSession();if(!session)return null;const {data,error}=await sb.from('staff_profiles').select('*').eq('user_id',session.user.id).eq('active',true).maybeSingle();if(error||!data)return null;return {session,profile:data}}
async function refreshAuth(){const s=await staffSession();$('authCard').classList.toggle('hidden',!!s);$('dashboard').classList.toggle('hidden',!s);if(s){$('staffName').textContent=s.profile.full_name||s.session.user.email;await loadData()}return s}
async function login(){authMsg(t('signingIn'),true);const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){authMsg(error.message==='Invalid login credentials'?t('invalidCredentials'):error.message);return}const s=await staffSession();if(!s){await sb.auth.signOut();authMsg(t('inactiveAccount'));return}authMsg('');await refreshAuth()}
async function setup(){const email=$('email').value.trim(),password=$('password').value;if(!email||password.length<8){authMsg(t('setupInvalid'));return}authMsg(t('creatingAccount'),true);const {data,error}=await sb.auth.signUp({email,password});if(error){authMsg(error.message);return}if(data.session){const s=await staffSession();if(!s){await sb.auth.signOut();authMsg(t('notApproved'));return}authMsg(t('staffCreated'),true);await refreshAuth()}else authMsg(t('confirmEmail'),true)}
async function logout(){await sb.auth.signOut();$('dashboard').classList.add('hidden');$('authCard').classList.remove('hidden');authMsg(t('signedOut'),true)}
function modalMsg(id,text,ok=false){const el=$(id);if(!el)return;el.textContent=text||'';el.className='message '+(ok?'ok':'err')}
function openModal(id){$(id)?.classList.remove('hidden')}
function closeModal(id){$(id)?.classList.add('hidden')}
async function forgotPassword(){
  const email=($('resetEmail')?.value||$('email')?.value||'').trim();
  if(!email)return modalMsg('resetMessage',t('enterEmail'));
  modalMsg('resetMessage',t('sendingReset'),true);
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/staff?recovery=1'});
  if(error)return modalMsg('resetMessage',error.message);
  modalMsg('resetMessage',t('resetSent'),true);
}
async function updatePassword(){
  const np=$('newPassword').value,cp=$('confirmPassword').value;
  if(np.length<8)return modalMsg('passwordMessage',t('passwordMin'));
  if(np!==cp)return modalMsg('passwordMessage',t('passwordMismatch'));
  const recovering=new URLSearchParams(location.search).get('recovery')==='1';
  if(!recovering){
    const s=await staffSession();if(!s)return modalMsg('passwordMessage',t('signAgain'));
    const current=$('currentPassword').value;
    if(!current)return modalMsg('passwordMessage',t('enterCurrent'));
    const email=s.session.user.email;
    const {error:verifyError}=await sb.auth.signInWithPassword({email,password:current});
    if(verifyError)return modalMsg('passwordMessage',t('currentIncorrect'));
  }
  modalMsg('passwordMessage',t('updatingPassword'),true);
  const {error}=await sb.auth.updateUser({password:np});
  if(error)return modalMsg('passwordMessage',error.message);
  modalMsg('passwordMessage',t('passwordUpdated'),true);
  $('currentPassword').value='';$('newPassword').value='';$('confirmPassword').value='';
  try{history.replaceState({},'',location.pathname)}catch(e){}
  setTimeout(()=>closeModal('passwordModal'),900);
}
function populateTimeFilter(){const cur=$('timeFilter').value;$('timeFilter').innerHTML='<option value="all">'+t('allTimes')+'</option>'+TIMES.map(x=>'<option value="'+x+'">'+x+'</option>').join('');if(cur&&[...TIMES,'all'].includes(cur))$('timeFilter').value=cur;else $('timeFilter').value='all'}
async function loadData(){const date=$('date').value||today();$('date').value=date;const [{data:rr,error:re},{data:bb,error:be},{data:tt,error:te}]=await Promise.all([
  sb.from('reservations').select('*').eq('reservation_date',date).order('reservation_time'),
  sb.from('blocked_slots').select('*').eq('active',true).or('reservation_date.eq.'+date+',block_date.eq.'+date),
  sb.from('restaurant_tables').select('*').order('sort_order')
]);
if(re||be||te){alert((re||be||te).message);return}
rows=(rr||[]).map(row);blocked=bb||[];allTables=tt||[];tables=allTables.filter(t=>t.active!==false);
const ids=rows.map(r=>r.id);assignments=[];
if(ids.length){const {data:aa,error:ae}=await sb.from('table_assignments').select('id,reservation_id,table_id,created_at').in('reservation_id',ids);if(ae){alert(ae.message);return}assignments=aa||[]}
renderAll()}
function renderAll(){renderStats();renderRequests();renderTables();renderSlots();renderTableManagement()}
function renderStats(){$('totalStat').textContent=rows.length;$('pendingStat').textContent=rows.filter(r=>r.status==='pending').length;$('confirmedStat').textContent=rows.filter(r=>['confirmed','reconfirmed'].includes(r.status)).length;$('paxStat').textContent=rows.filter(r=>ACTIVE_FOR_CAPACITY.includes(r.status)).reduce((n,r)=>n+r.guests,0)}
function filteredRows(){const st=$('status').value,time=$('timeFilter').value;return rows.filter(r=>(st==='all'||r.status===st)&&(time==='all'||r.time===time))}
function statusButtons(r){
  const table='<button onclick="window.staffOpenAssign('+r.id+')">'+t('tables')+'</button>';
  if(r.status==='pending')return '<div class="actions three"><button class="primary" onclick="window.staffSetStatus('+r.id+',\'confirmed\')">'+t('confirm')+'</button><button class="danger" onclick="window.staffSetStatus('+r.id+',\'declined\')">'+t('decline')+'</button>'+table+'</div>';
  if(['confirmed','reconfirmed'].includes(r.status))return '<div class="actions three">'+table+'<button class="primary" onclick="window.staffSetStatus('+r.id+',\'seated\')">'+t('seated').toUpperCase()+'</button><button class="danger" onclick="window.staffSetStatus('+r.id+',\'no_show\')">'+t('noShowBtn')+'</button></div>';
  if(r.status==='seated')return '<div class="actions">'+table+'<button class="primary" onclick="window.staffSetStatus('+r.id+',\'completed\')">'+t('complete')+'</button></div>';
  return ''
}
function renderRequests(){const shown=filteredRows();$('requests').innerHTML=shown.length?shown.map(r=>{
  const at=assignedTables(r.id),seat=assignedSeats(r.id);
  return '<div class="booking"><div class="top"><b>'+esc(r.time)+' · '+esc(r.name)+'</b><span class="pill '+esc(r.status)+'">'+esc(r.status)+'</span></div><div class="meta">'+r.guests+' guest(s)'+(r.room?' · Room '+esc(r.room):'')+(r.phone?' · '+esc(r.phone):'')+(r.email?' · '+esc(r.email):'')+(r.request?'<br>'+esc(r.request):'')+'<br>'+esc(r.code)+'</div><div class="assignment"><b>Table:</b> '+esc(assignedCodes(r.id))+(at.length?' · '+seat+' seats':'')+'</div>'+statusButtons(r)+'</div>'
}).join(''):'<p class="note">No reservations in this view.</p>'}
function occupantForTable(tableId,time,excludeId=null){for(const a of assignments){if(Number(a.table_id)!==Number(tableId))continue;const r=bookingById(a.reservation_id);if(!r||r.time!==time||!ACTIVE_FOR_TABLES.includes(r.status))continue;if(excludeId!==null&&Number(r.id)===Number(excludeId))continue;return r}return null}
function tableCard(t,time){if(!time||time==='all')return '<div class="table-card"><b>'+esc(t.table_code)+'</b><small>'+t('seatCount',{n:t.seats})+'</small><small>'+t('selectTime')+'</small></div>';const occ=occupantForTable(t.id,time);const blockedSlot=isBlocked(time);return '<div class="table-card '+(occ?'used':'free')+(blockedSlot?' blocked':'')+'"><b>'+esc(t.table_code)+'</b><small>'+t('seatCount',{n:t.seats})+'</small><small>'+(blockedSlot?t('slotBlocked'):occ?esc(occ.name)+' · '+occ.guests+'p':t('available'))+'</small></div>'}
function renderTables(){const time=$('timeFilter').value,inside=tables.filter(t=>t.area==='inside'),terrace=tables.filter(t=>t.area==='terrace');let html='';if(time==='all')html+='<p class="note" style="margin:0 0 12px">'+t('chooseTime')+'</p>';else if(isBlocked(time))html+='<p class="note" style="margin:0 0 12px">'+t('blockedNew',{time:esc(time)})+'</p>';html+='<div class="area-title">'+t('inside').toUpperCase()+'</div><div class="table-grid">'+inside.map(x=>tableCard(x,time)).join('')+'</div><div class="area-title" style="margin-top:17px">'+t('terrace').toUpperCase()+'</div><div class="table-grid">'+terrace.map(x=>tableCard(x,time)).join('')+'</div>';$('tablesView').innerHTML=html}
function confirmedGuests(time){return rows.filter(r=>r.time===time&&ACTIVE_FOR_CAPACITY.includes(r.status)).reduce((n,r)=>n+r.guests,0)}
function usedTableCount(time){const set=new Set();for(const a of assignments){const r=bookingById(a.reservation_id);if(r&&r.time===time&&ACTIVE_FOR_CAPACITY.includes(r.status))set.add(Number(a.table_id))}return set.size}
function renderSlots(){const cap=tables.reduce((n,x)=>n+Number(x.seats||0),0);$('slots').innerHTML=TIMES.map(x=>'<div class="slot"><b>'+x+'</b><small>'+(isBlocked(x)?t('closedNew'):t('confirmedGuests',{confirmed:confirmedGuests(x),capacity:cap,tables:usedTableCount(x)}))+'</small><button class="'+(isBlocked(x)?'open':'')+'" onclick="window.staffToggleSlot(\''+x+'\')">'+(isBlocked(x)?t('open'):t('block'))+'</button></div>').join('')}
async function addAudit(reservationId,action,oldStatus,newStatus,details){const s=await staffSession();if(!s)return;const {error}=await sb.from('reservation_audit').insert({reservation_id:reservationId,action,old_status:oldStatus||null,new_status:newStatus||null,actor_user_id:s.session.user.id,details:details||{}});if(error)console.warn(error.message)}
window.staffSetStatus=async function(id,status){const s=await staffSession();if(!s)return alert(t('signAgain'));const r=bookingById(id);if(!r)return;if(status==='confirmed'&&r.status==='pending'){const own=assignmentIds(r.id);if(own.length){if(assignedSeats(r.id)<r.guests)return alert(t('assignedSeatsError'));for(const tableId of own){const occ=occupantForTable(tableId,r.time,r.id);if(occ&&ACTIVE_FOR_CAPACITY.includes(occ.status))return alert(t('assignedUsedError'))}}try{const j=await apiGet({action:'availability',date:r.date,party:r.guests});const slot=(j.slots||[]).find(x=>x.time===r.time);if(slot&&!slot.available)return alert(t('slotCapacityError'))}catch(e){return alert(t('availabilityError'))}}const {error}=await sb.from('reservations').update({status}).eq('id',id);if(error)return alert(error.message);if(['declined','cancelled','completed','no_show'].includes(status)){const {error:de}=await sb.from('table_assignments').delete().eq('reservation_id',id);if(de)return alert(de.message)}await addAudit(id,'STAFF_STATUS',r.status,status,{});await loadData()}
window.staffToggleSlot=async function(time){const s=await staffSession();if(!s)return alert(t('signAgain'));const date=$('date').value,hit=blocked.find(x=>String(x.reservation_time||x.block_time||'').slice(0,5)===time);let error;if(hit)({error}=await sb.from('blocked_slots').delete().eq('id',hit.id));else({error}=await sb.from('blocked_slots').insert({reservation_date:date,reservation_time:time+':00',block_date:date,block_time:time+':00',active:true,created_by:s.session.user.id,reason:'Staff block'}));if(error)return alert(error.message);await loadData()}
function modalTableCard(tbl,r){const occ=occupantForTable(tbl.id,r.time,r.id),selected=selectedTables.has(Number(tbl.id)),disabled=!!occ;return '<button type="button" class="table-card selectable '+(selected?'selected ':'')+(disabled?'disabled':'')+'" '+(disabled?'disabled':'onclick="window.staffToggleTable('+Number(tbl.id)+')"')+'><b>'+esc(tbl.table_code)+'</b><small>'+t('seatCount',{n:tbl.seats})+'</small><small>'+(occ?t('usedBy',{name:esc(occ.name)}):selected?t('selected'):t('available'))+'</small></button>'}
function renderAssignModal(){const r=bookingById(assigningId);if(!r)return;const inside=tables.filter(x=>x.area==='inside'),terrace=tables.filter(x=>x.area==='terrace'),selected=[...selectedTables].map(tableById).filter(Boolean),seat=selected.reduce((n,x)=>n+Number(x.seats||0),0);$('assignTitle').textContent=r.time+' · '+r.name;$('assignMeta').textContent=t('guestCount',{n:r.guests})+' · '+r.code;$('assignGrid').innerHTML='<div class="area-title">'+t('inside').toUpperCase()+'</div><div class="table-grid">'+inside.map(x=>modalTableCard(x,r)).join('')+'</div><div class="area-title" style="margin-top:17px">'+t('terrace').toUpperCase()+'</div><div class="table-grid">'+terrace.map(x=>modalTableCard(x,r)).join('')+'</div>';$('assignSeatSummary').innerHTML='<b>'+t('seatsSelected',{seats:seat})+'</b> '+t('forGuests',{guests:r.guests})+(seat>=r.guests?'<span class="ok"> · '+t('capacityOk')+'</span>':'<span class="err"> · '+t('selectMoreSeats')+'</span>')}
window.staffOpenAssign=function(id){const r=bookingById(id);if(!r)return;assigningId=r.id;selectedTables=new Set(assignmentIds(r.id));$('assignModal').classList.remove('hidden');renderAssignModal()}
window.staffToggleTable=function(tableId){if(selectedTables.has(Number(tableId)))selectedTables.delete(Number(tableId));else selectedTables.add(Number(tableId));renderAssignModal()}
function bestTables(r){const free=tables.filter(t=>!occupantForTable(t.id,r.time,r.id));let best=null;const n=free.length;for(let mask=1;mask<(1<<n);mask++){let seats=0,count=0,ids=[];for(let i=0;i<n;i++)if(mask&(1<<i)){seats+=Number(free[i].seats||0);count++;ids.push(Number(free[i].id))}if(seats<r.guests)continue;const waste=seats-r.guests;if(!best||waste<best.waste||(waste===best.waste&&count<best.count))best={ids,waste,count,seats};if(best&&best.waste===0&&best.count===1)break}return best}
function autoAssign(){const r=bookingById(assigningId);if(!r)return;const best=bestTables(r);if(!best)return alert(t('noFreeCapacity'));selectedTables=new Set(best.ids);renderAssignModal()}
async function saveAssignment(){const s=await staffSession();if(!s)return alert(t('signAgain'));const r=bookingById(assigningId);if(!r)return;const chosen=[...selectedTables],seat=chosen.map(tableById).filter(Boolean).reduce((n,t)=>n+Number(t.seats||0),0);if(!chosen.length)return alert(t('selectOneTable'));if(seat<r.guests)return alert(t('selectedSeatsError'));const {error}=await sb.rpc('sushi_staff_action',{p_id:r.id,p_action:'assign',p_table_ids:chosen,p_note:null});if(error)return alert(error.message);closeAssign();await loadData()}
async function clearAssignment(){const s=await staffSession();if(!s)return alert(t('signAgain'));const r=bookingById(assigningId);if(!r)return;const {error}=await sb.rpc('sushi_staff_action',{p_id:r.id,p_action:'clear',p_table_ids:null,p_note:null});if(error){if(error.message.includes('ONLY_PENDING_ASSIGNMENTS_CAN_BE_CLEARED'))return alert(t('clearPendingOnly'));return alert(error.message)}closeAssign();await loadData()}
async function addTable(){const s=await staffSession();if(!s)return alert(t('signAgain'));const code=$('newTableCode').value.trim().toUpperCase(),area=$('newTableArea').value,seats=Number($('newTableSeats').value);const msg=$('tableAdminMessage');msg.textContent='';msg.className='message';if(!/^[A-Z0-9-]{1,12}$/.test(code)){msg.textContent=t('tableCodeHint');msg.classList.add('err');return}if(!['inside','terrace'].includes(area)||!Number.isInteger(seats)||seats<1||seats>20){msg.textContent=t('invalidAreaSeats');msg.classList.add('err');return}if(allTables.some(t=>String(t.table_code).toUpperCase()===code)){msg.textContent=t('tableCodeExists');msg.classList.add('err');return}const sortOrder=(allTables.reduce((m,t)=>Math.max(m,Number(t.sort_order)||0),0)||0)+10;const {error}=await sb.from('restaurant_tables').insert({table_code:code,area,seats,active:true,sort_order:sortOrder});if(error){msg.textContent=error.message;msg.classList.add('err');return}$('newTableCode').value='';$('newTableSeats').value='2';msg.textContent=t('tableAdded');msg.classList.add('ok');await loadData()}

function renderTableManagement(){
  const host=$('tableManageList');if(!host)return;
  host.innerHTML=allTables.length?allTables.map(tbl=>'<div class="table-manage-row '+(tbl.active===false?'inactive':'')+'" data-id="'+Number(tbl.id)+'">'+
    '<div><label>'+t('tableCode')+'</label><input id="mtCode'+Number(tbl.id)+'" value="'+esc(tbl.table_code)+'" maxlength="12"><div class="table-manage-state">'+(tbl.active===false?t('inactive'):t('active'))+'</div></div>'+
    '<div><label>'+t('area')+'</label><select id="mtArea'+Number(tbl.id)+'"><option value="inside" '+(tbl.area==='inside'?'selected':'')+'>'+t('inside')+'</option><option value="terrace" '+(tbl.area==='terrace'?'selected':'')+'>'+t('terrace')+'</option></select></div>'+
    '<div><label>'+t('seats')+'</label><input id="mtSeats'+Number(tbl.id)+'" type="number" min="1" max="20" value="'+Number(tbl.seats||2)+'"></div>'+
    '<div class="table-manage-actions"><button class="save" onclick="window.staffSaveTable('+Number(tbl.id)+')">'+t('save')+'</button>'+
    '<button class="warn" onclick="window.staffToggleTableActive('+Number(tbl.id)+')">'+(tbl.active===false?t('activate'):t('disable'))+'</button>'+
    '<button class="danger" onclick="window.staffDeleteTable('+Number(tbl.id)+')">'+t('delete')+'</button></div></div>').join(''):'<p class="note">'+t('noTables')+'</p>';
}
function tableAdminMessage(text,ok=false){const el=$('tableManageMessage');if(!el)return;el.textContent=text||'';el.className='message '+(ok?'ok':'err')}
window.staffSaveTable=async function(id){
  const s=await staffSession();if(!s)return alert(t('signAgain'));
  const t=allTables.find(x=>Number(x.id)===Number(id));if(!t)return;
  const code=$('mtCode'+id).value.trim().toUpperCase(),area=$('mtArea'+id).value,seats=Number($('mtSeats'+id).value);
  if(!/^[A-Z0-9-]{1,12}$/.test(code))return tableAdminMessage(t('tableCodeHint'));
  if(!['inside','terrace'].includes(area)||!Number.isInteger(seats)||seats<1||seats>20)return tableAdminMessage(t('invalidAreaSeats'));
  if(allTables.some(x=>Number(x.id)!==Number(id)&&String(x.table_code).toUpperCase()===code))return tableAdminMessage(t('tableCodeExists'));
  const {error}=await sb.from('restaurant_tables').update({table_code:code,area,seats}).eq('id',id);
  if(error)return tableAdminMessage(error.message);
  tableAdminMessage(t('tableUpdated'),true);await loadData();
}
window.staffToggleTableActive=async function(id){
  const s=await staffSession();if(!s)return alert(t('signAgain'));
  const t=allTables.find(x=>Number(x.id)===Number(id));if(!t)return;
  const next=t.active===false;
  if(!next){
    const {data:aa,error:ae}=await sb.from('table_assignments').select('id').eq('table_id',id).limit(1);
    if(ae)return tableAdminMessage(ae.message);
    if((aa||[]).length&&!confirm(t('disableHistory')))return;
  }
  const {error}=await sb.from('restaurant_tables').update({active:next}).eq('id',id);
  if(error)return tableAdminMessage(error.message);
  tableAdminMessage(next?t('tableActivated'):t('tableDisabled'),true);await loadData();
}
window.staffDeleteTable=async function(id){
  const s=await staffSession();if(!s)return alert(t('signAgain'));
  const t=allTables.find(x=>Number(x.id)===Number(id));if(!t)return;
  const {data:aa,error:ae}=await sb.from('table_assignments').select('id').eq('table_id',id).limit(1);
  if(ae)return tableAdminMessage(ae.message);
  if((aa||[]).length)return tableAdminMessage(t('deleteHistory'));
  if(!confirm(t('deleteConfirm',{code:t.table_code})))return;
  const {error}=await sb.from('restaurant_tables').delete().eq('id',id);
  if(error)return tableAdminMessage(error.message);
  tableAdminMessage(t('tableDeleted'),true);await loadData();
}

function closeAssign(){$('assignModal').classList.add('hidden');assigningId=null;selectedTables=new Set()}
function setTab(which){for(const [tab,card] of [['req','requestsCard'],['table','tablesCard'],['slot','slotsCard']]){$(tab+'Tab').classList.toggle('on',tab===which);$(card).classList.toggle('hidden',tab!==which)}if(which==='table'&&$('timeFilter').value==='all'){$('timeFilter').value=currentServiceTime();renderRequests();renderTables()}}
$('staffLangEn').addEventListener('click',()=>setStaffLanguage('en'));
$('staffLangTr').addEventListener('click',()=>setStaffLanguage('tr'));
document.querySelectorAll('.password-toggle').forEach(btn=>btn.addEventListener('click',()=>{const input=$(btn.dataset.target);if(!input)return;input.type=input.type==='password'?'text':'password';btn.textContent=input.type==='text'?t('hidePassword'):t('showPassword')}));
$('loginBtn').addEventListener('click',login);
$('password').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('setupBtn').addEventListener('click',setup);
$('logoutBtn').addEventListener('click',logout);
$('forgotBtn').addEventListener('click',()=>{$('resetEmail').value=$('email').value.trim();modalMsg('resetMessage','');openModal('forgotModal')});
$('closeForgotBtn').addEventListener('click',()=>closeModal('forgotModal'));
$('sendResetBtn').addEventListener('click',forgotPassword);
$('securityBtn').addEventListener('click',()=>{document.getElementById('currentPasswordWrap').classList.remove('hidden');$('passwordIntro').textContent=t('changePasswordHelp');modalMsg('passwordMessage','');openModal('passwordModal')});
$('closePasswordBtn').addEventListener('click',()=>closeModal('passwordModal'));
$('updatePasswordBtn').addEventListener('click',updatePassword);$('date').value=today();populateTimeFilter();$('date').addEventListener('change',loadData);$('status').addEventListener('change',renderRequests);$('timeFilter').addEventListener('change',()=>{renderRequests();renderTables()});$('reqTab').addEventListener('click',()=>setTab('req'));$('tableTab').addEventListener('click',()=>setTab('table'));$('slotTab').addEventListener('click',()=>setTab('slot'));$('closeAssignBtn').addEventListener('click',closeAssign);$('assignModal').addEventListener('click',e=>{if(e.target===$('assignModal'))closeAssign()});$('autoAssignBtn').addEventListener('click',autoAssign);$('saveAssignBtn').addEventListener('click',saveAssignment);$('clearAssignBtn').addEventListener('click',clearAssignment);$('addTableBtn').addEventListener('click',addTable);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(!$('assignModal').classList.contains('hidden'))closeAssign();
    closeModal('forgotModal');closeModal('passwordModal');
  }
});
for(const id of ['forgotModal','passwordModal']) $(id).addEventListener('click',e=>{if(e.target===$(id))closeModal(id)});
sb.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){document.getElementById('currentPasswordWrap').classList.add('hidden');$('passwordIntro').textContent=t('recoveryPasswordHelp');modalMsg('passwordMessage','');openModal('passwordModal')}setTimeout(refreshAuth,0)});
if(new URLSearchParams(location.search).get('recovery')==='1'){
  document.getElementById('currentPasswordWrap').classList.add('hidden');
  $('passwordIntro').textContent='Choose a new password for your staff account.';
  openModal('passwordModal');
}
applyStaticLanguage();
populateTimeFilter();
refreshAuth();
})();