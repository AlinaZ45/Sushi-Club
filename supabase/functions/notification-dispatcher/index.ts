import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISPATCH_SECRET = Deno.env.get("DISPATCH_SECRET") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "";
const META_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN") || "";
const META_PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID") || "";
const META_TEMPLATE_NAME = Deno.env.get("META_WHATSAPP_TEMPLATE_NAME") || "sushi_reservation_update";
const META_TEMPLATE_LANG = Deno.env.get("META_WHATSAPP_TEMPLATE_LANG") || "en";
const APP_URL = "https://reserve.sushiclublara.com";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function clean(v: unknown) { return String(v ?? "").trim(); }
function esc(v: unknown) {
  return clean(v).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"} as Record<string,string>)[c]);
}
function prettyStatus(s: string) {
  return ({pending:"Pending",confirmed:"Confirmed",reconfirmed:"Reconfirmed",declined:"Declined",cancelled:"Cancelled"} as Record<string,string>)[s] || s;
}
function emailSubject(type:string,p:any) {
  if (type==="staff_new_reservation") return `New Sushi Club reservation · ${p.reservation_code}`;
  if (type==="staff_reservation_updated") return `Sushi Club reservation updated · ${p.reservation_code}`;
  if (type==="staff_reservation_cancelled") return `Sushi Club reservation cancelled · ${p.reservation_code}`;
  return `Sushi Club reservation · ${p.reservation_code} · ${prettyStatus(p.status)}`;
}
function emailHtml(type:string,p:any) {
  const isStaff = String(type).startsWith("staff_");
  const status = prettyStatus(clean(p.status));
  const headline = isStaff
    ? (type==="staff_new_reservation" ? "New Reservation Request" : type==="staff_reservation_cancelled" ? "Reservation Cancelled" : "Reservation Updated")
    : `Reservation ${status}`;
  const actionUrl = isStaff
    ? `${APP_URL}/staff`
    : `${APP_URL}/?reservation=${encodeURIComponent(clean(p.reservation_code))}&view=myReservations`;
  const actionText = isStaff ? "Open Staff App" : "View My Reservation";
  const helperText = isStaff
    ? "Open the Staff App to review the reservation and assign a table."
    : status==="Confirmed"
      ? "Your reservation has been confirmed. You can view the latest details in My Reservations."
      : status==="Declined"
        ? "Unfortunately, your reservation could not be confirmed. Please see the reason above and choose another date or time if you wish."
        : "View the latest status, manage your reservation or cancel it when applicable.";

  if (isStaff) {
    return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1e9e2;font-family:Arial,Helvetica,sans-serif;color:#584a42;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1e9e2"><tr><td align="center" style="padding:26px 14px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fbf7f2" style="max-width:600px;border-radius:28px;overflow:hidden;border:1px solid #eaded4;">
<tr><td style="padding:32px 28px;text-align:center;">
<div style="font-size:11px;letter-spacing:3px;font-weight:700;color:#967d6d;">SUSHI CLUB · DELTA HOTELS</div>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:32px;line-height:1.2;margin:16px 0 20px;color:#4f423a;">${esc(headline)}</h1>
<p style="margin:8px 0;"><b>Reservation:</b> ${esc(p.reservation_code)}</p>
<p style="margin:8px 0;"><b>Guest:</b> ${esc(p.lead_guest_name)}</p>
<p style="margin:8px 0;"><b>Date:</b> ${esc(p.reservation_date)} &nbsp; <b>Time:</b> ${esc(String(p.reservation_time||"").slice(0,5))}</p>
<p style="margin:8px 0;"><b>Guests:</b> ${esc(p.party_size)} &nbsp; <b>Status:</b> ${esc(status)}</p>
${p.room_number ? `<p style="margin:8px 0;"><b>Room:</b> ${esc(p.room_number)}</p>` : ""}
${p.special_request ? `<p style="margin:8px 0;"><b>Request:</b> ${esc(p.special_request)}</p>` : ""}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:22px auto 8px;"><tr><td bgcolor="#8f7563" style="border-radius:999px;"><a href="${esc(actionUrl)}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-size:13px;font-weight:700;">${esc(actionText)}</a></td></tr></table>
<p style="font-size:12px;line-height:1.6;color:#8a786d;">${esc(helperText)}</p>
</td></tr></table></td></tr></table></body></html>`;
  }

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root{color-scheme:light only!important}
    body,.guest-bg{background:#e9d8c8!important;background-image:
      radial-gradient(circle at 18% 14%,#fff7f0 0,#fff7f0 11%,transparent 34%),
      radial-gradient(circle at 84% 22%,#d9bfa9 0,#d9bfa9 10%,transparent 38%),
      radial-gradient(circle at 22% 82%,#f3dfcf 0,#f3dfcf 12%,transparent 40%),
      linear-gradient(145deg,#f2e8df 0%,#dcc6b3 52%,#f0dfd1 100%)!important;
    }
    .guest-card{background:#e8d6c6!important;background-image:linear-gradient(145deg,#e8d6c6,#d8bfaa)!important}
  </style>
</head>
<body class="guest-bg" bgcolor="#e9d8c8" style="margin:0;padding:0;background:#e9d8c8;background-image:linear-gradient(145deg,#f2e8df,#dcc6b3 52%,#f0dfd1);font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#e9d8c8" style="width:100%;background:#e9d8c8;">
    <tr>
      <td align="center" style="padding:26px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="guest-card" bgcolor="#dfc9b7" style="width:100%;max-width:600px;border-radius:34px;overflow:hidden;border:1px solid rgba(255,255,255,.68);background:#dfc9b7;background-image:linear-gradient(145deg,#ead9ca 0%,#d8bfaa 100%);box-shadow:0 24px 58px rgba(120,93,73,.12);">
          <tr>
            <td style="padding:38px 28px 10px;text-align:center;">
              <div style="font-size:10px;line-height:1.55;letter-spacing:3.4px;font-weight:700;color:#ffffff;text-shadow:0 2px 16px rgba(101,76,58,.20);">DELTA HOTELS · SUSHI CLUB</div>
              <div style="font-size:8px;line-height:1.6;letter-spacing:2.2px;font-weight:700;color:rgba(255,255,255,.90);margin-top:4px;">MARRIOTT · ANTALYA LARA</div>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 28px 4px;text-align:center;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.08;font-weight:400;color:#ffffff;text-shadow:0 2px 18px rgba(101,76,58,.20);">${esc(headline)}</div>
              <div style="width:48px;height:1px;background:rgba(255,255,255,.78);margin:18px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ead9ca" style="width:100%;border-radius:28px;border:1px solid rgba(255,255,255,.68);background:#ead9ca;background-image:linear-gradient(145deg,rgba(255,255,255,.30),rgba(255,248,241,.14));box-shadow:inset 0 1px 0 rgba(255,255,255,.72);">
                <tr>
                  <td style="padding:24px 24px 8px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0 11px;">
                      <tr><td style="font-size:12px;color:#8a7568;width:42%;">Reservation</td><td align="right" style="font-size:14px;font-weight:700;color:#625247;">${esc(p.reservation_code)}</td></tr>
                      <tr><td style="font-size:12px;color:#8a7568;">Guest</td><td align="right" style="font-size:14px;font-weight:600;color:#625247;">${esc(p.lead_guest_name)}</td></tr>
                      <tr><td style="font-size:12px;color:#8a7568;">Date</td><td align="right" style="font-size:14px;font-weight:600;color:#625247;">${esc(p.reservation_date)}</td></tr>
                      <tr><td style="font-size:12px;color:#8a7568;">Time</td><td align="right" style="font-size:14px;font-weight:600;color:#625247;">${esc(String(p.reservation_time||"").slice(0,5))}</td></tr>
                      <tr><td style="font-size:12px;color:#8a7568;">Guests</td><td align="right" style="font-size:14px;font-weight:600;color:#625247;">${esc(p.party_size)}</td></tr>
                      <tr><td style="font-size:12px;color:#8a7568;">Status</td><td align="right"><span style="display:inline-block;padding:8px 13px;border-radius:999px;background:#f3e7dc;color:#7d6657;font-size:12px;font-weight:700;">${esc(status)}</span></td></tr>
                      ${p.room_number ? `<tr><td style="font-size:12px;color:#8a7568;">Room</td><td align="right" style="font-size:14px;font-weight:600;color:#625247;">${esc(p.room_number)}</td></tr>` : ""}
                      ${p.special_request ? `<tr><td style="font-size:12px;color:#8a7568;vertical-align:top;">Request</td><td align="right" style="font-size:14px;line-height:1.45;color:#625247;">${esc(p.special_request)}</td></tr>` : ""}
                      ${status==="Declined" && p.staff_note ? `<tr><td style="font-size:12px;color:#8a7568;vertical-align:top;">Reason</td><td align="right" style="font-size:14px;line-height:1.45;color:#625247;">${esc(p.staff_note)}</td></tr>` : ""}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:12px 24px 6px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                      <tr>
                        <td align="center" bgcolor="#dfc8b7" style="border:1px solid rgba(255,255,255,.82);border-radius:999px;background:#dfc8b7;background-image:linear-gradient(135deg,#ead9ca,#d8bfaa);box-shadow:inset 0 1px 0 rgba(255,255,255,.68);">
                          <a href="${esc(actionUrl)}" target="_blank" style="display:inline-block;padding:16px 32px;border-radius:999px;color:#ffffff;text-decoration:none;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:400;text-shadow:0 1px 10px rgba(103,78,59,.18);">View My Reservation</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 28px 25px;text-align:center;font-size:11px;line-height:1.65;color:#8c796d;">
                    ${esc(helperText)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:17px 28px 30px;text-align:center;">
              <div style="font-size:8px;letter-spacing:2.2px;color:rgba(255,255,255,.90);">SAVOR · SHARE · SMILE</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
async function sendEmail(row:any) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) return {ok:false,notConfigured:true,error:"Email provider not configured"};
  const p=row.payload||{};
  const resp=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      from:RESEND_FROM_EMAIL,
      to:[row.recipient],
      subject:emailSubject(row.notification_type,p),
      html:emailHtml(row.notification_type,p)
    })
  });
  const body=await resp.json().catch(()=>({}));
  if(!resp.ok) return {ok:false,error:body?.message||`Resend HTTP ${resp.status}`};
  return {ok:true,id:body?.id||null};
}
async function sendWhatsapp(row:any) {
  if (!META_TOKEN || !META_PHONE_ID) return {ok:false,notConfigured:true,error:"WhatsApp provider not configured"};
  const p=row.payload||{};
  const recipient=clean(row.recipient).replace(/[^0-9]/g,"");
  const resp=await fetch(`https://graph.facebook.com/v23.0/${META_PHONE_ID}/messages`,{
    method:"POST",
    headers:{"Authorization":`Bearer ${META_TOKEN}`,"Content-Type":"application/json"},
    body:JSON.stringify({
      messaging_product:"whatsapp",
      to:recipient,
      type:"template",
      template:{
        name:META_TEMPLATE_NAME,
        language:{code:META_TEMPLATE_LANG},
        components:[{
          type:"body",
          parameters:[
            {type:"text",text:clean(p.lead_guest_name)||"-"},
            {type:"text",text:clean(p.reservation_code)||"-"},
            {type:"text",text:clean(p.reservation_date)||"-"},
            {type:"text",text:clean(p.reservation_time)||"-"},
            {type:"text",text:prettyStatus(clean(p.status))||"-"}
          ]
        }]
      }
    })
  });
  const body=await resp.json().catch(()=>({}));
  if(!resp.ok) return {ok:false,error:body?.error?.message||`Meta HTTP ${resp.status}`};
  return {ok:true,id:body?.messages?.[0]?.id||null};
}

