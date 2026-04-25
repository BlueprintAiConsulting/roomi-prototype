#!/usr/bin/env node
/**
 * scripts/setFounderRoles.js
 *
 * ONE-TIME bootstrap script: sets role:'founder' in Firestore userRoles
 * for all 6 ROOMI council members who have already signed in at least once.
 *
 * Run locally with:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/setFounderRoles.js
 *
 * Or run directly via Firebase Admin in the Firebase Console → Functions shell.
 *
 * Prerequisites:
 *   1. Download your Firebase service account key from:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save as ./serviceAccountKey.json (never commit this file!)
 *   3. npm install firebase-admin (if not already installed)
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'roomi-companion',
});

const db = admin.firestore();
const auth = admin.auth();

// Founding council emails — must match what they signed in with
const FOUNDER_EMAILS = [
  'drewhufnagle@gmail.com',      // Drew Hufnagle
  'wadecsmith@gmail.com',        // Wade Smith
  'cassiesmith@gmail.com',       // Cassie Smith (update if different Google acct)
  'alyssasenft@gmail.com',       // Alyssa Senft
  'daltonsenft@gmail.com',       // Dalton Senft
  'breannamccullough@gmail.com', // Breanna McCullough
];

async function setFounderRoles() {
  console.log('🚀 Setting founder roles for ROOMI council...\n');
  let found = 0;
  let notFound = 0;

  for (const email of FOUNDER_EMAILS) {
    try {
      // Look up the UID by email
      const userRecord = await auth.getUserByEmail(email);
      const uid = userRecord.uid;

      // Write role:'founder' to userRoles/{uid}
      await db.doc(`userRoles/${uid}`).set(
        {
          uid,
          role: 'founder',
          email,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`✅  ${email} → uid: ${uid} → role: founder`);
      found++;
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.warn(`⚠️   ${email} → Not found (hasn't signed in yet)`);
      } else {
        console.error(`❌  ${email} → Error: ${err.message}`);
      }
      notFound++;
    }
  }

  console.log(`\n✅ Done. ${found} roles set, ${notFound} not found (sign in first).`);
  process.exit(0);
}

setFounderRoles().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
