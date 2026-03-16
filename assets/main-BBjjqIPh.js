import{f as H,a as M}from"./api-D9CMZcsM.js";const m=document.getElementById("date-picker"),p=document.getElementById("summary-section"),u=document.getElementById("details-section"),b=document.getElementById("details-body"),S=document.getElementById("search-input"),v=document.getElementById("dept-filter"),h=document.getElementById("role-filter"),g=document.getElementById("status-filter"),w=document.getElementById("loading-overlay"),T=document.getElementById("theme-toggle"),E=document.body.dataset.deptId;function O(s){const e=document.cookie.match(new RegExp("(?:^|; )"+s+"=([^;]*)"));return e?decodeURIComponent(e[1]):null}function D(s,e,d){const n=new Date(Date.now()+d*864e5).toUTCString();document.cookie=`${s}=${encodeURIComponent(e)}; expires=${n}; path=/; SameSite=Lax`}function B(s){document.body.classList.toggle("light-mode",s),T.textContent=s?"🌙":"☀️"}const x=O("theme");B(x==="light");T.addEventListener("click",()=>{const s=!document.body.classList.contains("light-mode");B(s),D("theme",s?"light":"dark",365)});const C=new Date().toISOString().split("T")[0];m.value=C;m.addEventListener("change",s=>{const e=s.target.value;e&&k(e)});async function k(s){I(!0);try{const e=E?await H(E,s):await M(s);A(e)}catch(e){p.innerHTML=`<div class="placeholder-msg error">שגיאה בטעינת הנתונים: ${e.message}</div>`,u.classList.add("hidden")}finally{I(!1)}}function F(s){return s.filter(e=>e.name&&String(e.name).trim()!=="")}function A(s){if(!s||!Array.isArray(s)||s.length===0){p.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const e=F(s);if(e.length===0){p.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const d=N(e),n=e.reduce((t,l)=>{const r=String(l.todayValue).trim();return["1","0","2","4","5"].includes(r)?t[r]++:r==="גימלים"?t[2]++:t.other++,t},{1:0,0:0,2:0,4:0,5:0,other:0}),a=e.length;let o=`
      <div class="legend-strip glass-card">
        <span class="legend-title">מקראה:</span>
        <span class="legend-item s-1">🪖 בבסיס</span>
        <span class="legend-item s-0">🏠 בבית</span>
        <span class="legend-item s-2">🤒 מחלה / גימלים</span>
        <span class="legend-item s-4">⚖️ פיצול</span>
        <span class="legend-item s-5">🚪 שוחרר</span>
        <span class="legend-item s-other">❓ אחר</span>
      </div>
      <div class="glass-card summary-card total-card">
        <h3>סה"כ פלוגה</h3>
        <div class="value">${n[1]} <span class="total-of">/ ${a}</span></div>
        <div class="role-breakdown">
            <div class="role-item"><span>🪖 בבסיס</span> <span>${n[1]}</span></div>
            <div class="role-item"><span>🏠 בבית</span> <span>${n[0]}</span></div>
            <div class="role-item"><span>🤒 מחלה / גימלים</span> <span>${n[2]}</span></div>
            <div class="role-item"><span>⚖️ פיצול</span> <span>${n[4]}</span></div>
            <div class="role-item"><span>🚪 שוחרר</span> <span>${n[5]}</span></div>
            <div class="role-item"><span>❓ אחר</span> <span>${n.other}</span></div>
        </div>
      </div>
      <div class="glass-card summary-card total-card global-roles-card">
        <h3>סה"כ לפי תפקידים</h3>
        <div class="role-breakdown global-role-list">
            ${Object.entries(e.reduce((t,l)=>{const r=l.role||"אחר",i=String(l.todayValue).trim();return t[r]||(t[r]={1:0,0:0,2:0,4:0,5:0,other:0}),["1","0","4","5"].includes(i)?t[r][i]++:i==="2"||i==="גימלים"?t[r][2]++:t[r].other++,t},{})).map(([t,l])=>{const r=Object.values(l).reduce((i,f)=>i+f,0);return`
                <div class="role-card-item">
                    <div class="role-header">
                        <span class="role-name">${t}</span>
                        <span class="role-total">${l[1]} / ${r}</span>
                    </div>
                    <div class="status-counts">
                        <span class="s-1"><span class="si">🪖</span>${l[1]}</span>
                        <span class="s-0"><span class="si">🏠</span>${l[0]}</span>
                        <span class="s-2"><span class="si">🤒</span>${l[2]}</span>
                        <span class="s-4"><span class="si">⚖️</span>${l[4]}</span>
                        <span class="s-5"><span class="si">🚪</span>${l[5]}</span>
                        <span class="s-other"><span class="si">❓</span>${l.other}</span>
                    </div>
                </div>`}).join("")}
        </div>
      </div>
    `;o+=Object.entries(d).map(([t,l],r)=>{const i=Object.values(l).reduce(($,c)=>$+c[1],0),f=Object.entries(l).map(([$,c])=>{const j=Object.values(c).reduce((R,V)=>R+V,0);return`
                <div class="role-card-item">
                    <div class="role-header">
                        <span class="role-name">${$}</span>
                        <span class="role-total">${c[1]} / ${j}</span>
                    </div>
                    <div class="status-counts">
                        <span class="s-1"><span class="si">🪖</span>${c[1]}</span>
                        <span class="s-0"><span class="si">🏠</span>${c[0]}</span>
                        <span class="s-2"><span class="si">🤒</span>${c[2]}</span>
                        <span class="s-4"><span class="si">⚖️</span>${c[4]}</span>
                        <span class="s-5"><span class="si">🚪</span>${c[5]}</span>
                        <span class="s-other"><span class="si">❓</span>${c.other}</span>
                    </div>
                </div>
            `}).join("");return`
          <div class="glass-card summary-card collapsed" style="animation-delay: ${(r+1)*.1}s">
            <div class="dept-header" onclick="this.parentElement.classList.toggle('collapsed')">
                <h3><span class="toggle-icon">▼</span> ${t}</h3>
                <div class="dept-value">${i}</div>
            </div>
            <div class="role-breakdown">
              ${f}
            </div>
          </div>
        `}).join(""),p.innerHTML=o,U(e),u.classList.remove("hidden")}function U(s){const e=[...new Set(s.map(a=>a.department||"כללי"))].sort();v.innerHTML='<option value="">כל המחלקות</option>'+e.map(a=>`<option value="${a}">${a}</option>`).join("");const d=[...new Set(s.map(a=>a.role||"אחר"))].sort();h.innerHTML='<option value="">כל התפקידים</option>'+d.map(a=>`<option value="${a}">${a}</option>`).join("");const n=[...new Set(s.map(a=>L(a.todayValue)))].sort();g.innerHTML='<option value="">כל הסטטוסים</option>'+n.map(a=>`<option value="${a}">${a}</option>`).join(""),b.innerHTML="",s.forEach((a,o)=>{const t=document.createElement("tr");t.className="fade-in-row details-row",t.dataset.name=(a.name||"").toLowerCase(),t.dataset.role=(a.role||"").toLowerCase(),t.dataset.dept=a.department||"כללי",t.dataset.status=L(a.todayValue),t.style.animationDelay=`${o*.03}s`;const l=P(a.todayValue);t.innerHTML=`
          <td data-label="שם">${a.name}</td>
          <td data-label="מחלקה">${a.department||"---"}</td>
          <td data-label="תפקיד">${a.role||"---"}</td>
          <td data-label="סטטוס">
            <span class="status-badge ${l}">
              ${L(a.todayValue)}
            </span>
          </td>
        `,b.appendChild(t)}),S.value="",v.value="",h.value="",g.value=""}function y(){const s=S.value.toLowerCase().trim(),e=v.value,d=h.value,n=g.value;document.querySelectorAll(".details-row").forEach(o=>{const t=e===""||e===o.dataset.dept,l=d===""||d===o.dataset.role,r=n===""||n===o.dataset.status,i=o.dataset.name.includes(s)||o.dataset.role.includes(s);t&&l&&r&&i?o.style.display="":o.style.display="none"})}S.addEventListener("input",y);v.addEventListener("change",y);h.addEventListener("change",y);g.addEventListener("change",y);function N(s){return s.reduce((e,d)=>{const n=d.department||"כללי",a=d.role||"אחר",o=String(d.todayValue).trim();return e[n]||(e[n]={}),e[n][a]||(e[n][a]={1:0,0:0,2:0,4:0,5:0,other:0}),["0","1","4","5"].includes(o)?e[n][a][o]++:o==="2"||o==="גימלים"?e[n][a][2]++:e[n][a].other++,e},{})}function L(s){const e=String(s).trim();switch(e){case"1":return"בבסיס";case"0":return"בבית";case"2":case"גימלים":return"מחלה";case"4":return"פיצול";case"5":return"שוחרר";default:return e||"---"}}function P(s){switch(String(s).trim()){case"1":return"status-1";case"0":return"status-0";case"2":case"גימלים":return"status-2";case"4":return"status-4";case"5":return"status-5";default:return"status-other"}}function I(s){s?w.classList.remove("hidden"):w.classList.add("hidden")}m.value&&k(m.value);
