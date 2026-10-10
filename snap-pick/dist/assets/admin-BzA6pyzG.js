import{i as e,n as t,t as n}from"./api-Cni970YR.js";import{c as r,f as i,g as a,i as o,l as s,m as c,n as l,o as u,t as d,u as f,v as p,y as m}from"./animations-D2GQkPPG.js";s(`admin`),o();var h=e=>document.getElementById(e),g=e=>e?new Date(e+`T00:00`).toLocaleDateString(`en-IN`,{day:`numeric`,month:`short`}):`-`,_=e=>`<div class="card text-center text-sm text-slate-500">${e}</div>`,v=[],y=[],b=!0,x=[{key:`ALL`,label:`Total`,color:`text-ink`},{key:p.PENDING,label:`Pending`,color:`text-amber-600`},{key:p.SCHEDULED,label:`Scheduled`,color:`text-blue-600`},{key:p.WAITLISTED,label:`Waitlisted`,color:`text-orange-600`},{key:p.COLLECTED,label:`Collected`,color:`text-green-600`},{key:p.MISSED,label:`Missed`,color:`text-red-600`}];function S(){h(`stats`).innerHTML=x.map(e=>`
    <div class="stat-card card !p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${e.label}</p>
      <p class="mt-1 text-3xl font-extrabold ${e.color}" data-stat="${e.key}">0</p>
    </div>`).join(``),x.forEach(e=>{let t=e.key===`ALL`?v.length:v.filter(t=>t.status===e.key).length,n=document.querySelector(`[data-stat="${e.key}"]`);b?d(n,t,.8):n.textContent=t}),b&&u(`.stat-card`)}function C(){let e=h(`slotList`);y.length?(e.innerHTML=y.map(e=>{let t=Math.round(e.allocatedKg/e.capacityKg*100),n=t>=90?`bg-red-500`:t>=70?`bg-amber-500`:`bg-brand`,i=e.status===`FULL`?`bg-red-100 text-red-800`:`bg-green-100 text-green-800`;return`
      <article class="slot-card card">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-xs font-semibold text-slate-400">${g(e.date)}</p>
            <h3 class="font-bold">${r(e.vehicleName)} · ${r(e.area)}</h3>
          </div>
          <span class="rounded-full px-2.5 py-1 text-xs font-semibold ${i}">${r(e.status)}</span>
        </div>
        <p class="mt-1 text-sm text-slate-600">👷 ${r(e.collectorName)} · ${e.requestCount} request(s)</p>
        <div class="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div class="cap-bar h-full rounded-full ${n}" data-pct="${t}"></div>
        </div>
        <p class="mt-1 text-xs text-slate-500">${e.allocatedKg} / ${e.capacityKg} kg (${t}%)</p>
      </article>`}).join(``),e.querySelectorAll(`.cap-bar`).forEach(e=>{let t=Number(e.dataset.pct);b?l(e,t):e.style.width=`${Math.min(t,100)}%`}),b&&u(`.slot-card`)):e.innerHTML=`<div class="md:col-span-2 lg:col-span-3">${_(`No slots yet. Click "Run scheduler" to assign pending requests.`)}</div>`}function w(){let n=v.filter(e=>e.status===p.WAITLISTED),i=v.filter(e=>e.status===p.MISSED);h(`waitCount`).textContent=n.length?`(${n.length})`:``,h(`missedCount`).textContent=i.length?`(${i.length})`:``,h(`waitList`).innerHTML=n.length?n.map(e=>`
      <div class="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm">
        <div class="flex justify-between gap-2">
          <p class="font-semibold">${r(e.householdName)} · ${r(m[e.wasteType]??e.wasteType)} · ${r(e.quantityKg)} kg</p>
          <span class="text-xs text-slate-500">${r(e.area)}</span>
        </div>
        <p class="mt-1 text-xs text-orange-800">${r(e.remark)}</p>
      </div>`).join(``):`<p class="text-sm text-slate-500">Nothing waitlisted. 🎉</p>`,h(`missedList`).innerHTML=i.length?i.map(n=>`
      <div class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
        <p class="font-semibold">${r(n.householdName)} · ${r(n.area)} · ${r(n.quantityKg)} kg</p>
        <p class="text-xs text-slate-600">${r(n.address)} · was due ${g(n.scheduledDate??n.preferredDate)}</p>
        <div class="mt-2 flex items-center gap-2">
          <input type="date" class="input !py-1.5" data-date-for="${r(n.id)}"
                 value="${t(1)}" min="${e()}" max="${t(30)}" />
          <button class="btn-primary !px-3 !py-1.5 shrink-0" data-reschedule="${r(n.id)}">Reschedule</button>
        </div>
      </div>`).join(``):`<p class="text-sm text-slate-500">No missed pickups.</p>`}function T(){let e=h(`fArea`).value,t=h(`fStatus`).value,n=v.filter(n=>(!e||n.area===e)&&(!t||n.status===t));if(!n.length){h(`groups`).innerHTML=_(`No requests match these filters.`);return}let i=new Map;n.forEach(e=>{let t=`${e.preferredDate}|${e.area}`;i.has(t)||i.set(t,[]),i.get(t).push(e)}),h(`groups`).innerHTML=[...i.keys()].sort().map(e=>{let[t,n]=e.split(`|`),o=i.get(e),s=o.filter(e=>e.status!==p.CANCELLED).reduce((e,t)=>e+t.quantityKg,0),c=o.map(e=>`
      <tr class="border-t border-slate-100 align-top">
        <td class="py-2 pr-3 font-mono text-xs text-slate-500">${r(e.id)}</td>
        <td class="py-2 pr-3">${r(e.householdName)}<br><span class="text-xs text-slate-500">${r(e.phone)}</span></td>
        <td class="py-2 pr-3">${r(m[e.wasteType]??e.wasteType)}</td>
        <td class="py-2 pr-3 whitespace-nowrap">${r(e.quantityKg)} kg</td>
        <td class="py-2 pr-3">${f(e.status)}</td>
        <td class="py-2 pr-3 whitespace-nowrap">${g(e.scheduledDate)}</td>
        <td class="py-2 text-right">
          ${a.includes(e.status)?`<button class="text-xs font-semibold text-red-600 hover:underline" data-cancel="${r(e.id)}">Cancel</button>`:``}
        </td>
      </tr>`).join(``);return`
      <div class="group-card card !p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-bold">📍 ${r(n)} <span class="font-medium text-slate-400">· ${g(t)}</span></h3>
          <p class="text-sm text-slate-600">${o.length} request(s) · <b>${s} kg</b> total</p>
        </div>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[640px] text-left text-sm">
            <thead class="text-xs uppercase text-slate-400">
              <tr><th class="pb-1 pr-3">ID</th><th class="pb-1 pr-3">Household</th><th class="pb-1 pr-3">Waste</th>
                  <th class="pb-1 pr-3">Qty</th><th class="pb-1 pr-3">Status</th><th class="pb-1 pr-3">Scheduled</th><th></th></tr>
            </thead>
            <tbody>${c}</tbody>
          </table>
        </div>
      </div>`}).join(``),b&&u(`.group-card`)}function E(e,t){let n=new Map;return e.forEach(e=>n.set(t(e),(n.get(t(e))??0)+e.quantityKg)),[...n.entries()].sort((e,t)=>t[1]-e[1])}function D(e,t,n){let i=Math.max(...t.map(([,e])=>e),1);return`<div class="an-card card"><h3 class="font-bold">${e}</h3>${t.length?t.map(([e,t])=>`
        <div class="mt-3">
          <div class="flex justify-between text-xs"><span class="font-medium">${r(e)}</span><span class="text-slate-500">${t} kg</span></div>
          <div class="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div class="an-bar h-full rounded-full ${n}" data-pct="${Math.round(t/i*100)}"></div>
          </div>
        </div>`).join(``):`<p class="mt-3 text-sm text-slate-500">No data yet.</p>`}</div>`}function O(){let e=v.filter(e=>e.status!==p.CANCELLED);h(`analytics`).innerHTML=D(`By area (kg)`,E(e,e=>e.area),`bg-brand`)+D(`By waste type (kg)`,E(e,e=>m[e.wasteType]??e.wasteType),`bg-blue-500`)+D(`By preferred date (kg)`,E(e,e=>e.preferredDate).sort((e,t)=>e[0].localeCompare(t[0])).map(([e,t])=>[g(e),t]),`bg-amber-500`),document.querySelectorAll(`.an-bar`).forEach(e=>{let t=Number(e.dataset.pct);b?l(e,t):e.style.width=`${t}%`}),b&&u(`.an-card`)}async function k(){try{[v,y]=await Promise.all([n.getRequests(),n.getSlots()]),S(),O(),C(),w(),T(),b=!1}catch(e){i(e.message,`error`)}}h(`fArea`).innerHTML=`<option value="">All areas</option>`+c.map(e=>`<option value="${e}">${e}</option>`).join(``),h(`fStatus`).innerHTML=`<option value="">All statuses</option>`+Object.values(p).map(e=>`<option value="${e}">${e}</option>`).join(``),h(`fArea`).addEventListener(`change`,T),h(`fStatus`).addEventListener(`change`,T);function A(e,t,n,r){e.disabled=t,e.textContent=t?n:r,e.classList.toggle(`opacity-60`,t)}h(`runBtn`).addEventListener(`click`,async()=>{let e=h(`runBtn`);A(e,!0,`Scheduling…`,`⚙ Run scheduler`);try{let e=await n.runScheduler(h(`schedDate`).value||null);i(`Processed ${e.processed}: ${e.scheduled} scheduled (${e.moved} moved), ${e.waitlisted} waitlisted`,e.waitlisted?`warning`:`success`),await k()}catch(e){i(e.message,`error`)}finally{A(e,!1,``,`⚙ Run scheduler`)}}),h(`resetBtn`).addEventListener(`click`,async()=>{if(confirm(`Reset all demo data? This deletes every request and slot.`)){if(!n.resetDemo)return i(`Reset is only available in mock mode`,`info`);await n.resetDemo(),h(`schedDate`).value=``,b=!0,i(`Demo data reset`,`info`),k()}}),document.addEventListener(`click`,async e=>{let t=e.target.closest(`[data-cancel]`),r=e.target.closest(`[data-reschedule]`);try{if(t){if(!confirm(`Cancel this request?`))return;t.disabled=!0;let e=await n.cancelRequest(t.dataset.cancel);i(e.promoted?`Cancelled. ${e.promoted} waitlisted request(s) promoted`:`Request cancelled`,`info`),k()}else if(r){let e=r.dataset.reschedule,t=document.querySelector(`[data-date-for="${e}"]`).value;r.disabled=!0;let a=await n.rescheduleRequest(e,t);i(a.status===p.SCHEDULED?`Rescheduled for ${g(a.scheduledDate)}`:`No capacity right now, so the request is waitlisted`,a.status===p.SCHEDULED?`success`:`warning`),k()}}catch(e){i(e.message,`error`),k()}}),k();