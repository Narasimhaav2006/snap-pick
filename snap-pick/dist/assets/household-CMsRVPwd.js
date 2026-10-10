import{a as e,i as t,n,r,t as i}from"./api-Cni970YR.js";import{a,c as o,d as s,f as c,g as l,i as u,l as d,m as f,o as p,s as m,u as h,y as g}from"./animations-D2GQkPPG.js";d(`household`),u();var _=`apex_household_phone`,v=document.getElementById(`requestForm`),y=document.getElementById(`submitBtn`),b=document.getElementById(`requestList`),x=document.getElementById(`lookupPhone`);function S(e,t,n){document.getElementById(e).innerHTML=`<option value="">${t}</option>`+n.map(([e,t])=>`<option value="${e}">${t}</option>`).join(``)}function C(){let e=document.getElementById(`preferredDate`);e.min=t(),e.max=n(30),e.value=n(1)}S(`area`,`Select area`,f.map(e=>[e,e])),S(`wasteType`,`Select type`,Object.entries(g)),document.getElementById(`maxHint`).textContent=100,C();function w(e){let t=v.querySelector(`[data-error-for="${e}"]`),n=v.elements[e];t&&(t.textContent=``,t.classList.add(`hidden`)),n&&n.classList.remove(`border-red-500`)}function T(){v.querySelectorAll(`[data-error-for]`).forEach(e=>w(e.dataset.errorFor))}function E(e){let t=!0;for(let[n,r]of Object.entries(e)){let e=v.querySelector(`[data-error-for="${n}"]`),i=v.elements[n];e&&(e.textContent=r,e.classList.remove(`hidden`)),i&&(i.classList.add(`border-red-500`),a(i),t&&=(i.focus(),!1))}}v.addEventListener(`input`,e=>e.target.name&&w(e.target.name)),[v.elements.phone,x].forEach(e=>e.addEventListener(`input`,()=>e.value=e.value.replace(/\D/g,``)));function D(){let e=Object.fromEntries(new FormData(v));return Object.keys(e).forEach(t=>e[t]=String(e[t]).trim()),e}v.addEventListener(`submit`,async t=>{t.preventDefault(),T();let n=D(),r=e(n);if(Object.keys(r).length)E(r),c(`Please fix the highlighted fields`,`warning`);else{O(!0);try{let e=await i.createRequest({...n,quantityKg:Number(n.quantityKg)});c(`Request ${e.id} submitted`,`success`),localStorage.setItem(_,n.phone),x.value=n.phone,v.reset(),C(),await M()}catch(e){e.errors&&E(e.errors),c(e.message,`error`)}finally{O(!1)}}});function O(e){y.disabled=e,y.textContent=e?`Submitting…`:`Submit request`,y.classList.toggle(`opacity-60`,e)}var k=e=>new Date(e+`T00:00`).toLocaleDateString(`en-IN`,{day:`numeric`,month:`short`,year:`numeric`});function A(e){return`<div class="card text-center text-sm text-slate-500">${e}</div>`}function j(e){let t=l.includes(e.status);return`
    <article class="req-card card">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold text-slate-400">${o(e.id)}</p>
          <h3 class="font-bold">${o(g[e.wasteType]??e.wasteType)} · ${o(e.quantityKg)} kg</h3>
        </div>
        ${h(e.status)}
      </div>

      <p class="mt-2 text-sm text-slate-600">📍 ${o(e.address)}, ${o(e.area)}</p>
      <p class="text-sm text-slate-600">📅 Preferred: ${k(e.preferredDate)}</p>
            ${e.scheduledDate?`<p class="text-sm font-medium text-blue-700">🚛 Scheduled: ${k(e.scheduledDate)}</p>`:``}
      ${e.remark?`<p class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">ℹ️ ${o(e.remark)}</p>`:``}
      ${e.notes?`<p class="text-sm text-slate-500">📝 ${o(e.notes)}</p>`:``}

      ${s(e.status)}

      ${t?`
        <div class="mt-4 text-right">
          <button class="btn-ghost !px-3 !py-1.5 text-red-600" data-cancel="${o(e.id)}">Cancel request</button>
        </div>`:``}
    </article>`}async function M(){let e=x.value.trim();if(!r(e))b.innerHTML=A(`Enter your 10-digit mobile number to see your requests.`);else{b.innerHTML=A(`Loading…`);try{let t=await i.getRequests({phone:e});if(!t.length){b.innerHTML=A(`No requests found for this number yet.`);return}b.innerHTML=t.map(j).join(``),p(`.req-card`),m(b)}catch(e){b.innerHTML=A(`Could not load requests. Please try again.`),c(e.message,`error`)}}}document.getElementById(`lookupBtn`).addEventListener(`click`,()=>{r(x.value)?(localStorage.setItem(_,x.value),M()):(c(`Enter a valid 10-digit mobile number`,`warning`),a(x))}),b.addEventListener(`click`,async e=>{let t=e.target.closest(`[data-cancel]`);if(t&&confirm(`Cancel this pickup request?`)){t.disabled=!0;try{await i.cancelRequest(t.dataset.cancel),c(`Request cancelled`,`info`)}catch(e){c(e.message,`error`)}M()}}),x.value=localStorage.getItem(_)??``,M();