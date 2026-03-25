const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'attendance.json');
if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Hapak Eligibility Criteria
const specs = [
    'מהנדס', 
    'רופא', 
    'אוכלוסיה', 
    'שו"ב', 
    'קשר', 
    'חובש', 
    'מפקד', 
    'חפ"ק', 
    'חפק',
    'קצין'
];

const eligible = data.filter(p => {
    if (!p.role) return false;
    const roleNormalized = p.role.replace(/\"/g, '');
    return specs.some(s => roleNormalized.includes(s)) || p.department.includes('מפקד');
});

console.log('--- חברי יחידה פוטנציאליים לחפ"ק ---');
console.table(eligible.map(p => ({
    'שם': p.name,
    'תפקיד': p.role,
    'מחלקה': p.department,
    'סטטוס': p.todayValue === '1' ? 'בבסיס' : p.todayValue
})));

console.log('\n--- סיכום לפי תפקיד ---');
const summary = eligible.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
}, {});
console.log(summary);
