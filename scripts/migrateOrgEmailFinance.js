import { initTimeSync } from './timeSync.js';
await initTimeSync();

const { initializeApp, cert, getApps } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const fs = await import('fs');
const path = await import('path');
const { fileURLToPath } = await import('url');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getServiceAccount() {
  const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  }
  throw new Error('service-account.json not found');
}

const serviceAccount = getServiceAccount();
const app = getApps().length === 0 ? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
}) : getApps()[0];

const db = getFirestore(app);

async function migrate() {
  console.log('--- Migrating Organizations to include email-finance ---');
  const orgsRef = db.collection('Organizations');
  const snapshot = await orgsRef.get();

  console.log(`Found ${snapshot.size} organization documents in Firestore.`);
  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    if (doc.id === '_default') continue;
    const data = doc.data();

    // If email-finance is missing or empty, set to email (or fallback empty string)
    if (!data['email-finance'] || typeof data['email-finance'] !== 'string') {
      const fallbackEmail = data.email || '';
      await doc.ref.update({
        'email-finance': fallbackEmail
      });
      console.log(`✓ Updated [${doc.id}]: set email-finance to "${fallbackEmail}"`);
      updatedCount++;
    }
  }

  console.log(`\nMigration complete. Updated ${updatedCount} organization documents.`);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
