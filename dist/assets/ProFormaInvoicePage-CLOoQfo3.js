const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/pdf-VqX-3e2W.js","assets/pglite-BhcyFatL.js"])))=>i.map(i=>d[i]);
import{_ as Ue}from"./pglite-BhcyFatL.js";import{u as bt,c as gt,g as W,d as ft,e as vt,q as yt,s as wt,t as Nt,f as b,w as jt,x as $t,y as kt,z as be,p as _t,C as St,D as Ct,E as Tt,F as It,j as t,A as Ge,I as ge,B as M}from"./index-BCQsFW6n.js";import{r as n}from"./react-vendor-Ditm_yxA.js";import{f as fe,P as Pt}from"./formatDate-DR1Q4Vus.js";import{S as Et}from"./Select-BR59jajt.js";import{P as Rt}from"./PrintPreviewModal-Cy2fQSzL.js";import{a as Ft,m as Dt,c as ve,T as ye,X as Lt,a8 as qt,a9 as zt,a6 as Ot,aa as Bt,N as At,h as Mt,x as Ht}from"./icons-vY5Bsfa6.js";import"./Modal-B_Gu1Wjd.js";async function Ve(I,s){if(!s.length)return[];const N=[...new Set(s.filter(u=>u.item_type!=="service"&&u.product_id).map(u=>u.product_id))],Y=[...new Set(s.filter(u=>u.item_type==="service"&&u.service_id).map(u=>u.service_id))],[ie,K]=await Promise.all([N.length?I.query("SELECT id, name FROM products WHERE id = ANY($1)",[N]):Promise.resolve({rows:[]}),Y.length?I.query("SELECT id, name FROM services WHERE id = ANY($1)",[Y]):Promise.resolve({rows:[]})]),de=new Map(ie.rows.map(u=>[u.id,u.name])),X=new Map(K.rows.map(u=>[u.id,u.name]));return s.map(u=>{const p=u.item_type==="service"?u.service_id?X.get(u.service_id):void 0:u.product_id?de.get(u.product_id):void 0;return{...u,product_name:p?.trim()||u.product_name?.trim()||(u.item_type==="service"?`Service #${u.service_id??""}`:`Product #${u.product_id??""}`)}})}let we=1;const te=()=>({id:we++,productId:"",serviceId:"",itemType:"product",productName:"",description:"",unit:"",quantity:1,unitPrice:0,total:0}),c=I=>I.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function Jt(){const{t:I}=bt(),s=I.proforma,{user:N}=gt(),[Y,ie]=n.useState([]),[K,de]=n.useState([]),[X,u]=n.useState([]),[p,Ke]=n.useState(null),[P,Xe]=n.useState(0),[j,ce]=n.useState(null),[$,Q]=n.useState(""),[J,se]=n.useState(""),[k,ae]=n.useState(""),[y,F]=n.useState([te()]),[H,Ne]=n.useState(0),[U,je]=n.useState("fixed"),[E,$e]=n.useState(!1),[D,ke]=n.useState(!1),[L,_e]=n.useState(!1),[_,Se]=n.useState(""),[S,Ce]=n.useState(""),[Te,q]=n.useState(""),[Ie,R]=n.useState(""),[Qe,re]=n.useState(!1),[Je,Ze]=n.useState(""),[ue,le]=n.useState(""),[Pe,oe]=n.useState(null),Ee=n.useRef(null),[Re,et]=n.useState([]),[tt,st]=n.useState(!0),[G,at]=n.useState("all"),[pe,rt]=n.useState(""),[Fe,xe]=n.useState(null),V=n.useCallback(async()=>{const r=await W().query(`SELECT
        id,
        invoice_no,
        customer_id,
        customer_name,
        quotation_date,
        status,
        subtotal,
        grand_total,
        created_at,
        updated_at
       FROM proforma_invoices
       ORDER BY created_at DESC`);et(r.rows),st(!1)},[]);n.useEffect(()=>{(async()=>{const a=W(),[r,e,o,d,l]=await Promise.all([a.query("SELECT * FROM customers ORDER BY full_name"),a.query("SELECT * FROM products ORDER BY name"),a.query(`SELECT *
           FROM services
           WHERE status = 'active'
           ORDER BY name`),ft(),vt()]);ie(r.rows),de(e.rows),u(o.rows),Ke(d),Xe(l.taxRate),await V()})()},[V]);const z=n.useCallback(async()=>{const e=(await W().query(`SELECT invoice_no
       FROM proforma_invoices
       ORDER BY id DESC
       LIMIT 1`)).rows[0]?.invoice_no;if(e){const o=parseInt(e.replace("PF-",""),10);return`PF-${String(Number.isNaN(o)?1:o+1).padStart(4,"0")}`}return"PF-0001"},[]);n.useEffect(()=>{j||z().then(Q)},[j,z]);const m=n.useMemo(()=>Y.find(a=>a.id===J)??null,[Y,J]),me=n.useMemo(()=>{const a=K.map(e=>({...e,itemType:"product",category:e.category??null,sku:e.sku??null,unit:e.unit??null,description:e.description??null})),r=X.map(e=>({id:e.id,name:e.name,description:e.description??null,category:null,sku:null,unit:null,selling_price:e.default_price,itemType:"service"}));return[...a,...r]},[K,X]),De=n.useMemo(()=>{const a=ue.toLowerCase().trim();return a?me.filter(r=>r.name.toLowerCase().includes(a)||(r.category??"").toLowerCase().includes(a)||(r.sku??"").toLowerCase().includes(a)||(r.unit??"").toLowerCase().includes(a)||(r.description??"").toLowerCase().includes(a)):me},[me,ue]),Le=n.useMemo(()=>{let a=Re;G!=="all"&&(a=a.filter(e=>e.status===G));const r=pe.toLowerCase().trim();return r&&(a=a.filter(e=>e.customer_name.toLowerCase().includes(r)||e.invoice_no.toLowerCase().includes(r))),a},[Re,G,pe]),w=n.useMemo(()=>y.reduce((a,r)=>a+Number(r.total||0),0),[y]),C=n.useMemo(()=>U==="percent"?w*(H/100):H,[w,H,U]),qe=w-C,T=E?qe*(P/100):0,O=qe+T,he=n.useCallback((a,r,e)=>{F(o=>o.map(d=>{if(d.id!==a)return d;const l={...d,[r]:e};return(r==="quantity"||r==="unitPrice")&&(l.total=Number(l.quantity||0)*Number(l.unitPrice||0)),l}))},[]),lt=n.useCallback((a,r)=>{F(e=>e.map(o=>{if(o.id!==a)return o;const d=r.itemType==="service",l=Number(r.selling_price||0);return{...o,productId:d?"":r.id,serviceId:d?r.id:"",itemType:d?"service":"product",productName:r.name,description:r.description||"",unit:r.unit||(d?"service":""),unitPrice:l,total:Number(o.quantity||0)*l}})),le(""),oe(null)},[]),ot=n.useCallback(()=>{F(a=>[...a,te()])},[]),nt=n.useCallback(a=>{F(r=>r.length>1?r.filter(e=>e.id!==a):r)},[]),it=n.useCallback(a=>{oe(a),le(""),setTimeout(()=>{Ee.current?.focus()},50)},[]),dt=n.useCallback(a=>{F(r=>r.map(e=>e.id!==a?e:{...e,productId:"",serviceId:"",itemType:"product",productName:"",description:"",unit:"",unitPrice:0,total:0}))},[]),ne=n.useCallback(()=>{if(!p)return"";const a=yt({businessInfo:p,documentTitle:s.proformaInvoice}),r=wt(s.proformaInvoice,$),e=Nt({businessInfo:p,confidentialLabel:s.confidential,pageLabel:"",poweredBy:"Powered by MUD Software Company"}),o=y.filter(h=>h.productName).map((h,f)=>`
          <tr>
            <td class="c" style="width:5%">
              ${f+1}
            </td>

            <td style="width:22%">
              <strong>${c(h.productName)}</strong>
              ${h.itemType==="service"?`<div style="font-size:8px;color:#2563eb;font-weight:bold">${typeof localStorage<"u"&&localStorage.getItem("dms-language")==="rw"?"SERIVISI":"SERVICE"}</div>`:""}
            </td>

            <td style="width:28%">
              ${c(h.description||"")}
            </td>

            <td class="c" style="width:9%">
              ${c(h.unit||"—")}
            </td>

            <td class="c" style="width:8%">
              ${h.quantity}
            </td>

            <td class="r" style="width:14%">
              ${b(h.unitPrice)}
            </td>

            <td class="r" style="width:14%">
              ${b(h.total)}
            </td>
          </tr>
        `).join(""),d=D?`<div class="watermark">${c(p.name)}</div>`:"",l=L?`
        <div class="pi-sign">
          <div class="pi-sign-block">
            <div class="pi-sign-line">&nbsp;</div>
            <div class="pi-sign-name">
              ${c(N?.full_name||"—")}
            </div>
            <div class="pi-sign-role">
              ${c(s.preparedBy)}
            </div>
          </div>

          <div class="pi-sign-block">
            <div class="pi-sign-line">&nbsp;</div>
            <div class="pi-sign-name">&nbsp;</div>
            <div class="pi-sign-role">
              ${c(s.customerReceived)}
            </div>
          </div>
        </div>
      `:"",g=k?`
        <tr>
          <td class="dlbl">
            ${c(s.quotationDate)}:
          </td>

          <td class="dval">
            ${c(fe(k))}
          </td>
        </tr>
      `:"";return`
      <!doctype html>

      <html>
        <head>
          <meta charset="utf-8">

          <title>
            ${c(s.title)} ${c($)}
          </title>

          <style>
            ${jt}

            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform:
                translate(-50%,-50%)
                rotate(-30deg);

              font-size: 90px;
              font-weight: bold;
              color: #000;
              opacity: 0.06;
              white-space: nowrap;
              pointer-events: none;
              z-index: 0;
              letter-spacing: 4px;
            }

            .content {
              position: relative;
              z-index: 1;
            }

            .pi-meta {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin: 6px 0 8px;
              border: 1px solid ${$t};
              border-radius: 6px;
              padding: 8px 12px;
              background: ${kt};
            }

            table.doc-table {
              width: 100%;
              table-layout: fixed;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 10px;
            }

            table.doc-table th {
              border: 1px solid #2563eb;
              padding: 5px 4px;
              font-weight: bold;
              background: #dbeafe;
              color: #1e40af;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              font-size: 9px;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            table.doc-table th.l {
              text-align: left;
            }

            table.doc-table td {
              border: 1px solid #cbd5e1;
              padding: 4px;
              vertical-align: top;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            table.doc-table td.c {
              text-align: center;
            }

            table.doc-table td.r {
              text-align: right;
            }

            table.doc-table tbody tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            table.doc-table tbody tr:nth-child(even) {
              background: #f8fafc;
            }

            .pi-client td {
              padding: 2px 4px 2px 0;
              font-size: 10px;
              vertical-align: top;
            }

            .pi-client td.lbl {
              font-weight: bold;
              white-space: nowrap;
              width: 90px;
              color: ${be};
            }

            .pi-dates {
              text-align: right;
            }

            .pi-dates table td {
              padding: 2px 0 2px 10px;
              font-size: 10px;
            }

            .pi-dates table td.dlbl {
              font-weight: bold;
              text-align: right;
              white-space: nowrap;
              color: ${be};
            }

            .pi-dates table td.dval {
              text-align: right;
            }

            .pi-totals {
              margin-top: 8px;
              margin-left: auto;
              width: 280px;
              border: 1px solid #2563eb;
              border-radius: 6px;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .pi-totals table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }

            .pi-totals table td {
              padding: 6px 10px;
              border-bottom: 1px solid #ddd;
            }

            .pi-totals table td.tv {
              text-align: right;
              font-weight: 600;
            }

            .pi-totals .grand td {
              font-size: 14px;
              font-weight: bold;
              border-top: 3px solid #f59e0b;
              border-bottom: none;
              color: #1e40af;
              background: #eff6ff;
            }

            .pi-notes {
              margin-top: 12px;
            }

            .pi-notes h4 {
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 3px;
              color: ${be};
            }

            .pi-notes p {
              font-size: 9px;
              color: #555;
              white-space: pre-wrap;
              line-height: 1.6;
            }

            .pi-sign {
              margin-top: 30px;
              display: flex;
              justify-content: space-around;
              gap: 16px;
            }

            .pi-sign-block {
              flex: 1;
              text-align: center;
            }

            .pi-sign-line {
              border-top: 1px solid #333;
              margin-top: 32px;
              padding-top: 3px;
            }

            .pi-sign-name {
              font-size: 10px;
              font-weight: bold;
              margin-top: 2px;
            }

            .pi-sign-role {
              font-size: 8px;
              color: #666;
              margin-top: 1px;
            }

            @media print {
              body {
                background: #fff;
              }

              .page {
                margin: 0;
              }

              .watermark {
                position: fixed;
              }
            }
          </style>
        </head>

        <body>

          ${d}

          <div class="page">

            <div class="content">

              ${a}

              ${r}

              <div class="pi-meta">

                <table class="pi-client">

                  <tr>
                    <td class="lbl">
                      ${c(s.customer)}:
                    </td>

                    <td>
                      <strong>
                        ${c(m?.full_name||"—")}
                      </strong>
                    </td>
                  </tr>

                  ${m?.phone?`
                        <tr>
                          <td class="lbl">
                            ${c(s.phone)}:
                          </td>

                          <td>
                            ${c(m.phone)}
                          </td>
                        </tr>
                      `:""}

                  ${m?.tin_number?`
                        <tr>
                          <td class="lbl">
                            ${c(s.customerTin)}:
                          </td>

                          <td>
                            ${c(m.tin_number)}
                          </td>
                        </tr>
                      `:""}

                  ${m?.address?`
                        <tr>
                          <td class="lbl">
                            Address:
                          </td>

                          <td>
                            ${c(m.address)}
                          </td>
                        </tr>
                      `:""}

                </table>

                <div class="pi-dates">

                  <table>
                    ${g}
                  </table>

                </div>

              </div>

              <table class="doc-table">

                <thead>
                  <tr>
                    <th style="width:5%">
                      ${c(s.no)}
                    </th>

                    <th
                      class="l"
                      style="width:22%"
                    >
                      ${c(s.item)}
                    </th>

                    <th
                      class="l"
                      style="width:28%"
                    >
                      ${c(s.description)}
                    </th>

                    <th style="width:9%">
                      ${c(s.unit)}
                    </th>

                    <th style="width:8%">
                      ${c(s.qty)}
                    </th>

                    <th
                      class="r"
                      style="width:14%"
                    >
                      ${c(s.unitPrice)}
                    </th>

                    <th
                      class="r"
                      style="width:14%"
                    >
                      ${c(s.total)}
                    </th>
                  </tr>
                </thead>

                <tbody>

                  ${o||`
                      <tr>
                        <td
                          colspan="7"
                          style="
                            text-align:center;
                            padding:12px;
                            color:#999
                          "
                        >
                          ${c(s.noItems)}
                        </td>
                      </tr>
                    `}

                </tbody>

              </table>

              <div class="pi-totals">

                <table>

                  <tr>
                    <td>
                      ${c(s.subtotal)}
                    </td>

                    <td class="tv">
                      ${b(w)}
                    </td>
                  </tr>

                  ${C>0?`
                        <tr>
                          <td>
                            ${c(s.discount)}
                          </td>

                          <td class="tv">
                            - ${b(C)}
                          </td>
                        </tr>
                      `:""}

                  ${E&&T>0?`
                        <tr>
                          <td>
                            ${c(s.tax)}
                            (${P}%)
                          </td>

                          <td class="tv">
                            ${b(T)}
                          </td>
                        </tr>
                      `:""}

                  <tr class="grand">

                    <td>
                      <strong>
                        ${c(s.grandTotal)}
                      </strong>
                    </td>

                    <td class="tv">
                      <strong>
                        ${b(O)}
                      </strong>
                    </td>

                  </tr>

                </table>

              </div>

              ${_?`
                    <div class="pi-notes">
                      <h4>
                        ${c(s.termsConditions)}
                      </h4>

                      <p>
                        ${c(_)}
                      </p>
                    </div>
                  `:""}

              ${S?`
                    <div
                      class="pi-notes"
                      style="margin-top:8px"
                    >
                      <h4>
                        ${c(s.customerNotes)}
                      </h4>

                      <p>
                        ${c(S)}
                      </p>
                    </div>
                  `:""}

              ${l}

            </div>

            ${e}

          </div>

        </body>
      </html>
    `},[p,y,m,$,k,w,C,E,T,P,O,_,S,N,D,L,s]),ze=n.useCallback(()=>{p&&(Ze(ne()),re(!0))},[p,ne]),ct=n.useCallback(()=>{_t(ne()),re(!1)},[ne]),Oe=n.useCallback(()=>J?y.some(r=>r.itemType==="service"?!!r.serviceId:!!r.productId)?null:s.addAtLeastOneItem:s.selectCustomerFirst,[J,y,s]),Be=n.useCallback(async a=>{const r=Oe();if(r){q(r),R("");return}if(!N)return;const e=W(),o=m,d=y.filter(l=>l.itemType==="service"?!!l.serviceId:!!l.productId).map(l=>{const g=l.itemType==="service"?X.find(h=>h.id===l.serviceId):K.find(h=>h.id===l.productId);return{...l,productName:l.productName.trim()||g?.name||(l.itemType==="service"?`Service #${l.serviceId}`:`Product #${l.productId}`)}});try{if(await e.query("BEGIN"),j){await e.query(`UPDATE proforma_invoices
             SET
              customer_id = $1,
              customer_name = $2,
              customer_phone = $3,
              customer_tin = $4,
              customer_address = $5,
              quotation_date = $6,
              status = $7,
              subtotal = $8,
              discount_amount = $9,
              discount_type = $10,
              discount_value = $11,
              tax_rate = $12,
              tax_enabled = $13,
              tax_amount = $14,
              grand_total = $15,
              terms = $16,
              notes = $17,
              show_watermark = $18,
              show_signature = $19,
              updated_at = now()
             WHERE id = $20`,[o?.id??null,o?.full_name??"",o?.phone??null,o?.tin_number??null,o?.address??null,k||null,a,w,C,U,H,P,E,T,O,_,S,D,L,j]),await e.query(`DELETE FROM proforma_items
             WHERE proforma_id = $1`,[j]);for(const l of d){const g=l.itemType==="service";await e.query(`INSERT INTO proforma_items (
                proforma_id,
                product_id,
                service_id,
                item_type,
                product_name,
                description,
                unit,
                quantity,
                unit_price,
                total
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10
              )`,[j,g?null:l.productId||null,g&&l.serviceId||null,l.itemType,l.productName,l.description,l.unit,l.quantity,l.unitPrice,l.total])}R(a==="draft"?s.updatedDraft:s.updatedComplete)}else{const l=await z(),h=(await e.query(`INSERT INTO proforma_invoices (
              invoice_no,
              customer_id,
              customer_name,
              customer_phone,
              customer_tin,
              customer_address,
              quotation_date,
              user_id,
              status,
              subtotal,
              discount_amount,
              discount_type,
              discount_value,
              tax_rate,
              tax_enabled,
              tax_amount,
              grand_total,
              terms,
              notes,
              show_watermark,
              show_signature
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12,
              $13,
              $14,
              $15,
              $16,
              $17,
              $18,
              $19,
              $20,
              $21
            )
            RETURNING id`,[l,o?.id??null,o?.full_name??"",o?.phone??null,o?.tin_number??null,o?.address??null,k||null,N.id,a,w,C,U,H,P,E,T,O,_,S,D,L])).rows[0].id;for(const f of d){const B=f.itemType==="service";await e.query(`INSERT INTO proforma_items (
                proforma_id,
                product_id,
                service_id,
                item_type,
                product_name,
                description,
                unit,
                quantity,
                unit_price,
                total
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10
              )`,[h,B?null:f.productId||null,B&&f.serviceId||null,f.itemType,f.productName,f.description,f.unit,f.quantity,f.unitPrice,f.total])}Q(l),R(a==="draft"?s.savedDraft:s.savedComplete)}q(""),await e.query("COMMIT"),await V(),a==="completed"&&Ae()}catch{try{await e.query("ROLLBACK")}catch{}q(s.errorSaving),R("")}},[Oe,N,m,y,j,k,w,C,U,H,P,E,T,O,_,S,D,L,s,z,V]),ut=n.useCallback(async a=>{const r=W(),e=await r.query(`SELECT *
           FROM proforma_items
           WHERE proforma_id = $1
           ORDER BY id`,[a.id]),o=await Ve(r,e.rows);ce(a.id),Q(a.invoice_no),se(a.customer_id??""),ae(a.quotation_date??""),F(o.length>0?o.map(d=>{const l=d.item_type==="service"?"service":"product";return{id:we++,productId:l==="product"?d.product_id??"":"",serviceId:l==="service"?d.service_id??"":"",itemType:l,productName:d.product_name,description:d.description??"",unit:d.unit??"",quantity:Number(d.quantity),unitPrice:Number(d.unit_price),total:Number(d.total)}}):[te()]),q(""),R(""),window.scrollTo({top:0,behavior:"smooth"})},[]),pt=n.useCallback(async a=>{const r=W(),e=await r.query(`SELECT *
           FROM proforma_items
           WHERE proforma_id = $1
           ORDER BY id`,[a.id]),o=await Ve(r,e.rows);ce(null);const d=await z();Q(d),se(a.customer_id??""),ae(""),F(o.length>0?o.map(l=>{const g=l.item_type==="service"?"service":"product";return{id:we++,productId:g==="product"?l.product_id??"":"",serviceId:g==="service"?l.service_id??"":"",itemType:g,productName:l.product_name,description:l.description??"",unit:l.unit??"",quantity:Number(l.quantity),unitPrice:Number(l.unit_price),total:Number(l.total)}}):[te()]),R(s.duplicated),q(""),window.scrollTo({top:0,behavior:"smooth"})},[z,s.duplicated]),xt=n.useCallback(async a=>{const r=W();try{await r.query(`DELETE FROM proforma_invoices
           WHERE id = $1`,[a]),R(s.deleted),q(""),await V()}catch{q(s.errorDeleting),R("")}},[V,s]),Ae=n.useCallback(()=>{ce(null),se(""),ae(""),F([te()]),Ne(0),je("fixed"),$e(!1),ke(!1),_e(!1),Se(""),Ce(""),q(""),R(""),oe(null),le(""),z().then(Q)},[z]),Me=n.useCallback(async()=>{const{default:a}=await Ue(async()=>{const{default:i}=await import("./pdf-VqX-3e2W.js").then(v=>v.j);return{default:i}},__vite__mapDeps([0,1])),{default:r}=await Ue(async()=>{const{default:i}=await import("./pdf-VqX-3e2W.js").then(v=>v.a);return{default:i}},__vite__mapDeps([0,1]));if(!p)return;const e=new a({unit:"mm",format:"a4"}),o=e.internal.pageSize.getWidth(),d=e.internal.pageSize.getHeight();D&&(e.saveGraphicsState(),e.setGState(e.GState({opacity:.06})),e.setFont("helvetica","bold"),e.setFontSize(60),e.setTextColor(0,0,0),e.text(p.name,o/2,d/2,{align:"center",angle:30}),e.restoreGraphicsState()),e.setFillColor(240,253,250),e.roundedRect(14,12,o-28,24,3,3,"F"),e.setDrawColor(13,148,136),e.setLineWidth(.6),e.roundedRect(14,12,o-28,24,3,3,"S");let l=18;if(p.logoData)try{const{base64:i,format:v}=await St(p.logoData);e.addImage(i,v,18,16,14,14)}catch{}e.setFont("helvetica","bold"),e.setFontSize(18),e.setTextColor(15,118,110),e.text(p.name,o/2,l,{align:"center"}),l+=5,e.setFont("helvetica","normal"),e.setFontSize(8.5),e.setTextColor(71,85,105);const g=[];p.address&&g.push(p.address);const h=[p.phone?`Tel: ${p.phone}`:"",p.email||""].filter(Boolean).join(" | ");h&&g.push(h);const f=[p.tinNumber?`TIN: ${p.tinNumber}`:"",p.rssbNumber?`RSSB: ${p.rssbNumber}`:""].filter(Boolean).join(" | ");f&&g.push(f);for(const i of g)e.text(i,o/2,l,{align:"center"}),l+=3;const B=50;e.setFont("helvetica","bold"),e.setFontSize(20),e.setTextColor(15,118,110),e.text(s.proformaInvoice,o/2,B,{align:"center"}),e.setFont("helvetica","normal"),e.setFontSize(11),e.setTextColor(71,85,105),e.text($,o/2,B+7,{align:"center"}),e.setDrawColor(13,148,136),e.setLineWidth(.4),e.line(o/2-40,B+11,o/2+40,B+11),l=B+18;const A=l;e.setDrawColor(13,148,136),e.setLineWidth(.3),e.setFillColor(240,253,250),e.roundedRect(14,A,o-28,18,2,2,"FD"),e.setFont("helvetica","bold"),e.setFontSize(9),e.setTextColor(15,118,110),e.text(`${s.customer}:`,18,A+5),e.setFont("helvetica","normal"),e.setTextColor(0,0,0),e.text(m?.full_name||"—",40,A+5),m?.phone&&e.text(`${s.phone}: ${m.phone}`,18,A+10),m?.tin_number&&e.text(`${s.customerTin}: ${m.tin_number}`,18,A+15),k&&(e.setFont("helvetica","bold"),e.setTextColor(15,118,110),e.text(`${s.quotationDate}:`,o-60,A+10),e.setFont("helvetica","normal"),e.setTextColor(0,0,0),e.text(fe(k),o-16,A+10,{align:"right"})),l=A+22;const He=y.filter(i=>i.productName).map((i,v)=>[String(v+1),i.itemType==="service"?`${i.productName} (Service)`:i.productName,i.description||"",i.unit||"—",String(i.quantity),b(i.unitPrice),b(i.total)]);r(e,{startY:l,head:[[s.no,s.item,s.description,s.unit,s.qty,s.unitPrice,s.total]],body:He.length?He:[["",s.noItems,"","","","",""]],styles:{fontSize:8.5,cellPadding:2,lineColor:[170,170,170],lineWidth:.1,overflow:"linebreak"},headStyles:{fillColor:[219,234,254],textColor:[30,64,175],fontStyle:"bold",lineWidth:.3,lineColor:[37,99,235]},columnStyles:{0:{halign:"center",cellWidth:10},3:{halign:"center",cellWidth:18},4:{halign:"center",cellWidth:12},5:{halign:"right"},6:{halign:"right"}},alternateRowStyles:{fillColor:[248,250,252]},margin:{left:14,right:14}});const We=(e.lastAutoTable?.finalY??l)+6,Z=o-75;let x=We;if(e.setFontSize(9),e.setFont("helvetica","normal"),e.setTextColor(0,0,0),e.text(`${s.subtotal}:`,Z,x),e.text(b(w),o-14,x,{align:"right"}),x+=5,C>0&&(e.text(`${s.discount}:`,Z,x),e.text(`- ${b(C)}`,o-14,x,{align:"right"}),x+=5),E&&T>0&&(e.text(`${s.tax} (${P}%):`,Z,x),e.text(b(T),o-14,x,{align:"right"}),x+=5),e.setDrawColor(245,158,11),e.setLineWidth(.6),e.line(Z,x,o-14,x),x+=4,e.setFont("helvetica","bold"),e.setFontSize(12),e.setTextColor(30,64,175),e.text(`${s.grandTotal}:`,Z,x),e.text(b(O),o-14,x,{align:"right"}),e.setTextColor(0,0,0),_){x+=10,e.setFont("helvetica","bold"),e.setFontSize(8),e.setTextColor(15,118,110),e.text(`${s.termsConditions}:`,14,x),x+=4,e.setFont("helvetica","normal"),e.setFontSize(8),e.setTextColor(85,85,85);const i=e.splitTextToSize(_,o-28);e.text(i,14,x),x+=i.length*3.5}if(S){x+=6,e.setFont("helvetica","bold"),e.setFontSize(8),e.setTextColor(15,118,110),e.text(`${s.customerNotes}:`,14,x),x+=4,e.setFont("helvetica","normal"),e.setFontSize(8),e.setTextColor(85,85,85);const i=e.splitTextToSize(S,o-28);e.text(i,14,x),x+=i.length*3.5}if(L){let i=Math.max(x+14,We+50);i+12>d-26&&(e.addPage(),i=30),e.setDrawColor(100,100,100),e.setLineWidth(.3),e.line(30,i,90,i),e.line(120,i,180,i),e.setFont("helvetica","bold"),e.setFontSize(8),e.setTextColor(0,0,0),e.text(N?.full_name||"—",60,i+4,{align:"center"}),e.text(s.preparedBy,60,i+8,{align:"center"}),e.text(s.customerReceived,150,i+8,{align:"center"})}const Ye=e.getNumberOfPages(),ee=new Date,mt=`${ee.getDate()}/${ee.getMonth()+1}/${ee.getFullYear()}`,ht=`${String(ee.getHours()).padStart(2,"0")}:${String(ee.getMinutes()).padStart(2,"0")}`;for(let i=1;i<=Ye;i++){e.setPage(i),e.setDrawColor(13,148,136),e.setLineWidth(.3),e.line(14,d-14,o-14,d-14),e.setFont("helvetica","normal"),e.setFontSize(7),e.setTextColor(100,100,100);const v=[p.address,p.phone?`Tel: ${p.phone}`:"",p.email].filter(Boolean).join(" | ");e.text(v,o/2,d-10,{align:"center"}),e.setTextColor(150,150,150),e.text(s.confidential,14,d-6),e.text(`${s.printDate}: ${mt} ${s.printTime}: ${ht}`,o/2,d-6,{align:"center"}),e.text(`${s.pageOf.replace("{a}",String(i)).replace("{b}",String(Ye))} — Powered by MUD Software Company`,o-14,d-6,{align:"right"})}if(Ct()){const i=new Uint8Array(e.output("arraybuffer")),v=await Tt(`proforma-${$}.pdf`,[{name:"PDF",extensions:["pdf"]}]);if(!v)return;await It(v,i)}else e.save(`proforma-${$}.pdf`);re(!1)},[p,y,m,$,k,w,C,E,T,P,O,_,S,N,D,L,s]);return t.jsxs("div",{className:"animate-page-in space-y-6",children:[t.jsx(Pt,{title:s.title,subtitle:s.subtitle,actionLabel:s.printPreview,actionIcon:Ft,onAction:ze}),Te&&t.jsx(Ge,{variant:"error",children:Te}),Ie&&t.jsx(Ge,{variant:"success",children:Ie}),t.jsxs("div",{className:"card-base space-y-4 p-5",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[j&&t.jsxs("span",{className:"rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",children:[s.edit,": ",$]}),t.jsxs("span",{className:"rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",children:[s.invoiceNo,": ",$]})]}),t.jsxs("div",{className:"grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3",children:[t.jsx(Et,{label:s.customer,name:"customer",value:String(J),onChange:a=>se(a.target.value?Number(a.target.value):""),options:[{value:"",label:s.selectCustomer},...Y.map(a=>({value:String(a.id),label:a.full_name}))]}),t.jsx(ge,{label:s.phone,name:"phone",value:m?.phone??"",readOnly:!0}),t.jsx(ge,{label:s.customerTin,name:"custTin",value:m?.tin_number??"",readOnly:!0}),t.jsx(ge,{label:s.quotationDateOptional,name:"quotationDate",type:"date",value:k,onChange:a=>ae(a.target.value)})]})]}),t.jsxs("div",{className:"card-base space-y-4 p-5",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("h3",{className:"text-sm font-bold text-slate-700 dark:text-slate-300",children:s.items}),t.jsx(M,{variant:"secondary",size:"sm",onClick:ot,children:t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(Dt,{className:"h-4 w-4"}),s.addRow]})})]}),Pe!==null&&t.jsxs("div",{className:"rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-700 dark:bg-teal-900/20",children:[t.jsxs("div",{className:"relative",children:[t.jsx(ve,{className:"absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"}),t.jsx("input",{ref:Ee,type:"text",value:ue,onChange:a=>le(a.target.value),placeholder:s.searchProducts,className:"input-base pl-9"})]}),t.jsx("div",{className:"mt-2 max-h-52 overflow-y-auto rounded-lg border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800",children:De.length===0?t.jsx("p",{className:"px-4 py-6 text-center text-sm text-slate-400",children:s.noProductsFound}):De.slice(0,12).map(a=>{const r=a.itemType==="service",e=Number(a.stock_quantity??0),o=!r&&e<=0,d=!r&&e>0&&e<=Number(a.low_stock_threshold??5);return t.jsxs("button",{onClick:()=>lt(Pe,a),className:"flex w-full items-start justify-between border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-teal-50 dark:border-slate-700/50 dark:hover:bg-teal-900/20",children:[t.jsxs("div",{className:"min-w-0 flex-1",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("p",{className:"truncate text-sm font-semibold text-slate-800 dark:text-white",children:a.name}),r&&t.jsx("span",{className:"shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",children:"Service"}),o&&t.jsx("span",{className:"shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400",children:s.outOfStock}),d&&t.jsx("span",{className:"shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",children:s.lowStock})]}),t.jsx("p",{className:"text-xs text-slate-400",children:[a.category,a.unit?`${s.unit}: ${a.unit}`:"",a.sku?`SKU: ${a.sku}`:""].filter(Boolean).join(" · ")}),a.description&&t.jsx("p",{className:"mt-0.5 truncate text-xs text-slate-400",children:a.description})]}),t.jsx("span",{className:"ml-4 shrink-0 text-sm font-bold text-teal-600 dark:text-teal-400",children:b(Number(a.selling_price))})]},`${a.itemType}-${a.id}`)})}),t.jsx("button",{onClick:()=>oe(null),className:"mt-2 text-xs text-slate-400 hover:text-slate-600",children:s.cancelSearch})]}),t.jsx("div",{className:"overflow-x-auto",children:t.jsxs("table",{className:"w-full border-collapse text-sm",children:[t.jsx("thead",{children:t.jsxs("tr",{className:"border-b-2 border-slate-200 dark:border-slate-600",children:[t.jsx("th",{className:"px-2 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300",children:s.no}),t.jsx("th",{className:"px-2 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300",children:s.item}),t.jsx("th",{className:"px-2 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300",children:s.description}),t.jsx("th",{className:"px-2 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300",children:s.unit}),t.jsx("th",{className:"px-2 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300",children:s.qty}),t.jsx("th",{className:"px-2 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300",children:s.unitPrice}),t.jsx("th",{className:"px-2 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300",children:s.total}),t.jsx("th",{className:"w-8"})]})}),t.jsx("tbody",{className:"divide-y divide-slate-100 dark:divide-slate-700",children:y.map((a,r)=>t.jsxs("tr",{className:"hover:bg-slate-50 dark:hover:bg-slate-700/30",children:[t.jsx("td",{className:"px-2 py-2 text-center text-slate-400",children:r+1}),t.jsx("td",{className:"px-2 py-2",children:a.productId||a.serviceId?t.jsxs("div",{className:"flex items-center gap-1.5",children:[t.jsxs("div",{className:"flex min-w-0 items-center gap-1.5",children:[t.jsx("span",{className:"font-semibold text-slate-800 dark:text-white",children:a.productName}),a.itemType==="service"&&t.jsx("span",{className:"shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",children:"Service"})]}),t.jsx("button",{onClick:()=>dt(a.id),className:"rounded p-0.5 text-slate-400 hover:text-teal-600",title:s.selectProduct,children:t.jsx(ve,{className:"h-3 w-3"})})]}):t.jsxs("button",{onClick:()=>it(a.id),className:"flex items-center gap-1.5 rounded border border-dashed border-slate-300 px-2 py-1.5 text-xs text-slate-400 transition-colors hover:border-teal-400 hover:text-teal-600 dark:border-slate-600",children:[t.jsx(ve,{className:"h-3.5 w-3.5"}),s.selectProduct]})}),t.jsx("td",{className:"px-2 py-2",children:t.jsx("input",{type:"text",value:a.description,onChange:e=>he(a.id,"description",e.target.value),placeholder:s.description,className:"w-full rounded border border-slate-200 bg-transparent px-2 py-1 text-xs text-slate-700 dark:border-slate-600 dark:text-slate-300"})}),t.jsx("td",{className:"px-2 py-2 text-center text-slate-600 dark:text-slate-300",children:a.unit||"—"}),t.jsx("td",{className:"px-2 py-2",children:t.jsx("input",{type:"number",min:"1",value:a.quantity,onChange:e=>he(a.id,"quantity",Number(e.target.value)),className:"input-base w-16 text-center"})}),t.jsx("td",{className:"px-2 py-2",children:t.jsx("input",{type:"number",min:"0",step:"0.01",value:a.unitPrice,onChange:e=>he(a.id,"unitPrice",Number(e.target.value)),className:"input-base w-28 text-right"})}),t.jsx("td",{className:"whitespace-nowrap px-2 py-2 text-right font-semibold text-slate-700 dark:text-slate-200",children:b(a.total)}),t.jsx("td",{className:"px-2 py-2",children:t.jsx("button",{onClick:()=>nt(a.id),className:"rounded p-1 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/30",children:t.jsx(ye,{className:"h-4 w-4"})})})]},a.id))})]})}),t.jsx("div",{className:"flex justify-end",children:t.jsxs("div",{className:"w-64 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/30",children:[t.jsxs("div",{className:"flex justify-between text-sm",children:[t.jsx("span",{className:"text-slate-600 dark:text-slate-400",children:s.subtotal}),t.jsx("span",{className:"font-semibold",children:b(w)})]}),t.jsxs("div",{className:"flex items-center gap-2 text-sm",children:[t.jsxs("select",{value:U,onChange:a=>je(a.target.value),className:"input-base flex-1 text-xs",children:[t.jsx("option",{value:"fixed",children:s.discountFixed}),t.jsx("option",{value:"percent",children:s.discountPercent})]}),t.jsx("input",{type:"number",min:"0",step:"0.01",value:H,onChange:a=>Ne(Number(a.target.value)),className:"input-base w-20 text-right text-sm"})]}),t.jsxs("label",{className:"flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400",children:[t.jsx("input",{type:"checkbox",checked:E,onChange:a=>$e(a.target.checked),className:"h-4 w-4 rounded text-teal-600"}),s.tax," (",P,"%)"]}),t.jsxs("label",{className:"flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400",children:[t.jsx("input",{type:"checkbox",checked:D,onChange:a=>ke(a.target.checked),className:"h-4 w-4 rounded text-teal-600"}),s.showWatermark]}),t.jsxs("label",{className:"flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400",children:[t.jsx("input",{type:"checkbox",checked:L,onChange:a=>_e(a.target.checked),className:"h-4 w-4 rounded text-teal-600"}),s.showSignature]}),t.jsxs("div",{className:"flex justify-between border-t border-slate-200 pt-2 dark:border-slate-600",children:[t.jsx("span",{className:"font-bold text-slate-800 dark:text-white",children:s.grandTotal}),t.jsx("span",{className:"font-bold text-teal-600 dark:text-teal-400",children:b(O)})]})]})})]}),t.jsxs("div",{className:"card-base space-y-3 p-5",children:[t.jsx("h3",{className:"text-sm font-bold text-slate-700 dark:text-slate-300",children:s.notesTerms}),t.jsxs("div",{children:[t.jsx("label",{className:"mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300",children:s.termsConditions}),t.jsx("textarea",{value:_,onChange:a=>Se(a.target.value),rows:4,className:"input-base"})]}),t.jsxs("div",{children:[t.jsx("label",{className:"mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300",children:s.customerNotes}),t.jsx("textarea",{value:S,onChange:a=>Ce(a.target.value),rows:2,placeholder:s.customerNotesPlaceholder,className:"input-base"})]})]}),t.jsxs("div",{className:"flex flex-wrap justify-end gap-3",children:[t.jsx(M,{variant:"secondary",onClick:Ae,children:t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(Lt,{className:"h-4 w-4"}),s.reset]})}),t.jsx(M,{variant:"secondary",onClick:Me,children:t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(qt,{className:"h-4 w-4"}),s.exportPdf]})}),t.jsx(M,{variant:"secondary",onClick:()=>Be("draft"),children:t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(zt,{className:"h-4 w-4"}),j?s.updateDraft:s.saveDraft]})}),t.jsx(M,{variant:"secondary",onClick:ze,children:t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(Ot,{className:"h-4 w-4"}),s.printPreview]})}),t.jsx(M,{onClick:()=>Be("completed"),children:t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(Bt,{className:"h-4 w-4"}),j?s.updateComplete:s.saveComplete]})})]}),t.jsxs("div",{className:"card-base space-y-4 p-5",children:[t.jsxs("div",{className:"flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",children:[t.jsx("h3",{className:"text-sm font-bold text-slate-700 dark:text-slate-300",children:s.savedProformas}),t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("div",{className:"flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-600",children:["all","draft","completed"].map(a=>t.jsx("button",{onClick:()=>at(a),className:`rounded-md px-3 py-1 text-xs font-medium transition-colors ${G===a?"bg-teal-600 text-white":"text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"}`,children:a==="all"?I.common.all:a==="draft"?s.draft:s.completed},a))}),t.jsx("input",{type:"text",value:pe,onChange:a=>rt(a.target.value),placeholder:s.searchPlaceholder,className:"input-base w-56 text-sm"})]})]}),tt?t.jsx("p",{className:"py-6 text-center text-sm text-slate-400",children:s.loading}):Le.length===0?t.jsx("p",{className:"py-6 text-center text-sm text-slate-400",children:G==="draft"?s.noDrafts:G==="completed"?s.noCompleted:s.noSavedProformas}):t.jsx("div",{className:"overflow-x-auto",children:t.jsxs("table",{className:"w-full border-collapse text-sm",children:[t.jsx("thead",{children:t.jsxs("tr",{className:"border-b-2 border-slate-200 dark:border-slate-600",children:[t.jsx("th",{className:"px-3 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300",children:s.no}),t.jsx("th",{className:"px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300",children:s.invoiceNo}),t.jsx("th",{className:"px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300",children:s.customer}),t.jsx("th",{className:"px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300",children:s.grandTotal}),t.jsx("th",{className:"px-3 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300",children:I.common.status}),t.jsx("th",{className:"px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300",children:s.actions})]})}),t.jsx("tbody",{className:"divide-y divide-slate-100 dark:divide-slate-700",children:Le.map((a,r)=>t.jsxs("tr",{className:"hover:bg-slate-50 dark:hover:bg-slate-700/30",children:[t.jsx("td",{className:"px-3 py-2.5 text-center text-slate-400",children:r+1}),t.jsx("td",{className:"px-3 py-2.5",children:t.jsx("span",{className:"font-bold text-teal-700 dark:text-teal-400",children:a.invoice_no})}),t.jsx("td",{className:"px-3 py-2.5",children:t.jsxs("div",{children:[t.jsx("span",{className:"font-semibold text-slate-800 dark:text-white",children:a.customer_name}),t.jsx("span",{className:"block text-xs text-slate-400",children:fe(a.created_at)})]})}),t.jsx("td",{className:"px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-white",children:b(Number(a.grand_total))}),t.jsx("td",{className:"px-3 py-2.5 text-center",children:t.jsx("span",{className:`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${a.status==="completed"?"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400":"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`,children:a.status==="completed"?s.completed:s.draft})}),t.jsx("td",{className:"px-3 py-2.5",children:t.jsxs("div",{className:"flex items-center justify-end gap-1",children:[t.jsx("button",{onClick:()=>ut(a),className:"rounded p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20",title:s.edit,children:t.jsx(At,{className:"h-4 w-4"})}),t.jsx("button",{onClick:()=>pt(a),className:"rounded p-1.5 text-slate-500 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20",title:s.duplicate,children:t.jsx(Mt,{className:"h-4 w-4"})}),t.jsx("button",{onClick:()=>xe(a.id),className:"rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",title:s.delete,children:t.jsx(ye,{className:"h-4 w-4"})})]})})]},a.id))})]})})]}),Fe!==null&&t.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",children:t.jsxs("div",{className:"w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800",children:[t.jsxs("div",{className:"mb-4 flex items-center gap-3",children:[t.jsx("div",{className:"flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30",children:t.jsx(Ht,{className:"h-5 w-5 text-red-600 dark:text-red-400"})}),t.jsx("h3",{className:"text-lg font-bold text-slate-800 dark:text-white",children:s.delete})]}),t.jsx("p",{className:"mb-6 text-sm text-slate-600 dark:text-slate-400",children:s.confirmDelete}),t.jsxs("div",{className:"flex justify-end gap-3",children:[t.jsx(M,{variant:"secondary",size:"sm",onClick:()=>xe(null),children:I.common.cancel}),t.jsx(M,{variant:"danger",size:"sm",onClick:()=>{xt(Fe),xe(null)},children:t.jsxs("span",{className:"flex items-center gap-1.5",children:[t.jsx(ye,{className:"h-4 w-4"}),s.delete]})})]})]})}),t.jsx(Rt,{open:Qe,onClose:()=>re(!1),previewHtml:Je,onPrint:ct,onDownloadPdf:Me,title:`${s.title} — ${$}`})]})}export{Jt as ProFormaInvoicePage};
