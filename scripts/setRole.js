import { initTimeSync } from './timeSync.js';

await initTimeSync();

const { initializeApp, cert, getApps } = await import('firebase-admin/app');
const { getAuth } = await import('firebase-admin/auth');
const { getFirestore } = await import('firebase-admin/firestore');
const fs = await import('fs');
const path = await import('path');
const { fileURLToPath } = await import('url');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/setRole.js <email-or-uid> <admin|executive|member>');
  console.log('Example: node scripts/setRole.js user@ucalgary.ca admin');
  process.exit(1);
}

const [targetIdentifier, role] = args;
const validRoles = ['admin', 'executive', 'member'];
if (!validRoles.includes(role.toLowerCase())) {
  console.error(`Invalid role "${role}". Must be one of: ${validRoles.join(', ')}`);
  process.exit(1);
}

const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = getApps().length === 0 ? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
}) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);

async function setRole() {
  let userRecord;
  try {
    if (targetIdentifier.includes('@')) {
      userRecord = await auth.getUserByEmail(targetIdentifier);
    } else {
      userRecord = await auth.getUser(targetIdentifier);
    }
  } catch (err) {
    console.error(`User "${targetIdentifier}" not found:`, err.message);
    process.exit(1);
  }

  const customClaims = {
    role: role.toLowerCase(),
    admin: role.toLowerCase() === 'admin',
    executive: ['admin', 'executive'].includes(role.toLowerCase()),
    member: true
  };

  await auth.setCustomUserClaims(userRecord.uid, customClaims);
  console.log(`✓ Set custom claims for user ${userRecord.email} (${userRecord.uid}):`, customClaims);

  // Sync to Firestore user profile
  const userDocRef = db.collection('users').doc(userRecord.uid);
  await userDocRef.set({
    uid: userRecord.uid,
    email: userRecord.email,
    role: role.toLowerCase(),
    isAdmin: role.toLowerCase() === 'admin',
    isExecutive: ['admin', 'executive'].includes(role.toLowerCase()),
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log(`✓ Synced user document in Firestore collection 'users/${userRecord.uid}'`);
}

setRole().catch(console.error);
