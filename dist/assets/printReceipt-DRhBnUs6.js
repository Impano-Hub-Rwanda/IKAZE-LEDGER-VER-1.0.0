import{u as nt,c as dt,g as N,j as p,A as rt,f as c,I as z,B as G,S as lt,d as Q,e as X,p as T}from"./index-BCQsFW6n.js";import{r as b}from"./react-vendor-Ditm_yxA.js";import{M as ct}from"./Modal-B_Gu1Wjd.js";import{S as J}from"./Select-BR59jajt.js";import{B as pt}from"./icons-vY5Bsfa6.js";import{f as w}from"./formatDate-DR1Q4Vus.js";function wt({open:t,onClose:o,onSaved:e,presetDebt:s}){const{t:i}=nt(),{user:n}=dt(),[r,d]=b.useState([]),[m,u]=b.useState(""),[g,S]=b.useState(""),[k,P]=b.useState("cash"),[j,B]=b.useState(""),L=()=>{const l=new Date;return`${l.getFullYear()}-${String(l.getMonth()+1).padStart(2,"0")}-${String(l.getDate()).padStart(2,"0")}`},[O,C]=b.useState(L()),[H,v]=b.useState(""),[_,q]=b.useState(!1),[at,M]=b.useState(!1);b.useEffect(()=>{t&&(S(""),P("cash"),B(""),v(""),C(L()),s?u(String(s.id)):(u(""),it()))},[t,s]);const it=async()=>{M(!0);try{const $=await N().query(`SELECT d.*, c.full_name AS customer_name
         FROM debts d JOIN customers c ON c.id = d.customer_id
         WHERE d.status != 'paid' ORDER BY d.created_at DESC`);d($.rows)}catch{d([])}finally{M(!1)}},y=s??r.find(l=>l.id===Number(m))??null,F=y?Number(y.total_amount)-Number(y.paid_amount):0,h=Number(g)||0,U=h>0&&h>=F,st=async l=>{l.preventDefault(),v("");const $=s??r.find(x=>x.id===Number(m))??null;if(!$){v(i.payments.selectDebt);return}if(!h||h<=0||!Number.isFinite(h)){v(i.payments.invalidAmount);return}const W=Number($.total_amount)-Number($.paid_amount);if(h>W+.01){v(i.payments.exceedsRemaining.replace("{n}",c(W)));return}q(!0);try{const x=N();await x.query("BEGIN");try{const ot=(await x.query("INSERT INTO payments (debt_id, user_id, amount, method, note, paid_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",[$.id,n?.id??0,h,k,j.trim()||null,O])).rows[0].id;if(!(await x.query(`UPDATE debts
           SET paid_amount = paid_amount + $1,
               status = CASE
                 WHEN paid_amount + $1 >= total_amount - 0.01 THEN 'paid'
                 WHEN paid_amount + $1 > 0 THEN 'partially_paid'
                 ELSE 'pending'
               END,
               updated_at = now()
           WHERE id = $2 AND paid_amount + $1 <= total_amount + 0.01
           RETURNING id`,[h,$.id])).rows[0])throw new Error("Payment exceeds the current balance");await x.query("COMMIT"),e(ot),R()}catch(Y){throw await x.query("ROLLBACK"),Y}}catch{v(i.payments.errorSaving)}finally{q(!1)}},R=()=>{v(""),o()};return p.jsx(ct,{open:t,onClose:R,title:i.payments.record,size:"lg",children:p.jsxs("form",{onSubmit:st,className:"space-y-5",children:[H&&p.jsx(rt,{variant:"error",children:H}),!s&&p.jsx(J,{label:i.payments.selectDebt,name:"debt",value:m,onChange:l=>u(l.target.value),placeholder:at?"…":i.payments.selectDebtPlaceholder,options:r.map(l=>({value:String(l.id),label:`#${l.id} · ${l.customer_name} · ${c(Number(l.total_amount)-Number(l.paid_amount))}`})),required:!0}),y&&p.jsxs("div",{className:"flex items-center gap-3 rounded-xl bg-teal-50 p-4 dark:bg-teal-900/30",children:[p.jsx("div",{className:"flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600",children:p.jsx(pt,{className:"h-6 w-6 text-white"})}),p.jsxs("div",{className:"min-w-0 flex-1",children:[p.jsx("p",{className:"truncate font-semibold text-slate-800 dark:text-white",children:y.customer_name}),p.jsxs("p",{className:"text-sm text-slate-600 dark:text-slate-400",children:[i.payments.remaining,":"," ",p.jsx("span",{className:"font-semibold",children:c(F)})]})]})]}),p.jsx(z,{label:i.payments.amount,name:"amount",type:"number",min:"0",step:"0.01",value:g,onChange:l=>S(l.target.value),autoFocus:!0,required:!0}),U&&p.jsx("div",{className:"rounded-lg bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300",children:i.payments.fullPayment}),!U&&h>0&&p.jsx("div",{className:"rounded-lg bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",children:i.payments.partialPayment}),p.jsx(J,{label:i.payments.method,name:"method",value:k,onChange:l=>P(l.target.value),options:[{value:"cash",label:i.payments.methodCash},{value:"mobile_money",label:i.payments.methodMobile},{value:"bank",label:i.payments.methodBank},{value:"other",label:i.payments.methodOther}],required:!0}),p.jsx(z,{label:i.payments.paidOn,name:"paidAt",type:"date",value:O,onChange:l=>C(l.target.value),required:!0}),p.jsx(z,{label:i.payments.noteOptional,name:"note",value:j,onChange:l=>B(l.target.value)}),p.jsxs("div",{className:"flex gap-3 pt-2",children:[p.jsx(G,{type:"button",variant:"secondary",onClick:R,fullWidth:!0,disabled:_,children:i.common.cancel}),p.jsx(G,{type:"submit",fullWidth:!0,disabled:_,children:_?p.jsx(lt,{size:"sm"}):i.common.save})]})]})})}const f=()=>typeof localStorage<"u"&&localStorage.getItem("dms-language")==="rw"?{deliveryNote:"Inyandiko yo Gutanga Ibicuruzwa",debtReceipt:"Inyemezabwishyu y’Ideni",paymentReceipt:"Inyemezabwishyu y’Ubwishyu",date:"Itariki:",customer:"Umukiriya:",phone:"Telefone:",tin:"TIN:",debtNo:"Nimero y’Ideni:",method:"Uburyo bwo Kwishyura:",item:"Igicuruzwa",qty:"Ingano",price:"Igiciro",total:"Igiteranyo",paid:"Yishyuwe",balanceDue:"AMAFARANGA ASIGAYE",amountPaid:"AMAFARANGA YISHYUWE",remainingBalance:"Amafaranga Asigaye",issuedBy:"Byatanzwe na",customerSignature:"Umukono w’Umukiriya",deliveredBy:"Byatanzwe na",receivedBy:"Byakiriwe na",address:"Aderesi:",from:"Kuva kuri:",to:"Kuri:",description:"Ibisobanuro",noItems:"Nta bicuruzwa",grandTotal:"IGITERANYO CYOSE",confidential:"Inyandiko y’Ubucuruzi y’Ibanga",pageOne:"Urupapuro rwa 1 kuri 1",powered:"Byakozwe na MUD SOFTWARE COMPANY"}:{deliveryNote:"Delivery Note",debtReceipt:"Debt Receipt",paymentReceipt:"Payment Receipt",date:"Date:",customer:"Customer:",phone:"Phone:",tin:"TIN:",debtNo:"Debt No:",method:"Method:",item:"Item",qty:"Qty",price:"Price",total:"Total",paid:"Paid",balanceDue:"BALANCE DUE",amountPaid:"AMOUNT PAID",remainingBalance:"Remaining Balance",issuedBy:"Issued By",customerSignature:"Customer Signature",deliveredBy:"Delivered By",receivedBy:"Received By",address:"Address:",from:"From:",to:"To:",description:"Description",noItems:"No items",grandTotal:"GRAND TOTAL",confidential:"Confidential Business Document",pageOne:"Page 1 of 1",powered:"Powered by MUD Software Company"};async function Nt(t,o){const e=N(),[s,i]=await Promise.all([Q(),X()]),r=(await e.query(`SELECT d.id, d.created_at, d.total_amount, d.paid_amount,
            c.full_name AS customer_name, c.phone AS customer_phone, c.tin_number AS customer_tin,
            c.address AS customer_address
     FROM debts d JOIN customers c ON c.id = d.customer_id WHERE d.id = $1`,[t])).rows[0];if(!r)return null;const d=await e.query(`SELECT di.id, di.debt_id, di.product_id, di.service_id, di.item_type,
            COALESCE(
              NULLIF(TRIM(di.product_name), ''),
              NULLIF(TRIM(p.name), ''),
              NULLIF(TRIM(s.name), ''),
              CASE
                WHEN di.item_type = 'service' AND di.service_id IS NOT NULL THEN CONCAT('Service #', di.service_id)
                WHEN di.product_id IS NOT NULL THEN CONCAT('Product #', di.product_id)
                ELSE 'Item'
              END
            ) AS product_name,
            di.quantity, di.unit_price, di.subtotal
     FROM debt_items di
     LEFT JOIN products p ON p.id = di.product_id
     LEFT JOIN services s ON s.id = di.service_id
     WHERE di.debt_id = $1
     ORDER BY di.id`,[t]);return{businessName:s.name,businessInfo:s,receiptWidth:i.receiptWidth,receiptNo:`RCP-${String(r.id).padStart(4,"0")}`,deliveryNoteNo:`DN-${String(r.id).padStart(4,"0")}`,customerName:r.customer_name,customerPhone:r.customer_phone,customerTin:r.customer_tin,customerAddress:r.customer_address,items:d.rows,total:Number(r.total_amount),paid:Number(r.paid_amount),remaining:Number(r.total_amount)-Number(r.paid_amount),date:r.created_at,issuedBy:o,logoData:s.logoData,taxRate:i.taxRate,taxEnabled:i.taxEnabled,receiptHeader:i.receiptHeader,receiptShowLogo:i.receiptShowLogo,receiptShowSignature:i.receiptShowSignature,receiptShowWatermark:i.receiptShowWatermark,watermarkText:i.watermarkText,signatureName:i.signatureName}}async function St(t,o,e){const s=N(),[i,n]=await Promise.all([Q(),X()]),d=(await s.query(`SELECT p.id, p.paid_at, p.amount, p.debt_id, p.method,
            c.full_name AS customer_name, c.tin_number AS customer_tin,
            d.total_amount AS debt_total, d.paid_amount AS debt_paid
     FROM payments p
     JOIN debts d ON d.id = p.debt_id
     JOIN customers c ON c.id = d.customer_id
     WHERE p.id = $1`,[t])).rows[0];return d?{businessName:i.name,businessInfo:i,receiptWidth:n.receiptWidth,receiptNo:`RCP-${String(d.debt_id).padStart(4,"0")}`,paymentReceiptNo:`RCP-${String(d.id).padStart(4,"0")}`,customerName:d.customer_name,customerTin:d.customer_tin,debtNo:`DEBT-${String(d.debt_id).padStart(4,"0")}`,amountPaid:Number(d.amount),remaining:Number(d.debt_total)-Number(d.debt_paid),method:o[d.method]??d.method,date:d.paid_at,receivedBy:e,logoData:i.logoData,receiptHeader:n.receiptHeader,receiptShowLogo:n.receiptShowLogo,receiptShowSignature:n.receiptShowSignature,receiptShowWatermark:n.receiptShowWatermark,watermarkText:n.watermarkText,signatureName:n.signatureName}:null}function Z(t){const o=t==="58mm"?"58mm":"80mm",e=t==="58mm"?"4px":"6px",s=t==="58mm"?"10px":"13px",i=t==="58mm"?"8px":"9px",n=t==="58mm"?"8.5px":"9.5px",r=t==="58mm"?"8px":"9px",d=t==="58mm"?"9px":"10px",m=t==="58mm"?"11px":"13px",u=t==="58mm"?"7px":"8px",g=t==="58mm"?"6.5px":"7px";return`
    *{box-sizing:border-box;margin:0;padding:0}
    body{
      width:${o};padding:${e};color:#000;background:#fff;
      font-family:'Lucida Console','Lucida Sans Typewriter','Consolas','Courier New',monospace;
      font-size:${n};line-height:1.45;position:relative;overflow:visible;
      -webkit-print-color-adjust:exact;print-color-adjust:exact;
    }
    .watermark{
      position:absolute;top:45%;left:50%;
      transform:translate(-50%,-50%) rotate(-28deg);
      font-size:${t==="58mm"?"32px":"44px"};font-weight:bold;color:#000;
      opacity:0.10;white-space:nowrap;pointer-events:none;z-index:0;
    }
    .content{position:relative;z-index:1;width:100%;}
    .sign,.thank-you,.footer-contact,.footer-powered{page-break-inside:avoid;break-inside:avoid}
    .biz{text-align:center;margin-bottom:2px}
    .biz-logo{display:block;margin:0 auto 4px;max-height:24px;max-width:24px}
    .biz h1{font-size:${s};font-weight:bold;margin:0;letter-spacing:0.3px}
    .biz-slogan{font-size:${i};font-style:italic;margin:2px 0;line-height:1.35}
    .biz-line{font-size:${i};margin:2px 0;color:#222;line-height:1.35}
    .divider{border-bottom:1px dashed #000;margin:3px 0}
    .divider.thick{border-bottom:1px dashed #000;margin:4px 0}
    .doc-title-block{text-align:center;margin:4px 0 2px}
    .doc-title-block .doc-type{font-size:${t==="58mm"?"10px":"12px"};font-weight:bold;letter-spacing:1px;text-transform:uppercase}
    .doc-title-block .doc-no{font-size:${t==="58mm"?"8px":"9px"};font-weight:bold;margin-top:1px}
    .info-table{width:100%;border-collapse:collapse;font-size:${n}}
    .info-table tr td{padding:2px 0;vertical-align:top}
    .info-table tr td.lbl{text-align:left;font-weight:bold;width:42%;white-space:nowrap}
    .info-table tr td.val{text-align:right}
    table.items{width:100%;border-collapse:collapse;font-size:${r};margin:1px 0}
    table.items th{
      border-bottom:1px solid #000;padding:2px 1px;font-weight:bold;
      text-transform:uppercase;letter-spacing:0.2px;
    }
    table.items th.c,table.items td.c{text-align:center}
    table.items th.r,table.items td.r{text-align:right}
    table.items th.l,table.items td.l{text-align:left}
    table.items th.qty,table.items td.qty{width:10%}
    table.items th.price,table.items td.price{width:24%}
    table.items th.tot,table.items td.tot{width:24%}
    table.items th.item{width:42%}
    table.items td{border-bottom:1px dotted #bbb;padding:3px 1px;line-height:1.35}
    table.items td.item-name{font-weight:bold}
    .item-type{font-size:${t==="58mm"?"7px":"8px"};color:#666}
    .sum{margin-top:2px;padding-top:2px;border-top:2px dashed #000}
    .sum-row{display:flex;justify-content:space-between;font-size:${d};margin:1px 0}
    .sum-row.bold{font-weight:bold}
    .sum-row.big{font-size:${m};font-weight:bold;margin-top:2px;padding-top:2px;border-top:1px solid #000}
    .sign{margin-top:14px;display:flex;justify-content:space-between;font-size:${u}}
    .sign div{width:46%;text-align:center}
    .sign .line{border-top:1px solid #000;margin-top:10px;padding-top:2px}
    .sign .sign-name{font-weight:bold;font-size:${u};margin-top:2px}
    .sign .sign-role{font-size:${t==="58mm"?"7px":"8px"};color:#444;font-weight:bold}
    .thank-you{text-align:center;font-size:${d};font-weight:bold;margin:5px 0 3px}
    .footer-contact{text-align:center;font-size:${g};color:#666;margin-top:4px;line-height:1.6}
    .footer-powered{text-align:center;font-size:${g};color:#999;margin-top:3px;border-top:1px dashed #ccc;padding-top:2px}
    @media print{
      body{width:${o};padding:${e}}
      @page{margin:0;size:${o} auto}
    }
  `}function tt(t,o=!0,e){const s=o?`<img src="${t.logoData||"/icon.png"}" class="biz-logo" alt="Ikaze Ledger" />`:"",i=e?`<p class="biz-line" style="font-weight:bold;font-size:${t.name?"9px":"10px"}">${a(e)}</p>`:"",n=[];t.slogan&&n.push(`<p class="biz-slogan">${a(t.slogan)}</p>`),t.address&&n.push(`<p class="biz-line">${a(t.address)}</p>`);const r=[];t.phone&&r.push(`Tel: ${a(t.phone)}`),t.email&&r.push(a(t.email)),r.length&&n.push(`<p class="biz-line">${r.join(" | ")}</p>`),t.website&&n.push(`<p class="biz-line">${a(t.website)}</p>`);const d=[];return t.tinNumber&&d.push(`TIN: ${a(t.tinNumber)}`),t.rssbNumber&&d.push(`RSSB: ${a(t.rssbNumber)}`),d.length&&n.push(`<p class="biz-line">${d.join(" | ")}</p>`),t.showOwnerOnReceipts&&t.ownerName&&n.push(`<p class="biz-line">Owner: ${a(t.ownerName)}</p>`),`<div class="biz">${s}<h1>${a(t.name)}</h1>${i}${n.join("")}</div>`}function et(t){const o=f(),e=new Date,s=`${e.getDate()}/${e.getMonth()+1}/${e.getFullYear()}`,i=`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`,n=[];return t.address&&n.push(a(t.address)),t.phone&&n.push(`Tel: ${a(t.phone)}`),t.email&&n.push(a(t.email)),`${n.length?`<div class="footer-contact">${n.join(" | ")}</div>`:""}
    <div class="footer-powered">Printed: ${s} ${i} &nbsp;|&nbsp; ${o.pageOne} &nbsp;|&nbsp; ${o.powered}</div>`}function mt(t,o=!1){const e=f(),s=t.items.map((i,n)=>{const r=i.item_type==="service"?"SERVICE":"PRODUCT";return`<tr>
        <td class="l item item-name">${n+1}. ${a(i.product_name)}<br><span class="item-type">[${r}]</span></td>
        <td class="c qty">${i.quantity}</td>
        <td class="r price">${c(Number(i.unit_price))}</td>
        <td class="r tot">${c(Number(i.subtotal))}</td>
      </tr>`}).join("");return`<!doctype html><html><head><meta charset="utf-8"><title>Debt Receipt ${a(t.receiptNo)}</title>
  <style>${Z(t.receiptWidth)}</style></head><body>
  ${o?`<div class="watermark">${a(t.watermarkText||t.businessName)}</div>`:""}
  <div class="content">
    ${tt(t.businessInfo,t.receiptShowLogo??!0,t.receiptHeader)}
    <div class="divider thick"></div>
    <div class="doc-title-block">
      <div class="doc-type">${e.debtReceipt}</div>
      <div class="doc-no">${a(t.receiptNo)}</div>
    </div>
    <div class="divider"></div>
    <table class="info-table">
      <tr><td class="lbl">${e.date}</td><td class="val">${a(w(t.date))}</td></tr>
      <tr><td class="lbl">${e.customer}</td><td class="val">${a(t.customerName)}</td></tr>
      ${t.customerPhone?`<tr><td class="lbl">${e.phone}</td><td class="val">${a(t.customerPhone)}</td></tr>`:""}
      ${t.customerTin?`<tr><td class="lbl">${e.tin}</td><td class="val">${a(t.customerTin)}</td></tr>`:""}
    </table>
    <div class="divider"></div>
    <table class="items">
      <thead><tr><th class="l item">${e.item}</th><th class="c qty">${e.qty}</th><th class="r price">${e.price}</th><th class="r tot">${e.total}</th></tr></thead>
      <tbody>${s}</tbody>
    </table>
    <div class="sum">
      <div class="sum-row bold"><span>${e.total}:</span><span>${c(t.total)}</span></div>
      <div class="sum-row"><span>${e.paid}:</span><span>${c(t.paid)}</span></div>
      ${t.taxEnabled&&t.taxRate?`<div class="sum-row"><span>Tax (${t.taxRate}%):</span><span>${c(t.total*t.taxRate/100)}</span></div>`:""}
      <div class="sum-row big"><span>${e.balanceDue}</span><span>${c(t.remaining)}</span></div>
    </div>
    ${t.receiptShowSignature===!1?"":`<div class="sign">
      <div>
        <div class="line">&nbsp;</div>
        <div class="sign-role">${e.issuedBy}</div>
        <div class="sign-name">${a(t.signatureName||t.issuedBy)}</div>
      </div>
      <div>
        <div class="line">&nbsp;</div>
        <div class="sign-role">${e.customerSignature}</div>
        <div class="sign-name">${a(t.customerName)}</div>
      </div>
    </div>`}
    <div class="divider"></div>
    ${et(t.businessInfo)}
  </div>
  </body></html>`}function ut(t,o=!1){const e=f();return`<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt ${a(t.paymentReceiptNo)}</title>
  <style>${Z(t.receiptWidth)}</style></head><body>
  ${o?`<div class="watermark">${a(t.watermarkText||t.businessName)}</div>`:""}
  <div class="content">
    ${tt(t.businessInfo,t.receiptShowLogo??!0,t.receiptHeader)}
    <div class="divider thick"></div>
    <div class="doc-title-block">
      <div class="doc-type">${e.paymentReceipt}</div>
      <div class="doc-no">${a(t.paymentReceiptNo)}</div>
    </div>
    <div class="divider"></div>
    <table class="info-table">
      <tr><td class="lbl">${e.date}</td><td class="val">${a(w(t.date))}</td></tr>
      <tr><td class="lbl">${e.customer}</td><td class="val">${a(t.customerName)}</td></tr>
      ${t.customerTin?`<tr><td class="lbl">${e.tin}</td><td class="val">${a(t.customerTin)}</td></tr>`:""}
      <tr><td class="lbl">${e.debtNo}</td><td class="val">${a(t.debtNo)}</td></tr>
      <tr><td class="lbl">${e.method}</td><td class="val">${a(t.method)}</td></tr>
    </table>
    <div class="divider"></div>
    <div class="sum">
      <div class="sum-row big" style="justify-content:center;font-size:${t.receiptWidth==="58mm"?"14px":"18px"}"><span>${e.amountPaid}</span></div>
      <div class="sum-row big" style="justify-content:center;font-size:${t.receiptWidth==="58mm"?"16px":"20px"}"><span>${c(t.amountPaid)}</span></div>
    </div>
    <div class="divider"></div>
    <div class="sum-row bold"><span>${e.remainingBalance}:</span><span>${c(t.remaining)}</span></div>
    ${t.receiptShowSignature===!1?"":`<div class="sign">
      <div>
        <div class="line">&nbsp;</div>
        <div class="sign-role">${e.issuedBy}</div>
        <div class="sign-name">${a(t.signatureName||t.receivedBy)}</div>
      </div>
      <div>
        <div class="line">&nbsp;</div>
        <div class="sign-role">${e.customerSignature}</div>
        <div class="sign-name">${a(t.customerName)}</div>
      </div>
    </div>`}
    <div class="divider"></div>
    ${et(t.businessInfo)}
  </div>
  </body></html>`}function I(t){const o=t==="a4"?{pad:"10mm 10mm 16mm 10mm",contentH:"271mm",fs:"10px"}:{pad:"8mm 8mm 12mm 8mm",contentH:"190mm",fs:"9px"};return`
    @page { margin: ${o.pad}; size: ${t==="a4"?"A4":"A5"}; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: ${o.fs}; color: #111; background: #fff; }
    .page { width: 100%; min-height: ${o.contentH}; position: relative; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: ${t==="a4"?"80px":"56px"}; font-weight: bold; color: #000; opacity: 0.06; white-space: nowrap; pointer-events: none; z-index: 0; letter-spacing: 3px; }
    .content { position: relative; z-index: 1; }

    /* Company header — no title badge */
    .ph-wrap { border: 2px solid #0d9488; border-radius: 10px; overflow: hidden; margin-bottom: 6px; }
    .ph-inner { display: flex; align-items: center; gap: 14px; padding: 6px 10px; background: #f0fdfa; }
    .ph-logo { width: ${t==="a4"?"56px":"44px"}; height: ${t==="a4"?"56px":"44px"}; object-fit: contain; border-radius: 8px; flex-shrink: 0; border: 1px solid #0d9488; }
    .ph-biz { flex: 1; text-align: center; }
    .ph-name { font-size: ${t==="a4"?"20px":"16px"}; font-weight: bold; color: #0f766e; letter-spacing: 0.3px; }
    .ph-slogan { font-size: 10px; font-style: italic; color: #475569; margin: 1px 0 2px; }
    .ph-line { font-size: 10px; color: #475569; margin: 0.5px 0; }

    /* Document title block — centered between header and customer info */
    .doc-title-block { text-align: center; margin: 6px 0 5px; }
    .doc-title-block .doc-type {
      font-size: ${t==="a4"?"18px":"15px"};
      font-weight: bold;
      color: #0f766e;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .doc-title-block .doc-no {
      font-size: ${t==="a4"?"12px":"11px"};
      font-weight: bold;
      color: #334155;
      margin-top: 2px;
      letter-spacing: 1px;
    }
    .doc-title-divider { border: none; border-top: 1px solid #0d9488; margin: 8px 0; }

    .doc-meta { display: flex; justify-content: space-between; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px; margin: 5px 0; background: #f8fafc; }
    .doc-meta table { font-size: ${o.fs}; }
    .doc-meta table td { padding: 2px 6px 2px 0; vertical-align: top; }
    .doc-meta table td.lbl { font-weight: bold; white-space: nowrap; color: #475569; }

    table.doc-items { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: ${o.fs}; margin: 6px 0; }
    table.doc-items th { border: 1px solid #2563eb; padding: 3px 3px; font-weight: bold; background: #dbeafe; color: #1e40af; text-align: center; word-wrap: break-word; overflow-wrap: break-word; }
    table.doc-items th.l { text-align: left; }
    table.doc-items th.r { text-align: right; }
    table.doc-items td { border: 1px solid #888; padding: 3px 3px; word-wrap: break-word; overflow-wrap: break-word; }
    table.doc-items td.c { text-align: center; }
    table.doc-items td.r { text-align: right; }
    table.doc-items thead { display: table-header-group; }
    table.doc-items tbody { display: table-row-group; }
    table.doc-items tr { page-break-inside: avoid; break-inside: avoid; }
    table.doc-items tr:nth-child(even) td { background: #f9f9f9; }

    .doc-totals { margin-top: 5px; margin-left: auto; width: ${t==="a4"?"240px":"200px"}; border: 1px solid #888; page-break-inside: avoid; break-inside: avoid; }
    .doc-totals table { width: 100%; border-collapse: collapse; font-size: ${o.fs}; }
    .doc-totals table td { padding: 3px 6px; border-bottom: 1px solid #ddd; }
    .doc-totals table td.tv { text-align: right; font-weight: 600; }
    .doc-totals .grand td { font-size: ${t==="a4"?"14px":"12px"}; font-weight: bold; border-top: 3px solid #f59e0b; border-bottom: none; color: #1e40af; background: #eff6ff; }

    /* Signature: line above name */
    .doc-sign { margin-top: 18px; display: flex; justify-content: space-between; gap: 16px; page-break-inside: avoid; break-inside: avoid; }
    .doc-sign-block { flex: 1; text-align: center; padding: 0 8px; }
    .doc-sign-line { border-top: 1px solid #333; margin-top: 18px; padding-top: 4px; }
    .doc-sign-role { font-size: ${o.fs}; font-weight: bold; color: #0f766e; margin-top: 3px; }
    .doc-sign-name { font-size: ${o.fs}; color: #334155; margin-top: 1px; }

    /* Footer pinned to bottom */
    .pf-wrap { position: fixed; left: 0; right: 0; bottom: 4mm; margin: 0; width: 100%; page-break-inside: avoid; break-inside: avoid; background: #fff; }
    .pf-inner { border-top: 1px solid #0d9488; padding-top: 4px; }
    .pf-contact { text-align: center; font-size: 8px; color: #475569; margin-bottom: 3px; }
    .pf-meta { display: flex; justify-content: space-between; font-size: 7px; color: #999; }

    @media print { html, body { background:#fff!important;color:#111!important;color-scheme:light!important; } .page{margin:0;min-height:0;padding-bottom:18mm}.pf-wrap{position:fixed!important;left:0!important;right:0!important;bottom:4mm!important;margin:0!important;background:#fff!important;page-break-inside:avoid;break-inside:avoid;} }
  `}function E(t,o,e,s=!0,i){const n=s?`<img src="${o||"/icon.png"}" class="ph-logo" alt="Ikaze Ledger" />`:"",r=i?`<p class="ph-line" style="font-weight:bold">${a(i)}</p>`:"",d=[];e.slogan&&d.push(`<p class="ph-slogan"><em>${a(e.slogan)}</em></p>`),e.address&&d.push(`<p class="ph-line">${a(e.address)}</p>`);const m=[];e.phone&&m.push(`Tel: ${a(e.phone)}`),e.email&&m.push(a(e.email)),e.website&&m.push(a(e.website)),m.length&&d.push(`<p class="ph-line">${m.join(" &nbsp;|&nbsp; ")}</p>`);const u=[];if(e.tinNumber&&u.push(`TIN: ${a(e.tinNumber)}`),e.rssbNumber&&u.push(`RSSB: ${a(e.rssbNumber)}`),u.length&&d.push(`<p class="ph-line">${u.join(" &nbsp;|&nbsp; ")}</p>`),e.bankName||e.bankAccount){const g=[];e.bankName&&g.push(a(e.bankName)),e.bankAccount&&g.push(`Acct: ${a(e.bankAccount)}`),d.push(`<p class="ph-line">Bank: ${g.join(" — ")}</p>`)}return`<div class="ph-wrap"><div class="ph-inner">
    ${n}
    <div class="ph-biz">
      <h1 class="ph-name">${a(t)}</h1>
      ${r}${d.join("")}
    </div>
  </div></div>`}function A(t,o){return`<div class="doc-title-block">
    <div class="doc-type">${a(t)}</div>
    <div class="doc-no">${a(o)}</div>
  </div>
  <hr class="doc-title-divider" />`}function D(t){const o=f(),e=new Date,s=`${e.getDate()}/${e.getMonth()+1}/${e.getFullYear()}`,i=`${String(e.getHours()).padStart(2,"0")}:${String(e.getMinutes()).padStart(2,"0")}`,n=[];return t.address&&n.push(a(t.address)),t.phone&&n.push(`Tel: ${a(t.phone)}`),t.email&&n.push(a(t.email)),`<div class="pf-wrap"><div class="pf-inner">
    ${n.length?`<div class="pf-contact">${n.join(" &nbsp;|&nbsp; ")}</div>`:""}
    <div class="pf-meta">
      <span>${o.confidential}</span>
      <span>Printed: ${s} ${i}</span>
      <span>${o.pageOne}</span>
      <span>${o.powered}</span>
    </div>
  </div></div>`}function K(t,o="a4",e=!1){const s=f(),i=t.items.map((n,r)=>`<tr>
      <td class="c" style="width:5%">${r+1}</td>
      <td style="width:30%"><strong>${a(n.product_name)}</strong></td>
      <td class="c" style="width:10%">${n.quantity}</td>
      <td class="r" style="width:27%">${c(Number(n.unit_price))}</td>
      <td class="r" style="width:28%">${c(Number(n.subtotal))}</td>
    </tr>`).join("");return`<!doctype html><html><head><meta charset="utf-8"><title>Debt Receipt ${a(t.receiptNo)}</title>
  <style>${I(o)}</style></head><body>
  ${e?`<div class="watermark">${a(t.watermarkText||t.businessName)}</div>`:""}
  <div class="page"><div class="content">
    ${E(t.businessName,t.logoData,t.businessInfo,t.receiptShowLogo??!0,t.receiptHeader)}
    ${A(s.debtReceipt,t.receiptNo)}
    <div class="doc-meta">
      <table>
        <tr><td class="lbl">${s.customer}</td><td><strong>${a(t.customerName)}</strong></td></tr>
        ${t.customerPhone?`<tr><td class="lbl">${s.phone}</td><td>${a(t.customerPhone)}</td></tr>`:""}
        ${t.customerTin?`<tr><td class="lbl">${s.tin}</td><td>${a(t.customerTin)}</td></tr>`:""}
      </table>
      <table style="text-align:right">
        <tr><td class="lbl">${s.date}</td><td>${a(w(t.date))}</td></tr>
      </table>
    </div>
    <table class="doc-items">
      <thead><tr>
        <th style="width:5%">No</th><th class="l" style="width:30%">${s.item}</th>
        <th style="width:10%">${s.qty}</th><th class="r" style="width:27%">${s.price}</th>
        <th class="r" style="width:28%">${s.total}</th>
      </tr></thead>
      <tbody>${i||`<tr><td colspan="5" style="text-align:center;color:#999">${s.noItems}</td></tr>`}</tbody>
    </table>
    <div class="doc-totals">
      <table>
        <tr><td>${s.total}</td><td class="tv">${c(t.total)}</td></tr>
        <tr><td>${s.paid}</td><td class="tv">${c(t.paid)}</td></tr>
        ${t.taxEnabled&&t.taxRate?`<tr><td>Tax (${t.taxRate}%)</td><td class="tv">${c(t.total*t.taxRate/100)}</td></tr>`:""}
        <tr class="grand"><td>${s.balanceDue}</td><td class="tv">${c(t.remaining)}</td></tr>
      </table>
    </div>
    ${t.receiptShowSignature===!1?"":`<div class="doc-sign">
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">${s.issuedBy}</div>
        <div class="doc-sign-name">${a(t.signatureName||t.issuedBy)}</div>
      </div>
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">${s.customerSignature}</div>
        <div class="doc-sign-name">${a(t.customerName)}</div>
      </div>
    </div>`}
  </div>
  ${D(t.businessInfo)}
  </div></body></html>`}function V(t,o="a4",e=!1){const s=f();return`<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt ${a(t.paymentReceiptNo)}</title>
  <style>${I(o)}</style></head><body>
  ${e?`<div class="watermark">${a(t.watermarkText||t.businessName)}</div>`:""}
  <div class="page"><div class="content">
    ${E(t.businessName,t.logoData,t.businessInfo,t.receiptShowLogo??!0,t.receiptHeader)}
    ${A(s.paymentReceipt,t.paymentReceiptNo)}
    <div class="doc-meta">
      <table>
        <tr><td class="lbl">${s.customer}</td><td><strong>${a(t.customerName)}</strong></td></tr>
        ${t.customerTin?`<tr><td class="lbl">${s.tin}</td><td>${a(t.customerTin)}</td></tr>`:""}
        <tr><td class="lbl">${s.debtNo}</td><td>${a(t.debtNo)}</td></tr>
        <tr><td class="lbl">${s.method}</td><td>${a(t.method)}</td></tr>
      </table>
      <table style="text-align:right">
        <tr><td class="lbl">${s.date}</td><td>${a(w(t.date))}</td></tr>
      </table>
    </div>
    <div class="doc-totals">
      <table>
        <tr class="grand"><td>${s.amountPaid}</td><td class="tv">${c(t.amountPaid)}</td></tr>
        <tr><td>${s.remainingBalance}</td><td class="tv">${c(t.remaining)}</td></tr>
      </table>
    </div>
    ${t.receiptShowSignature===!1?"":`<div class="doc-sign">
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">${s.issuedBy}</div>
        <div class="doc-sign-name">${a(t.signatureName||t.receivedBy)}</div>
      </div>
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">${s.customerSignature}</div>
        <div class="doc-sign-name">${a(t.customerName)}</div>
      </div>
    </div>`}
  </div>
  ${D(t.businessInfo)}
  </div></body></html>`}function bt(t,o=!1){const e=f(),s=t.items.map((i,n)=>`<tr>
      <td class="c" style="width:5%">${n+1}</td>
      <td style="width:28%"><strong>${a(i.product_name)}</strong></td>
      <td style="width:22%">${a(i.item_type==="service"?"Service":"Product")}</td>
      <td class="c" style="width:10%">${i.quantity}</td>
      <td class="r" style="width:17%">${c(Number(i.unit_price))}</td>
      <td class="r" style="width:18%">${c(Number(i.subtotal))}</td>
    </tr>`).join("");return`<!doctype html><html><head><meta charset="utf-8"><title>Delivery Note ${a(t.deliveryNoteNo)}</title>
  <style>${I("a4")}</style></head><body>
  ${o?`<div class="watermark">${a(t.watermarkText||t.businessName)}</div>`:""}
  <div class="page"><div class="content">
    ${E(t.businessName,t.logoData,t.businessInfo,t.receiptShowLogo??!0,t.receiptHeader)}
    ${A(e.deliveryNote,t.deliveryNoteNo)}
    <div class="doc-meta">
      <table>
        <tr><td class="lbl">${e.from}</td><td>${a(t.businessName)}</td></tr>
        <tr><td class="lbl">${e.date}</td><td>${a(w(t.date))}</td></tr>
      </table>
      <table style="text-align:right">
        <tr><td class="lbl">${e.to}</td><td><strong>${a(t.customerName)}</strong></td></tr>
        ${t.customerPhone?`<tr><td class="lbl">${e.phone}</td><td>${a(t.customerPhone)}</td></tr>`:""}
        ${t.customerAddress?`<tr><td class="lbl">${e.address}</td><td>${a(t.customerAddress)}</td></tr>`:""}
      </table>
    </div>
    <table class="doc-items">
      <thead><tr>
        <th style="width:5%">No</th><th class="l" style="width:28%">${e.item}</th>
        <th class="l" style="width:22%">${e.description}</th><th style="width:10%">${e.qty}</th>
        <th class="r" style="width:17%">${e.price}</th><th class="r" style="width:18%">${e.total}</th>
      </tr></thead>
      <tbody>${s||`<tr><td colspan="6" style="text-align:center;color:#999">${e.noItems}</td></tr>`}</tbody>
    </table>
    <div class="doc-totals">
      <table>
        <tr class="grand"><td>${e.grandTotal}</td><td class="tv">${c(t.total)}</td></tr>
      </table>
    </div>
    <div class="doc-sign">
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">${e.deliveredBy}</div>
        <div class="doc-sign-name">${a(t.signatureName||t.issuedBy)}</div>
      </div>
      <div class="doc-sign-block">
        <div class="doc-sign-line">&nbsp;</div>
        <div class="doc-sign-role">${e.receivedBy}</div>
        <div class="doc-sign-name">${a(t.customerName)}</div>
      </div>
    </div>
  </div>
  ${D(t.businessInfo)}
  </div></body></html>`}function kt(t,o="receipt",e=!1){const s=o==="receipt"?mt(t,e):o==="a4"?K(t,"a4",e):K(t,"a5",e);T(s)}function _t(t,o="receipt",e=!1){const s=o==="receipt"?ut(t,e):o==="a4"?V(t,"a4",e):V(t,"a5",e);T(s)}function Rt(t,o=!1){T(bt(t,o))}function a(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}export{wt as P,Rt as a,St as b,_t as c,Nt as l,kt as p};