Deno.serve(async (req:Request)=>{
  if(req.method==="GET"){
    const {data:dbSecret}=await sb.rpc("get_internal_setting",{setting_key:"dispatch_secret"});
    return new Response(JSON.stringify({ok:true,configured:{dispatch:!!(DISPATCH_SECRET||dbSecret),email:!!RESEND_API_KEY&&!!RESEND_FROM_EMAIL,whatsapp:!!META_TOKEN&&!!META_PHONE_ID},version:"6"}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
  if(req.method!=="POST") return new Response(JSON.stringify({ok:false,error:"POST only"}),{status:405,headers:{"Content-Type":"application/json"}});
  const {data:dbSecret}=await sb.rpc("get_internal_setting",{setting_key:"dispatch_secret"});
  const effectiveSecret=DISPATCH_SECRET||clean(dbSecret);
  if(!effectiveSecret) return new Response(JSON.stringify({ok:false,error:"Dispatcher is not configured"}),{status:503,headers:{"Content-Type":"application/json"}});
  const supplied=req.headers.get("x-dispatch-secret")||"";
  if(supplied!==effectiveSecret) return new Response(JSON.stringify({ok:false,error:"Unauthorized"}),{status:401,headers:{"Content-Type":"application/json"}});

  const {data:rows,error}=await sb.from("notification_queue")
    .select("id,reservation_id,channel,notification_type,recipient,payload,status,attempt_count")
    .eq("status","pending")
    .or("scheduled_for.is.null,scheduled_for.lte."+new Date().toISOString())
    .order("created_at",{ascending:true})
    .limit(20);
  if(error) return new Response(JSON.stringify({ok:false,error:error.message}),{status:500,headers:{"Content-Type":"application/json"}});

  const results:any[]=[];
  for(const row of rows||[]){
    // Guest status events are intentionally delivered in queue order.
    // Do not supersede Pending when a later Confirmed/Declined event already exists.

    let result:any;
    try{
      result=row.channel==="email" ? await sendEmail(row) :
             row.channel==="whatsapp" ? await sendWhatsapp(row) :
             {ok:false,error:"Unsupported channel"};
    }catch(e){ result={ok:false,error:e instanceof Error?e.message:String(e)}; }

    if(result.notConfigured){
      results.push({id:row.id,channel:row.channel,status:"waiting_for_configuration"});
      continue;
    }
    if(result.ok){
      await sb.from("notification_queue").update({
        status:"sent",sent_at:new Date().toISOString(),error_message:null,
        provider_message_id:result.id,attempt_count:(row.attempt_count||0)+1,last_attempt_at:new Date().toISOString()
      }).eq("id",row.id);
      results.push({id:row.id,channel:row.channel,status:"sent"});
    }else{
      const attempts=(row.attempt_count||0)+1;
      await sb.from("notification_queue").update({
        status:attempts>=5?"failed":"pending",
        error_message:result.error||"Unknown error",
        attempt_count:attempts,last_attempt_at:new Date().toISOString(),
        scheduled_for:new Date(Date.now()+Math.min(attempts*5,30)*60000).toISOString()
      }).eq("id",row.id);
      results.push({id:row.id,channel:row.channel,status:attempts>=5?"failed":"retry",error:result.error});
    }
  }
  return new Response(JSON.stringify({ok:true,processed:results.length,results}),{headers:{"Content-Type":"application/json"}});
});