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
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('service-account.json not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = getApps().length === 0 ? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
}) : getApps()[0];

console.log('Firebase Admin initialized successfully with project:', serviceAccount.project_id);

async function testConnections() {
  try {
    const auth = getAuth(app);
    const listUsersResult = await auth.listUsers(5);
    console.log(`✓ Auth check successful! Retrieved ${listUsersResult.users.length} users in project.`);
  } catch (err) {
    console.error('Auth error:', err);
  }

  try {
    const db = getFirestore(app);
    const collections = await db.listCollections();
    console.log(`✓ Firestore check successful! Collections: ${collections.map(c => c.id).join(', ') || '(none yet - database is active)'}`);
  } catch (err) {
    console.error('Firestore error:', err);
  }

  try {
    const appCheck = getAppCheck(app);
    console.log('✓ App Check Admin SDK service initialized and ready.');
  } catch (err) {
    console.error('App Check error:', err);
  }

  try {
    const rules = getSecurityRules(app);
    const firestoreRuleset = await rules.getFirestoreRuleset();
    console.log(`✓ Security Rules check successful! Active ruleset name: ${firestoreRuleset.name}`);
  } catch (err) {
    console.warn('Security Rules check notice:', err.message);
  }

  process.exit(0);
}

testConnections().catch((err) => {
  console.error('Error during test:', err);
  process.exit(1);
});
