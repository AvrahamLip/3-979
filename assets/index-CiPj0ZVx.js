(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const n of a)if(n.type==="childList")for(const r of n.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function o(a){const n={};return a.integrity&&(n.integrity=a.integrity),a.referrerPolicy&&(n.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?n.credentials="include":a.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(a){if(a.ep)return;a.ep=!0;const n=o(a);fetch(a.href,n)}})();const O="https://151.145.89.228.sslip.io/webhook/Doch-1";function T(t){const[e,o,s]=t.split("-");return`${s}/${o}/${e}`}async function I(t){const e=T(t),o=`${O}?date=${e}`;try{const s=await fetch(o);if(!s.ok)throw new Error(`HTTP error! status: ${s.status}`);return await s.json()}catch(s){throw console.error("Error fetching report:",s),s}}const p=document.getElementById("date-picker"),c=document.getElementById("summary-section"),u=document.getElementById("details-section"),f=document.getElementById("details-body"),g=document.getElementById("loading-overlay"),y=document.getElementById("theme-toggle");function B(t){const e=document.cookie.match(new RegExp("(?:^|; )"+t+"=([^;]*)"));return e?decodeURIComponent(e[1]):null}function H(t,e,o){const s=new Date(Date.now()+o*864e5).toUTCString();document.cookie=`${t}=${encodeURIComponent(e)}; expires=${s}; path=/; SameSite=Lax`}function $(t){document.body.classList.toggle("light-mode",t),y.textContent=t?"🌙":"☀️"}const R=B("theme");$(R==="light");y.addEventListener("click",()=>{const t=!document.body.classList.contains("light-mode");$(t),H("theme",t?"light":"dark",365)});const V=new Date().toISOString().split("T")[0];p.value=V;p.addEventListener("change",t=>{const e=t.target.value;e&&L(e)});async function L(t){v(!0);try{const e=await I(t);D(e)}catch(e){c.innerHTML=`<div class="placeholder-msg error">שגיאה בטעינת הנתונים: ${e.message}</div>`,u.classList.add("hidden")}finally{v(!1)}}function k(t){return t.filter(e=>e.name&&String(e.name).trim()!=="")}function D(t){if(!t||!Array.isArray(t)||t.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const e=k(t);if(e.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const o=P(e),s=e.reduce((r,d)=>{const l=String(d.todayValue);return["0","1","2"].includes(l)?r[l]++:r.other++,r},{1:0,0:0,2:0,other:0}),a=e.length;let n=`
      <div class="legend-strip glass-card">
        <span class="legend-title">מקראה:</span>
        <span class="legend-item s-1">🪖 בבסיס</span>
        <span class="legend-item s-0">🏠 בבית</span>
        <span class="legend-item s-2">🤒 מחלה</span>
        <span class="legend-item s-other">❓ אחר</span>
      </div>
      <div class="glass-card summary-card total-card">
        <h3>סה"כ פלוגה</h3>
        <div class="value">${s[1]} <span class="total-of">/ ${a}</span></div>
        <div class="role-breakdown">
            <div class="role-item"><span>🪖 בבסיס</span> <span>${s[1]}</span></div>
            <div class="role-item"><span>🏠 בבית</span> <span>${s[0]}</span></div>
            <div class="role-item"><span>🤒 מחלה</span> <span>${s[2]}</span></div>
            <div class="role-item"><span>❓ אחר</span> <span>${s.other}</span></div>
        </div>
      </div>
    `;n+=Object.entries(o).map(([r,d],l)=>{const m=Object.values(d).reduce((h,i)=>h+i[1],0),w=Object.entries(d).map(([h,i])=>{const b=Object.values(i).reduce((S,E)=>S+E,0);return`
                <div class="role-card-item">
                    <div class="role-header">
                        <span class="role-name">${h}</span>
                        <span class="role-total">${i[1]} / ${b}</span>
                    </div>
                    <div class="status-counts">
                        <span class="s-1"><span class="si">🪖</span>${i[1]}</span>
                        <span class="s-0"><span class="si">🏠</span>${i[0]}</span>
                        <span class="s-2"><span class="si">🤒</span>${i[2]}</span>
                        <span class="s-other"><span class="si">❓</span>${i.other}</span>
                    </div>
                </div>
            `}).join("");return`
          <div class="glass-card summary-card" style="animation-delay: ${(l+1)*.1}s">
            <div class="dept-header">
                <h3>${r}</h3>
                <div class="dept-value">${m}</div>
            </div>
            <div class="role-breakdown">
              ${w}
            </div>
          </div>
        `}).join(""),c.innerHTML=n,f.innerHTML="",e.forEach((r,d)=>{const l=document.createElement("tr");l.style.animationDelay=`${d*.03}s`,l.classList.add("fade-in-row");const m=M(r.todayValue);l.innerHTML=`
          <td data-label="שם">${r.name}</td>
          <td data-label="מחלקה">${r.department||"---"}</td>
          <td data-label="תפקיד">${r.role||"---"}</td>
          <td data-label="סטטוס">
            <span class="status-badge ${m}">
              ${j(r.todayValue)}
            </span>
          </td>
        `,f.appendChild(l)}),u.classList.remove("hidden")}function P(t){return t.reduce((e,o)=>{const s=o.department||"כללי",a=o.role||"אחר",n=String(o.todayValue);return e[s]||(e[s]={}),e[s][a]||(e[s][a]={1:0,0:0,2:0,other:0}),["0","1","2"].includes(n)?e[s][a][n]++:e[s][a].other++,e},{})}function j(t){const e=String(t);switch(e){case"1":return"בבסיס";case"0":return"בבית";case"2":return"מחלה";default:return e||"---"}}function M(t){switch(String(t)){case"1":return"status-1";case"0":return"status-0";case"2":return"status-2";default:return"status-other"}}function v(t){t?g.classList.remove("hidden"):g.classList.add("hidden")}p.value&&L(p.value);
