(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const n of a.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function o(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(r){if(r.ep)return;r.ep=!0;const a=o(r);fetch(r.href,a)}})();const $="https://151.145.89.228.sslip.io/webhook/Doch-1";function w(t){const[e,o,s]=t.split("-");return`${s}/${o}/${e}`}async function b(t){const e=w(t),o=`${$}?date=${e}`;try{const s=await fetch(o);if(!s.ok)throw new Error(`HTTP error! status: ${s.status}`);return await s.json()}catch(s){throw console.error("Error fetching report:",s),s}}const u=document.getElementById("date-picker"),l=document.getElementById("summary-section"),c=document.getElementById("details-section"),y=document.getElementById("details-body"),h=document.getElementById("loading-overlay"),O=new Date().toISOString().split("T")[0];u.value=O;u.addEventListener("change",t=>{const e=t.target.value;e&&v(e)});async function v(t){g(!0);try{const e=await b(t);E(e)}catch(e){l.innerHTML=`<div class="placeholder-msg error">שגיאה בטעינת הנתונים: ${e.message}</div>`,c.classList.add("hidden")}finally{g(!1)}}function S(t){return t.filter(e=>e.name&&String(e.name).trim()!=="")}function E(t){if(!t||!Array.isArray(t)||t.length===0){l.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',c.classList.add("hidden");return}const e=S(t);if(e.length===0){l.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',c.classList.add("hidden");return}const o=T(e),s=e.filter(n=>String(n.todayValue)==="1").length,r=e.length;let a=`
      <div class="glass-card summary-card total-card">
        <h3>סה"כ נוכחים</h3>
        <div class="value">${s} <span class="total-of">/ ${r}</span></div>
      </div>
    `;a+=Object.entries(o).map(([n,d],i)=>{const f=Object.values(d).reduce((m,p)=>m+p,0),L=Object.entries(d).map(([m,p])=>`
                <div class="role-item">
                    <span>${m}</span>
                    <span>${p}</span>
                </div>
            `).join("");return`
          <div class="glass-card summary-card" style="animation-delay: ${(i+1)*.1}s">
            <h3>${n}</h3>
            <div class="value">${f}</div>
            <div class="role-breakdown">
              ${L}
            </div>
          </div>
        `}).join(""),l.innerHTML=a,y.innerHTML="",e.forEach((n,d)=>{const i=document.createElement("tr");i.style.animationDelay=`${d*.03}s`,i.classList.add("fade-in-row");const f=P(n.todayValue);i.innerHTML=`
          <td data-label="שם">${n.name}</td>
          <td data-label="מחלקה">${n.department||"---"}</td>
          <td data-label="תפקיד">${n.role||"---"}</td>
          <td data-label="סטטוס">
            <span class="status-badge ${f}">
              ${H(n.todayValue)}
            </span>
          </td>
        `,y.appendChild(i)}),c.classList.remove("hidden")}function T(t){return t.reduce((e,o)=>{if(String(o.todayValue)==="1"){const s=o.department||"כללי",r=o.role||"אחר";e[s]||(e[s]={}),e[s][r]||(e[s][r]=0),e[s][r]++}return e},{})}function H(t){const e=String(t);switch(e){case"1":return"בבסיס";case"0":return"בבית";case"2":return"מחלה";default:return e||"---"}}function P(t){switch(String(t)){case"1":return"status-1";case"0":return"status-0";case"2":return"status-2";default:return"status-other"}}function g(t){t?h.classList.remove("hidden"):h.classList.add("hidden")}u.value&&v(u.value);
