import"./modulepreload-polyfill-B5Qt9EMX.js";const y="https://151.145.89.228.sslip.io/webhook/Zama/Doch-1";function b(s){const[e,a,n]=s.split("-");return`${n}/${a}/${e}`}async function w(s,e){const a=b(e),n=`${y}?id=${encodeURIComponent(s)}&date=${a}`;try{const r=await fetch(n);if(!r.ok)throw new Error(`HTTP error! status: ${r.status}`);const o=await r.json();return o.data||o}catch(r){throw console.error("Error fetching report by ID:",r),r}}const S=[{id:'המושבה - פ"ת',label:'המושבה - פ"ת'},{id:"צרעה",label:"צרעה"},{id:"מכון ויצמן - רחובות",label:"מכון ויצמן - רחובות"},{id:'מפל"ג',label:'מפל"ג'}],c=document.getElementById("date-picker"),E=document.getElementById("departments-container"),k=document.getElementById("loading-overlay"),v=document.getElementById("theme-toggle");function L(s){const e=document.cookie.match(new RegExp("(?:^|; )"+s+"=([^;]*)"));return e?decodeURIComponent(e[1]):null}function I(s,e,a){const n=new Date(Date.now()+a*864e5).toUTCString();document.cookie=`${s}=${encodeURIComponent(e)}; expires=${n}; path=/; SameSite=Lax`}function g(s){document.body.classList.toggle("light-mode",s),v.textContent=s?"🌙":"☀️"}const C=L("theme");g(C==="light");v.addEventListener("click",()=>{const s=!document.body.classList.contains("light-mode");g(s),I("theme",s?"light":"dark",365)});const D=new Date().toISOString().split("T")[0];c.value=D;c.addEventListener("change",s=>{s.target.value&&$(s.target.value)});async function $(s){var n,r;m(!0);const e=await Promise.allSettled(S.map(o=>w(o.id,s).then(d=>({dept:o,data:d}))));let a="";a+=`
      <div class="legend-strip glass-card">
        <span class="legend-title">מקראה:</span>
        <span class="legend-item s-1">🪖 בבסיס</span>
        <span class="legend-item s-0">🏠 בבית</span>
        <span class="legend-item s-2">🤒 מחלה / גימלים</span>
        <span class="legend-item s-4">⚖️ פיצול</span>
        <span class="legend-item s-5">🚪 שוחרר</span>
        <span class="legend-item s-other">❓ אחר</span>
      </div>
    `;for(const o of e){if(o.status==="rejected"){const t=((r=(n=o.reason)==null?void 0:n.dept)==null?void 0:r.label)||"לא ידוע";a+=`<div class="glass-card dept-section"><h2>${t}</h2><div class="placeholder-msg error">שגיאה בטעינת הנתונים</div></div>`;continue}const{dept:d,data:u}=o.value;a+=R(d,u)}E.innerHTML=a,m(!1)}function R(s,e){const a=T(e);if(a.length===0)return`
          <div class="glass-card dept-section">
            <h2>${s.label}</h2>
            <div class="placeholder-msg">לא נמצאו נתונים</div>
          </div>`;const n=a.reduce((t,l)=>{const i=p(l.todayValue);return t[i]++,t},{1:0,0:0,2:0,4:0,5:0,other:0}),r=a.length,o=a.reduce((t,l)=>{const i=l.role||"אחר",h=p(l.todayValue);return t[i]||(t[i]={1:0,0:0,2:0,4:0,5:0,other:0}),t[i][h]++,t},{}),d=Object.entries(o).map(([t,l])=>{const i=Object.values(l).reduce((h,f)=>h+f,0);return`
          <div class="role-card-item">
            <div class="role-header">
              <span class="role-name">${t}</span>
              <span class="role-total">${l[1]} / ${i}</span>
            </div>
            <div class="status-counts">
              <span class="s-1"><span class="si">🪖</span>${l[1]}</span>
              <span class="s-0"><span class="si">🏠</span>${l[0]}</span>
              <span class="s-2"><span class="si">🤒</span>${l[2]}</span>
              <span class="s-4"><span class="si">⚖️</span>${l[4]}</span>
              <span class="s-5"><span class="si">🚪</span>${l[5]}</span>
              <span class="s-other"><span class="si">❓</span>${l.other}</span>
            </div>
          </div>`}).join(""),u=a.map((t,l)=>`
      <tr class="fade-in-row" style="animation-delay: ${l*.03}s">
        <td data-label="שם">${t.name}</td>
        <td data-label="מחלקה">${t.department||"---"}</td>
        <td data-label="תפקיד">${t.role||"---"}</td>
        <td data-label="סטטוס">
          <span class="status-badge ${A(t.todayValue)}">
            ${j(t.todayValue)}
          </span>
        </td>
      </tr>
    `).join("");return`
      <div class="glass-card dept-section">
        <div class="dept-section-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
          <h2><span class="toggle-icon">▼</span> ${s.label}</h2>
          <div class="dept-summary-badge">${n[1]} / ${r}</div>
        </div>
        <div class="dept-section-body">
          <div class="dept-totals">
            <div class="role-item"><span>🪖 בבסיס</span> <span>${n[1]}</span></div>
            <div class="role-item"><span>🏠 בבית</span> <span>${n[0]}</span></div>
            <div class="role-item"><span>🤒 מחלה</span> <span>${n[2]}</span></div>
            <div class="role-item"><span>⚖️ פיצול</span> <span>${n[4]}</span></div>
            <div class="role-item"><span>🚪 שוחרר</span> <span>${n[5]}</span></div>
            <div class="role-item"><span>❓ אחר</span> <span>${n.other}</span></div>
          </div>
          <div class="role-breakdown">
            ${d}
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>מחלקה</th>
                  <th>תפקיד</th>
                  <th>סטטוס</th>
                </tr>
              </thead>
              <tbody>${u}</tbody>
            </table>
          </div>
        </div>
      </div>`}function T(s){return!s||!Array.isArray(s)?[]:s.filter(e=>e.name&&String(e.name).trim()!=="")}function p(s){const e=String(s??"").trim().toUpperCase();return e==="V"||e==="1"?"1":e==="0"?"0":e==="2"||e==="גימלים"?"2":e==="4"||e==="פיצול"?"4":e==="5"||e==="שוחרר"?"5":e===""?"0":"other"}function j(s){switch(p(s)){case"1":return"בבסיס";case"0":return"בבית";case"2":return"מחלה";case"4":return"פיצול";case"5":return"שוחרר";default:return String(s).trim()||"---"}}function A(s){switch(p(s)){case"1":return"status-1";case"0":return"status-0";case"2":return"status-2";case"4":return"status-4";case"5":return"status-5";default:return"status-other"}}function m(s){k.classList.toggle("hidden",!s)}c.value&&$(c.value);
