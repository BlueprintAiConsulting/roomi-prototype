// Seed pilot invite codes into Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBcnI6c6JZOMiu59iDpJCayf5M3-gJjaR4',
  authDomain: 'roomi-companion.firebaseapp.com',
  projectId: 'roomi-companion',
  storageBucket: 'roomi-companion.firebasestorage.app',
  messagingSenderId: '934625668511',
  appId: '1:934625668511:web:881223b31aea4abea021aa',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

await signInAnonymously(auth);
console.log('Signed in anonymously');

const CODES = [
  { code: 'ROOMI-WADE-01',    role: 'resident',  facilityId: 'founding-council', facilityName: 'ROOMI Founding Council', notes: 'Wade Smith' },
  { code: 'ROOMI-CASS-01',    role: 'resident',  facilityId: 'founding-council', facilityName: 'ROOMI Founding Council', notes: 'Cassie Smith' },
  { code: 'ROOMI-ALYSSA-01',  role: 'resident',  facilityId: 'founding-council', facilityName: 'ROOMI Founding Council', notes: 'Alyssa Senft' },
  { code: 'ROOMI-DALTON-01',  role: 'resident',  facilityId: 'founding-council', facilityName: 'ROOMI Founding Council', notes: 'Dalton Senft' },
  { code: 'ROOMI-BREANNA-01', role: 'resident',  facilityId: 'founding-council', facilityName: 'ROOMI Founding Council', notes: 'Breanna McCullough' },
  { code: 'ROOMI-ANCHOR-01',  role: 'caregiver', facilityId: 'founding-council', facilityName: 'ROOMI Founding Council', notes: 'Caregiver code #1' },
  { code: 'ROOMI-ANCHOR-02',  role: 'caregiver', facilityId: 'founding-council', facilityName: 'ROOMI Founding Council', notes: 'Caregiver code #2' },
  { code: 'ROOMI-ANCHOR-03',  role: 'caregiver', facilityId: 'founding-council', facilityName: 'ROOMI Founding Council', notes: 'Caregiver code #3' },
  { code: 'PILOT-RES-001',    role: 'resident',  facilityId: 'pilot-1', facilityName: 'Pilot Facility', notes: 'Generic pilot' },
  { code: 'PILOT-RES-002',    role: 'resident',  facilityId: 'pilot-1', facilityName: 'Pilot Facility', notes: 'Generic pilot' },
  { code: 'PILOT-RES-003',    role: 'resident',  facilityId: 'pilot-1', facilityName: 'Pilot Facility', notes: 'Generic pilot' },
  { code: 'PILOT-RES-004',    role: 'resident',  facilityId: 'pilot-1', facilityName: 'Pilot Facility', notes: 'Generic pilot' },
  { code: 'PILOT-RES-005',    role: 'resident',  facilityId: 'pilot-1', facilityName: 'Pilot Facility', notes: 'Generic pilot' },
  { code: 'PILOT-CARE-001',   role: 'caregiver', facilityId: 'pilot-1', facilityName: 'Pilot Facility', notes: 'Generic pilot' },
  { code: 'PILOT-CARE-002',   role: 'caregiver', facilityId: 'pilot-1', facilityName: 'Pilot Facility', notes: 'Generic pilot' },
];

console.log(`Seeding ${CODES.length} invite codes...`);
for (const c of CODES) {
  const id = c.code.toLowerCase().replace(/[^a-z0-9]/g, '-');
  await setDoc(doc(db, 'inviteCodes', id), { ...c, used: false, usedBy: null, usedAt: null, createdAt: new Date().toISOString() });
  console.log(`  ✅ ${c.code} (${c.role})`);
}
console.log('\nDone!');
process.exit(0);
