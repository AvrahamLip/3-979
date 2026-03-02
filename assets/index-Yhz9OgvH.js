(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))t(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const n of r.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&t(n)}).observe(document,{childList:!0,subtree:!0});function o(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function t(a){if(a.ep)return;a.ep=!0;const r=o(a);fetch(a.href,r)}})();const O="https://151.145.89.228.sslip.io/webhook/Doch-1";function S(s){const[e,o,t]=s.split("-");return`${t}/${o}/${e}`}async function E(s){const e=S(s),o=`${O}?date=${e}`;try{const t=await fetch(o);if(!t.ok)throw new Error(`HTTP error! status: ${t.status}`);return await t.json()}catch(t){throw console.error("Error fetching report:",t),t}}const p=document.getElementById("date-picker"),c=document.getElementById("summary-section"),u=document.getElementById("details-section"),v=document.getElementById("details-body"),h=document.getElementById("loading-overlay"),T=new Date().toISOString().split("T")[0];p.value=T;p.addEventListener("change",s=>{const e=s.target.value;e&&g(e)});async function g(s){y(!0);try{const e=await E(s);H(e)}catch(e){c.innerHTML=`<div class="placeholder-msg error">שגיאה בטעינת הנתונים: ${e.message}</div>`,u.classList.add("hidden")}finally{y(!1)}}function B(s){return s.filter(e=>e.name&&String(e.name).trim()!=="")}function H(s){if(!s||!Array.isArray(s)||s.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const e=B(s);if(e.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const o=V(e),t=e.reduce((n,d)=>{const l=String(d.todayValue);return["0","1","2"].includes(l)?n[l]++:n.other++,n},{1:0,0:0,2:0,other:0}),a=e.length;let r=`
      <div class="glass-card summary-card total-card">
        <h3>סה"כ פלוגה</h3>
        <div class="value">${t[1]} <span class="total-of">/ ${a}</span></div>
        <div class="role-breakdown">
            <div class="role-item"><span>בבסיס:</span> <span>${t[1]}</span></div>
            <div class="role-item"><span>בבית:</span> <span>${t[0]}</span></div>
            <div class="role-item"><span>מחלה:</span> <span>${t[2]}</span></div>
            <div class="role-item"><span>אחר:</span> <span>${t.other}</span></div>
        </div>
      </div>
    `;r+=Object.entries(o).map(([n,d],l)=>{const f=Object.values(d).reduce((m,i)=>m+i[1],0),$=Object.entries(d).map(([m,i])=>{const L=Object.values(i).reduce((w,b)=>w+b,0);return`
                <div class="role-card-item">
                    <div class="role-header">
                        <span class="role-name">${m}</span>
                        <span class="role-total">${i[1]} / ${L}</span>
                    </div>
                    <div class="status-counts">
                        <span class="s-1" title="בבסיס">${i[1]}</span>
                        <span class="s-0" title="בבית">${i[0]}</span>
                        <span class="s-2" title="מחלה">${i[2]}</span>
                        <span class="s-other" title="אחר">${i.other}</span>
                    </div>
                </div>
            `}).join("");return`
          <div class="glass-card summary-card" style="animation-delay: ${(l+1)*.1}s">
            <div class="dept-header">
                <h3>${n}</h3>
                <div class="dept-value">${f}</div>
            </div>
            <div class="role-breakdown">
              ${$}
            </div>
          </div>
        `}).join(""),c.innerHTML=r,v.innerHTML="",e.forEach((n,d)=>{const l=document.createElement("tr");l.style.animationDelay=`${d*.03}s`,l.classList.add("fade-in-row");const f=P(n.todayValue);l.innerHTML=`
          <td data-label="שם">${n.name}</td>
          <td data-label="מחלקה">${n.department||"---"}</td>
          <td data-label="תפקיד">${n.role||"---"}</td>
          <td data-label="סטטוס">
            <span class="status-badge ${f}">
              ${I(n.todayValue)}
            </span>
          </td>
        `,v.appendChild(l)}),u.classList.remove("hidden")}function V(s){return s.reduce((e,o)=>{const t=o.department||"כללי",a=o.role||"אחר",r=String(o.todayValue);return e[t]||(e[t]={}),e[t][a]||(e[t][a]={1:0,0:0,2:0,other:0}),["0","1","2"].includes(r)?e[t][a][r]++:e[t][a].other++,e},{})}function I(s){const e=String(s);switch(e){case"1":return"בבסיס";case"0":return"בבית";case"2":return"מחלה";default:return e||"---"}}function P(s){switch(String(s)){case"1":return"status-1";case"0":return"status-0";case"2":return"status-2";default:return"status-other"}}function y(s){s?h.classList.remove("hidden"):h.classList.add("hidden")}p.value&&g(p.value);
