(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const n of a)if(n.type==="childList")for(const r of n.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&s(r)}).observe(document,{childList:!0,subtree:!0});function l(a){const n={};return a.integrity&&(n.integrity=a.integrity),a.referrerPolicy&&(n.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?n.credentials="include":a.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(a){if(a.ep)return;a.ep=!0;const n=l(a);fetch(a.href,n)}})();const O="https://151.145.89.228.sslip.io/webhook/Doch-1";function S(t){const[e,l,s]=t.split("-");return`${s}/${l}/${e}`}async function E(t){const e=S(t),l=`${O}?date=${e}`;try{const s=await fetch(l);if(!s.ok)throw new Error(`HTTP error! status: ${s.status}`);return await s.json()}catch(s){throw console.error("Error fetching report:",s),s}}const p=document.getElementById("date-picker"),c=document.getElementById("summary-section"),u=document.getElementById("details-section"),v=document.getElementById("details-body"),h=document.getElementById("loading-overlay"),T=new Date().toISOString().split("T")[0];p.value=T;p.addEventListener("change",t=>{const e=t.target.value;e&&y(e)});async function y(t){g(!0);try{const e=await E(t);H(e)}catch(e){c.innerHTML=`<div class="placeholder-msg error">שגיאה בטעינת הנתונים: ${e.message}</div>`,u.classList.add("hidden")}finally{g(!1)}}function B(t){return t.filter(e=>e.name&&String(e.name).trim()!=="")}function H(t){if(!t||!Array.isArray(t)||t.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const e=B(t);if(e.length===0){c.innerHTML='<div class="placeholder-msg">לא נמצאו נתונים לתאריך זה</div>',u.classList.add("hidden");return}const l=V(e),s=e.reduce((r,i)=>{const o=String(i.todayValue);return["0","1","2"].includes(o)?r[o]++:r.other++,r},{1:0,0:0,2:0,other:0}),a=e.length;let n=`
      <div class="legend-strip glass-card">
        <span class="legend-title">מקראה:</span>
        <span class="legend-item"><span class="legend-dot s-1"></span> בבסיס</span>
        <span class="legend-item"><span class="legend-dot s-0"></span> בבית</span>
        <span class="legend-item"><span class="legend-dot s-2"></span> מחלה</span>
        <span class="legend-item"><span class="legend-dot s-other"></span> אחר</span>
      </div>
      <div class="glass-card summary-card total-card">
        <h3>סה"כ פלוגה</h3>
        <div class="value">${s[1]} <span class="total-of">/ ${a}</span></div>
        <div class="role-breakdown">
            <div class="role-item"><span>בבסיס:</span> <span>${s[1]}</span></div>
            <div class="role-item"><span>בבית:</span> <span>${s[0]}</span></div>
            <div class="role-item"><span>מחלה:</span> <span>${s[2]}</span></div>
            <div class="role-item"><span>אחר:</span> <span>${s.other}</span></div>
        </div>
      </div>
    `;n+=Object.entries(l).map(([r,i],o)=>{const m=Object.values(i).reduce((f,d)=>f+d[1],0),$=Object.entries(i).map(([f,d])=>{const L=Object.values(d).reduce((w,b)=>w+b,0);return`
                <div class="role-card-item">
                    <div class="role-header">
                        <span class="role-name">${f}</span>
                        <span class="role-total">${d[1]} / ${L}</span>
                    </div>
                    <div class="status-counts">
                        <span class="s-1" title="בבסיס">${d[1]}</span>
                        <span class="s-0" title="בבית">${d[0]}</span>
                        <span class="s-2" title="מחלה">${d[2]}</span>
                        <span class="s-other" title="אחר">${d.other}</span>
                    </div>
                </div>
            `}).join("");return`
          <div class="glass-card summary-card" style="animation-delay: ${(o+1)*.1}s">
            <div class="dept-header">
                <h3>${r}</h3>
                <div class="dept-value">${m}</div>
            </div>
            <div class="role-breakdown">
              ${$}
            </div>
          </div>
        `}).join(""),c.innerHTML=n,v.innerHTML="",e.forEach((r,i)=>{const o=document.createElement("tr");o.style.animationDelay=`${i*.03}s`,o.classList.add("fade-in-row");const m=P(r.todayValue);o.innerHTML=`
          <td data-label="שם">${r.name}</td>
          <td data-label="מחלקה">${r.department||"---"}</td>
          <td data-label="תפקיד">${r.role||"---"}</td>
          <td data-label="סטטוס">
            <span class="status-badge ${m}">
              ${I(r.todayValue)}
            </span>
          </td>
        `,v.appendChild(o)}),u.classList.remove("hidden")}function V(t){return t.reduce((e,l)=>{const s=l.department||"כללי",a=l.role||"אחר",n=String(l.todayValue);return e[s]||(e[s]={}),e[s][a]||(e[s][a]={1:0,0:0,2:0,other:0}),["0","1","2"].includes(n)?e[s][a][n]++:e[s][a].other++,e},{})}function I(t){const e=String(t);switch(e){case"1":return"בבסיס";case"0":return"בבית";case"2":return"מחלה";default:return e||"---"}}function P(t){switch(String(t)){case"1":return"status-1";case"0":return"status-0";case"2":return"status-2";default:return"status-other"}}function g(t){t?h.classList.remove("hidden"):h.classList.add("hidden")}p.value&&y(p.value);
