(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const n of r)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function o(r){const n={};return r.integrity&&(n.integrity=r.integrity),r.referrerPolicy&&(n.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?n.credentials="include":r.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(r){if(r.ep)return;r.ep=!0;const n=o(r);fetch(r.href,n)}})();const $="https://151.145.89.228.sslip.io/webhook/Doch-1";function w(t){const[e,o,s]=t.split("-");return`${s}/${o}/${e}`}async function O(t){const e=w(t),o=`${$}?date=${e}`;try{const s=await fetch(o);if(!s.ok)throw new Error(`HTTP error! status: ${s.status}`);return await s.json()}catch(s){throw console.error("Error fetching report:",s),s}}const u=document.getElementById("date-picker"),c=document.getElementById("summary-section"),l=document.getElementById("details-section"),y=document.getElementById("details-body"),h=document.getElementById("loading-overlay"),S=new Date().toISOString().split("T")[0];u.value=S;u.addEventListener("change",t=>{const e=t.target.value;e&&v(e)});async function v(t){g(!0);try{const e=await O(t);b(e)}catch(e){c.innerHTML=`<div class="placeholder-msg error">שגיאה בטעינת הנתונים: ${e.message}</div>`,l.classList.add("hidden")}finally{g(!1)}}function E(t){return t.filter(e=>e.name&&String(e.name).trim()!=="")}function b(t){if(!t||!Array.isArray(t)||t.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',l.classList.add("hidden");return}const e=E(t);if(e.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',l.classList.add("hidden");return}const o=T(e),s=e.filter(a=>String(a.todayValue)==="1").length,r=e.length;let n=`
      <div class="glass-card summary-card total-card">
        <h3>סה"כ נוכחים</h3>
        <div class="value">${s} <span class="total-of">/ ${r}</span></div>
      </div>
    `;n+=Object.entries(o).map(([a,d],i)=>{const f=Object.values(d).reduce((m,p)=>m+p,0),L=Object.entries(d).map(([m,p])=>`
                <div class="role-item">
                    <span>${m}</span>
                    <span>${p}</span>
                </div>
            `).join("");return`
          <div class="glass-card summary-card" style="animation-delay: ${(i+1)*.1}s">
            <h3>${a}</h3>
            <div class="value">${f}</div>
            <div class="role-breakdown">
              ${L}
            </div>
          </div>
        `}).join(""),c.innerHTML=n,y.innerHTML="",e.forEach((a,d)=>{const i=document.createElement("tr");i.style.animationDelay=`${d*.03}s`,i.classList.add("fade-in-row");const f=P(a.todayValue);i.innerHTML=`
          <td>${a.name}</td>
          <td>${a.department||"---"}</td>
          <td>${a.role||"---"}</td>
          <td>
            <span class="status-badge ${f}">
              ${H(a.todayValue)}
            </span>
          </td>
        `,y.appendChild(i)}),l.classList.remove("hidden")}function T(t){return t.reduce((e,o)=>{if(String(o.todayValue)==="1"){const s=o.department||"כללי",r=o.role||"אחר";e[s]||(e[s]={}),e[s][r]||(e[s][r]=0),e[s][r]++}return e},{})}function H(t){const e=String(t);switch(e){case"1":return"בבסיס";case"0":return"בבית";case"2":return"מחלה";default:return e||"---"}}function P(t){switch(String(t)){case"1":return"status-1";case"0":return"status-0";case"2":return"status-2";default:return"status-other"}}function g(t){t?h.classList.remove("hidden"):h.classList.add("hidden")}u.value&&v(u.value);
