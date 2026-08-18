import fs from 'fs';
import { generateAssignment } from './src/pages/GuardAssignmentPage';
import { processRecords } from './src/lib/attendanceUtils';

async function run() {
  let rawData = [];
  try {
    const file = fs.readFileSync('./tmp/attendance.json', 'utf8');
    rawData = JSON.parse(file);
  } catch (e) {
    console.log("Could not load tmp/attendance.json");
    return;
  }
  
  const records = processRecords(rawData);
  const result = generateAssignment(records, {}, [], new Set(), '2026-08-20');
  
  console.log("=== CHAMAL ===");
  result.chamal.forEach(s => console.log(`${s.timeLabel}: ${s.assignedTo}`));
  
  result.missions.forEach(m => {
    console.log(`\n=== ${m.postType} ===`);
    m.slots.forEach(s => {
      console.log(`${s.roleLabel} (${s.requiredRole}): ${s.assignedTo || 'UNASSIGNED'}`);
    });
  });
}

run();
