const fs = require("fs");
const path = require("path");

const dates = [];
const start = new Date("2026-08-20");
const end = new Date("2026-09-18");
for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const iso = d.toISOString().split("T")[0];
  const [y, m, dd] = iso.split("-");
  dates.push({ iso, api: `${parseInt(dd, 10)}/${parseInt(m, 10)}/${y.slice(2)}` });
}

const dir = path.resolve(__dirname, "../src/test/fixtures");
fs.mkdirSync(dir, { recursive: true });

async function fetchOne(apiDate) {
  const res = await fetch(`https://151.145.89.228.sslip.io/webhook/Doch-1?date=${encodeURIComponent(apiDate)}`);
  const text = await res.text();
  return JSON.parse(text);
}

(async () => {
  const all = {};
  for (const { iso, api } of dates) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const json = await fetchOne(api);
        all[iso] = json;
        console.log(`ok ${iso} (${json.length} rows)`);
        break;
      } catch (e) {
        console.log(`retry ${iso}: ${e.message}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    if (!all[iso]) console.error(`MISS ${iso}`);
    await new Promise(r => setTimeout(r, 250));
  }
  const meta = { generatedAt: new Date().toISOString(), source: "https://151.145.89.228.sslip.io/webhook/Doch-1" };
  fs.writeFileSync(path.join(dir, "attendance-2026-08-20-to-2026-09-18.json"), JSON.stringify({ meta, dates: all }, null, 2), "utf8");
  console.log("done");
})();