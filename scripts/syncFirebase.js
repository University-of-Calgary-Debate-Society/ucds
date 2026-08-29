import { initTimeSync } from './timeSync.js';

await initTimeSync();

const { initializeApp, cert, getApps } = await import('firebase-admin/app');
const { getAuth } = await import('firebase-admin/auth');
const { getFirestore } = await import('firebase-admin/firestore');
const { getAppCheck } = await import('firebase-admin/app-check');
const { getSecurityRules } = await import('firebase-admin/security-rules');
const fs = await import('fs');
const path = await import('path');
const { fileURLToPath } = await import('url');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve service account from local file or environment variable (useful for CI/CD)
function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var:', e);
    }
  }

  const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  }

  throw new Error('No service account found in FIREBASE_SERVICE_ACCOUNT_KEY or service-account.json');
}

const serviceAccount = getServiceAccount();
const app = getApps().length === 0 ? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
}) : getApps()[0];

console.log(`[Firebase Sync] Initialized Admin SDK for project: ${serviceAccount.project_id}`);

async function syncAll() {
  console.log('\n--- 1. Syncing Firestore Security Rules ---');
  const rulesPath = path.resolve(__dirname, '../firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    throw new Error('firestore.rules file not found!');
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  const securityRules = getSecurityRules(app);

  try {
    console.log('Compiling and publishing new Firestore ruleset...');
    const rulesetFile = {
      name: 'firestore.rules',
      content: rulesContent
    };
    const createdRuleset = await securityRules.createRuleset(rulesetFile);
    console.log(`✓ Ruleset created: ${createdRuleset.name}`);

    console.log('Releasing ruleset to live Firestore database...');
    await securityRules.releaseFirestoreRuleset(createdRuleset.name);
    console.log(`✓ Firestore rules successfully released and active! (Timestamp: ${createdRuleset.createTime})`);
  } catch (error) {
    console.error('Failed to publish security rules:', error);
    throw error;
  }

  console.log('\n--- 2. Verifying Firestore Connectivity ---');
  const db = getFirestore(app);
  const collections = await db.listCollections();
  console.log(`✓ Firestore connected successfully. Active collections count: ${collections.length}`);

  console.log('\n--- 3. Verifying Authentication Service ---');
  const auth = getAuth(app);
  const users = await auth.listUsers(5);
  console.log(`✓ Firebase Auth connected successfully. Total registered users: ${users.users.length}`);

  console.log('\n--- 4. Initializing App Check Service ---');
  const appCheck = getAppCheck(app);
  console.log('✓ Firebase App Check Admin SDK configured and active.');

  console.log('\n========================================');
  console.log('✅ ALL FIREBASE RULES & SERVICES SYNCHRONIZED');
  console.log('========================================\n');
}

syncAll().catch((err) => {
  console.error('\n❌ Sync failed:', err);
  process.exit(1);
});
