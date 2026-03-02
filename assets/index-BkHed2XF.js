(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function o(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(n){if(n.ep)return;n.ep=!0;const a=o(n);fetch(n.href,a)}})();const O="https://151.145.89.228.sslip.io/webhook/Doch-1";function T(t){const[e,o,s]=t.split("-");return`${s}/${o}/${e}`}async function I(t){const e=T(t),o=`${O}?date=${e}`;try{const s=await fetch(o);if(!s.ok)throw new Error(`HTTP error! status: ${s.status}`);return await s.json()}catch(s){throw console.error("Error fetching report:",s),s}}const p=document.getElementById("date-picker"),c=document.getElementById("summary-section"),u=document.getElementById("details-section"),g=document.getElementById("details-body"),f=document.getElementById("loading-overlay"),y=document.getElementById("theme-toggle");function B(t){const e=document.cookie.match(new RegExp("(?:^|; )"+t+"=([^;]*)"));return e?decodeURIComponent(e[1]):null}function H(t,e,o){const s=new Date(Date.now()+o*864e5).toUTCString();document.cookie=`${t}=${encodeURIComponent(e)}; expires=${s}; path=/; SameSite=Lax`}function $(t){document.body.classList.toggle("light-mode",t),y.textContent=t?"🌙":"☀️"}const R=B("theme");$(R==="light");y.addEventListener("click",()=>{const t=!document.body.classList.contains("light-mode");$(t),H("theme",t?"light":"dark",365)});const V=new Date().toISOString().split("T")[0];p.value=V;p.addEventListener("change",t=>{const e=t.target.value;e&&L(e)});async function L(t){v(!0);try{const e=await I(t);D(e)}catch(e){c.innerHTML=`<div class="placeholder-msg error">שגיאה בטעינת הנתונים: ${e.message}</div>`,u.classList.add("hidden")}finally{v(!1)}}function k(t){return t.filter(e=>e.name&&String(e.name).trim()!=="")}function D(t){if(!t||!Array.isArray(t)||t.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const e=k(t);if(e.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const o=P(e),s=e.reduce((r,i)=>{const l=String(i.todayValue);return["0","1","2"].includes(l)?r[l]++:r.other++,r},{1:0,0:0,2:0,other:0}),n=e.length;let a=`
      <div class="legend-strip glass-card">
        <span class="legend-title">מקראה:</span>
        <span class="legend-item"><span class="legend-dot s-1"></span> בבסיס</span>
        <span class="legend-item"><span class="legend-dot s-0"></span> בבית</span>
        <span class="legend-item"><span class="legend-dot s-2"></span> מחלה</span>
        <span class="legend-item"><span class="legend-dot s-other"></span> אחר</span>
      </div>
      <div class="glass-card summary-card total-card">
        <h3>סה"כ פלוגה</h3>
        <div class="value">${s[1]} <span class="total-of">/ ${n}</span></div>
        <div class="role-breakdown">
            <div class="role-item"><span>בבסיס:</span> <span>${s[1]}</span></div>
            <div class="role-item"><span>בבית:</span> <span>${s[0]}</span></div>
            <div class="role-item"><span>מחלה:</span> <span>${s[2]}</span></div>
            <div class="role-item"><span>אחר:</span> <span>${s.other}</span></div>
        </div>
      </div>
    `;a+=Object.entries(o).map(([r,i],l)=>{const m=Object.values(i).reduce((h,d)=>h+d[1],0),w=Object.entries(i).map(([h,d])=>{const b=Object.values(d).reduce((S,E)=>S+E,0);return`
                <div class="role-card-item">
                    <div class="role-header">
                        <span class="role-name">${h}</span>
                        <span class="role-total">${d[1]} / ${b}</span>
                    </div>
                    <div class="status-counts">
                        <span class="s-1" title="בבסיס">${d[1]}</span>
                        <span class="s-0" title="בבית">${d[0]}</span>
                        <span class="s-2" title="מחלה">${d[2]}</span>
                        <span class="s-other" title="אחר">${d.other}</span>
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
        `}).join(""),c.innerHTML=a,g.innerHTML="",e.forEach((r,i)=>{const l=document.createElement("tr");l.style.animationDelay=`${i*.03}s`,l.classList.add("fade-in-row");const m=M(r.todayValue);l.innerHTML=`
          <td data-label="שם">${r.name}</td>
          <td data-label="מחלקה">${r.department||"---"}</td>
          <td data-label="תפקיד">${r.role||"---"}</td>
          <td data-label="סטטוס">
            <span class="status-badge ${m}">
              ${j(r.todayValue)}
            </span>
          </td>
        `,g.appendChild(l)}),u.classList.remove("hidden")}function P(t){return t.reduce((e,o)=>{const s=o.department||"כללי",n=o.role||"אחר",a=String(o.todayValue);return e[s]||(e[s]={}),e[s][n]||(e[s][n]={1:0,0:0,2:0,other:0}),["0","1","2"].includes(a)?e[s][n][a]++:e[s][n].other++,e},{})}function j(t){const e=String(t);switch(e){case"1":return"בבסיס";case"0":return"בבית";case"2":return"מחלה";default:return e||"---"}}function M(t){switch(String(t)){case"1":return"status-1";case"0":return"status-0";case"2":return"status-2";default:return"status-other"}}function v(t){t?f.classList.remove("hidden"):f.classList.add("hidden")}p.value&&L(p.value);
