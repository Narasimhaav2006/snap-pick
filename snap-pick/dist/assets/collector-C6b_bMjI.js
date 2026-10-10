import{i as e,n as t,t as n}from"./api-Cni970YR.js";import{_ as r,c as i,f as a,h as o,i as s,l as c,o as l,t as u,u as d,v as f,y as p}from"./animations-D2GQkPPG.js";var m=e=>{let t=0;for(let n of String(e))t=t*31+n.charCodeAt(0)>>>0;return t};function h(e){if(e.lat!=null&&e.lng!=null)return{lat:e.lat,lng:e.lng};let t=o[e.area]??r,n=m(e.id);return{lat:t.lat+(n%100-50)/5e3,lng:t.lng+((n>>7)%100-50)/5e3}}function g(e,t){let n=e=>e*Math.PI/180,r=n(t.lat-e.lat),i=n(t.lng-e.lng),a=Math.sin(r/2)**2+Math.cos(n(e.lat))*Math.cos(n(t.lat))*Math.sin(i/2)**2;return 12742*Math.asin(Math.sqrt(a))}function _(e){let t=0,n=r;for(let r of e){let e=h(r);t+=g(n,e),n=e}return t+g(n,r)}function v(e,t){let n=[...e].sort((e,t)=>e.createdAt.localeCompare(t.createdAt)),i=_(n);if(!t)return{stops:n,km:i,kmFifo:i};let a=[...n],o=[],s=r;for(;a.length;){let e=0,t=1/0;a.forEach((n,r)=>{let i=g(s,h(n));i<t&&(t=i,e=r)});let[n]=a.splice(e,1);o.push(n),s=h(n)}return{stops:o,km:_(o),kmFifo:i}}c(`collector`),s();var y=e=>document.getElementById(e),b=`apex_collector_id`,x=!0,S=e=>`<div class="card text-center text-sm text-slate-500">${e}</div>`;function C(e,t){let n=e.status===f.SCHEDULED;return`
    <li class="stop rounded-xl border border-slate-200 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex gap-3">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold">${t+1}</span>
          <div>
            <p class="font-semibold">${i(e.householdName)} <span class="text-xs font-normal text-slate-400">${i(e.id)}</span></p>
            <p class="text-sm text-slate-600">📍 ${i(e.address)}</p>
            <p class="text-sm text-slate-600">♻ ${i(p[e.wasteType]??e.wasteType)} · ${i(e.quantityKg)} kg</p>
            <p class="text-sm"><a class="text-blue-600 hover:underline" href="tel:${i(e.phone)}">📞 ${i(e.phone)}</a></p>
            ${e.notes?`<p class="text-sm text-slate-500">📝 ${i(e.notes)}</p>`:``}
          </div>
        </div>
        ${d(e.status)}
      </div>
      ${n?`
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn-ghost !px-3 !py-1.5 text-red-600" data-miss="${i(e.id)}">Missed</button>
          <button class="btn-primary !px-3 !py-1.5" data-done="${i(e.id)}">✓ Collected</button>
        </div>`:``}
    </li>`}function w(e){let t=e.flatMap(e=>e.requests),n=[[`Stops`,t.length,`text-ink`],[`Remaining`,t.filter(e=>e.status===f.SCHEDULED).length,`text-blue-600`],[`Collected`,t.filter(e=>e.status===f.COLLECTED).length,`text-green-600`],[`Missed`,t.filter(e=>e.status===f.MISSED).length,`text-red-600`]];y(`summary`).innerHTML=n.map(([e,,t],n)=>`
    <div class="sum-card card !p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${e}</p>
      <p class="mt-1 text-3xl font-extrabold ${t}" id="sum${n}">0</p>
    </div>`).join(``),n.forEach(([,e],t)=>{let n=y(`sum${t}`);x?u(n,e,.6):n.textContent=e})}async function T(){let e=y(`collectorSel`).value,t=y(`dateSel`).value;if(e&&t)try{let r=await n.getCollectorSchedule(e,t);if(w(r),!r.length){y(`schedule`).innerHTML=S(`No pickups assigned for this date. The dispatcher may not have run the scheduler yet.`),x=!1;return}y(`schedule`).innerHTML=r.map(e=>{let t=y(`optRoute`).checked,{stops:n,km:r,kmFifo:a}=v(e.requests,t),o=a-r,s=n.filter(e=>e.status===f.COLLECTED).length;return`
        <section class="slot card">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 class="text-lg font-bold">🚛 ${i(e.vehicleName)} · ${i(e.area)}</h2>
                            <p class="text-sm text-slate-500">Load ${i(e.allocatedKg)} / ${i(e.capacityKg)} kg</p>
              <p class="text-xs font-medium text-slate-500">🧭 Route ≈ ${r.toFixed(1)} km${t&&o>.05?` · <span class="text-green-700">saves ${o.toFixed(1)} km vs first-come order</span>`:``}</p>
            </div>
            <p class="text-sm font-semibold text-slate-600">${s} / ${n.length} done</p>
          </div>
          <ol class="mt-4 space-y-3">${n.map(C).join(``)}</ol>
        </section>`}).join(``),x&&l(`.stop`),x=!1}catch(e){a(e.message,`error`)}}async function E(){try{let e=await n.getCollectors();y(`collectorSel`).innerHTML=e.map(e=>`<option value="${i(e.id)}">${i(e.name)}</option>`).join(``);let r=localStorage.getItem(b);r&&e.some(e=>e.id===r)&&(y(`collectorSel`).value=r),y(`dateSel`).value=t(1),await T()}catch(e){a(e.message,`error`)}}y(`collectorSel`).addEventListener(`change`,()=>{localStorage.setItem(b,y(`collectorSel`).value),x=!0,T()}),y(`dateSel`).addEventListener(`change`,()=>{x=!0,T()}),y(`todayBtn`).addEventListener(`click`,()=>{y(`dateSel`).value=e(),x=!0,T()}),y(`tomorrowBtn`).addEventListener(`click`,()=>{y(`dateSel`).value=t(1),x=!0,T()}),y(`optRoute`).addEventListener(`change`,T),y(`schedule`).addEventListener(`click`,async e=>{let t=e.target.closest(`[data-done],[data-miss]`);if(!t)return;let r=t.hasAttribute(`data-done`),i=r?t.dataset.done:t.dataset.miss;if(r||confirm(`Mark this pickup as missed?`)){t.disabled=!0;try{await n.updateStatus(i,r?f.COLLECTED:f.MISSED),a(r?`Marked as collected`:`Marked as missed. The dispatcher can reschedule it`,r?`success`:`warning`)}catch(e){a(e.message,`error`)}T()}}),E();