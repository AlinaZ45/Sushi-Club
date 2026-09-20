(function () {
  'use strict';
  const errors = {
    en:'Availability could not be checked. Please try again.',
    tr:'Müsaitlik kontrol edilemedi. Lütfen tekrar deneyin.',
    ru:'Не удалось проверить наличие мест. Попробуйте ещё раз.',
    de:'Die Verfügbarkeit konnte nicht geprüft werden. Bitte erneut versuchen.',
    fr:'Impossible de vérifier les disponibilités. Veuillez réessayer.',
    zh:'无法查询空位，请重试。'
  };
  const lang=()=>typeof currentLanguage==='string'?currentLanguage:'en';
  const errorText=()=>errors[lang()]||errors.en;
  const api='https://poxuyzcaejbqouelzwob.supabase.co/functions/v1/guest-reservations';
  let sequence=0, submitting=false, checked='';
  function notice(text,retry) {
    let n=document.getElementById('availabilityMessage');
    if (!n) {n=document.createElement('div');n.id='availabilityMessage';n.className='smallnote';n.setAttribute('role','status');document.getElementById('reserveTimes').after(n);}
    n.replaceChildren(document.createTextNode(text));
    if(retry){const b=document.createElement('button');b.type='button';b.textContent='↻';b.title=errorText();b.setAttribute('aria-label',errorText());b.style.marginLeft='10px';b.onclick=()=>window.renderGuestTimes();n.append(b);}
  }
  window.renderGuestTimes=async function () {
    const mine=++sequence;
    const date=document.getElementById('rdate').value||today();
    const party=Number(document.getElementById('guests').value||1);
    const key=date+'|'+party;
    checked='';
    const buttons=[...document.querySelectorAll('#reserveTimes .time')];
    const selected=buttons.find(b=>b.classList.contains('active'))?.textContent.trim();
    buttons.forEach(b=>{b.disabled=true;b.style.opacity='.35';b.style.cursor='not-allowed';b.classList.remove('active');});
    syncSelectedTime();
    if(!Number.isInteger(party)||party<1||party>20){notice(errorText(),false);return;}
    notice('...',false);
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
    try {
      const url=new URL(api);url.search=new URLSearchParams({action:'availability',date,party:String(party)});
      const response=await fetch(url,{signal:abort.signal,cache:'no-store'});
      const data=await response.json();
      if(!response.ok||data.ok!==true||!Array.isArray(data.slots)||!data.slots.length)throw new Error('Invalid availability response');
      if(mine!==sequence)return;
      const now=new Date(), localDate=today();
      const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(now);
      const localTime=parts.find(p=>p.type==='hour').value+':'+parts.find(p=>p.type==='minute').value;
      for(const b of buttons){const time=b.textContent.trim(),slot=data.slots.find(s=>s.time===time);const past=date<localDate||(date===localDate&&time<=localTime);const available=slot?.available===true&&!past;b.disabled=!available;b.style.opacity=available?'1':'.35';b.style.cursor=available?'pointer':'not-allowed';}
      const choose=buttons.find(b=>!b.disabled&&b.textContent.trim()===selected)||buttons.find(b=>!b.disabled);
      if(choose)choose.classList.add('active');
      checked=key;notice('',false);syncSelectedTime();
    }catch(e){if(mine===sequence){checked='';notice(errorText(),true);}}
    finally{clearTimeout(timer);}
  };
  const originalConfirm=window.confirmReservation;
  window.confirmReservation=async function () {
    if(submitting)return;
    const key=(document.getElementById('rdate').value||today())+'|'+Number(document.getElementById('guests').value||1);
    if(checked!==key){await window.renderGuestTimes();if(checked!==key){alert(errorText());return;}}
    submitting=true;
    try{await originalConfirm();}finally{submitting=false;}
  };
  const oldManageable=window.isManageable;
  window.isManageable=r=>r&&r.status!=='seated'&&oldManageable(r);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.querySelector('#reserve.active'))window.renderGuestTimes();});
  window.renderGuestTimes();
})();
