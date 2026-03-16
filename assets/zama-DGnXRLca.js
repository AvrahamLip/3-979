import{f as b}from"./api-D9CMZcsM.js";const y=[{id:'המושבה - פ"ת',label:'המושבה - פ"ת'},{id:"צרעה",label:"צרעה"},{id:"מכון ויצמן - רחובות",label:"מכון ויצמן - רחובות"},{id:'מפל"ג',label:'מפל"ג'}],d=document.getElementById("date-picker"),w=document.getElementById("departments-container"),S=document.getElementById("loading-overlay"),v=document.getElementById("theme-toggle");function L(s){const e=document.cookie.match(new RegExp("(?:^|; )"+s+"=([^;]*)"));return e?decodeURIComponent(e[1]):null}function k(s,e,l){const t=new Date(Date.now()+l*864e5).toUTCString();document.cookie=`${s}=${encodeURIComponent(e)}; expires=${t}; path=/; SameSite=Lax`}function g(s){document.body.classList.toggle("light-mode",s),v.textContent=s?"🌙":"☀️"}const E=L("theme");g(E==="light");v.addEventListener("click",()=>{const s=!document.body.classList.contains("light-mode");g(s),k("theme",s?"light":"dark",365)});const C=new Date().toISOString().split("T")[0];d.value=C;d.addEventListener("change",s=>{s.target.value&&h(s.target.value)});async function h(s){m(!0);const e=await Promise.allSettled(y.map(t=>b(t.id,s).then(i=>({dept:t,data:i}))));let l="";l+=`
      <div class="legend-strip glass-card">
        <span class="legend-title">מקראה:</span>
        <span class="legend-item s-1">🪖 בבסיס</span>
        <span class="legend-item s-0">🏠 בבית</span>
        <span class="legend-item s-2">🤒 מחלה / גימלים</span>
        <span class="legend-item s-4">⚖️ פיצול</span>
        <span class="legend-item s-5">🚪 שוחרר</span>
        <span class="legend-item s-other">❓ אחר</span>
      </div>
    `;for(const t of e){if(t.status==="rejected"){const p=t.reason?.dept?.label||"לא ידוע";l+=`<div class="glass-card dept-section"><h2>${p}</h2><div class="placeholder-msg error">שגיאה בטעינת הנתונים</div></div>`;continue}const{dept:i,data:c}=t.value;l+=I(i,c)}w.innerHTML=l,m(!1)}function I(s,e){const l=R(e);if(l.length===0)return`
          <div class="glass-card dept-section">
            <h2>${s.label}</h2>
            <div class="placeholder-msg">לא נמצאו נתונים</div>
          </div>`;const t=l.reduce((a,n)=>{const r=o(n.todayValue);return a[r]++,a},{1:0,0:0,2:0,4:0,5:0,other:0}),i=l.length,c=l.reduce((a,n)=>{const r=n.role||"אחר",u=o(n.todayValue);return a[r]||(a[r]={1:0,0:0,2:0,4:0,5:0,other:0}),a[r][u]++,a},{}),p=Object.entries(c).map(([a,n])=>{const r=Object.values(n).reduce((u,$)=>u+$,0);return`
          <div class="role-card-item">
            <div class="role-header">
              <span class="role-name">${a}</span>
              <span class="role-total">${n[1]} / ${r}</span>
            </div>
            <div class="status-counts">
              <span class="s-1"><span class="si">🪖</span>${n[1]}</span>
              <span class="s-0"><span class="si">🏠</span>${n[0]}</span>
              <span class="s-2"><span class="si">🤒</span>${n[2]}</span>
              <span class="s-4"><span class="si">⚖️</span>${n[4]}</span>
              <span class="s-5"><span class="si">🚪</span>${n[5]}</span>
              <span class="s-other"><span class="si">❓</span>${n.other}</span>
            </div>
          </div>`}).join(""),f=l.map((a,n)=>`
      <tr class="fade-in-row" style="animation-delay: ${n*.03}s">
        <td data-label="שם">${a.name}</td>
        <td data-label="מחלקה">${a.department||"---"}</td>
        <td data-label="תפקיד">${a.role||"---"}</td>
        <td data-label="סטטוס">
          <span class="status-badge ${D(a.todayValue)}">
            ${T(a.todayValue)}
          </span>
        </td>
      </tr>
    `).join("");return`
      <div class="glass-card dept-section">
        <div class="dept-section-header" onclick="this.parentElement.classList.toggle('section-collapsed')">
          <h2><span class="toggle-icon">▼</span> ${s.label}</h2>
          <div class="dept-summary-badge">${t[1]} / ${i}</div>
        </div>
        <div class="dept-section-body">
          <div class="dept-totals">
            <div class="role-item"><span>🪖 בבסיס</span> <span>${t[1]}</span></div>
            <div class="role-item"><span>🏠 בבית</span> <span>${t[0]}</span></div>
            <div class="role-item"><span>🤒 מחלה</span> <span>${t[2]}</span></div>
            <div class="role-item"><span>⚖️ פיצול</span> <span>${t[4]}</span></div>
            <div class="role-item"><span>🚪 שוחרר</span> <span>${t[5]}</span></div>
            <div class="role-item"><span>❓ אחר</span> <span>${t.other}</span></div>
          </div>
          <div class="role-breakdown">
            ${p}
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
              <tbody>${f}</tbody>
            </table>
          </div>
        </div>
      </div>`}function R(s){return!s||!Array.isArray(s)?[]:s.filter(e=>e.name&&String(e.name).trim()!=="")}function o(s){const e=String(s??"").trim().toUpperCase();return e==="V"||e==="1"?"1":e==="0"?"0":e==="2"||e==="גימלים"?"2":e==="4"||e==="פיצול"?"4":e==="5"||e==="שוחרר"?"5":e===""?"0":"other"}function T(s){switch(o(s)){case"1":return"בבסיס";case"0":return"בבית";case"2":return"מחלה";case"4":return"פיצול";case"5":return"שוחרר";default:return String(s).trim()||"---"}}function D(s){switch(o(s)){case"1":return"status-1";case"0":return"status-0";case"2":return"status-2";case"4":return"status-4";case"5":return"status-5";default:return"status-other"}}function m(s){S.classList.toggle("hidden",!s)}d.value&&h(d.value);
