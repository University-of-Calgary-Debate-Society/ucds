import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAppCheck, type AppCheck } from 'firebase-admin/app-check';
import { getSecurityRules, type SecurityRules } from 'firebase-admin/security-rules';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;
let adminAppCheck: AppCheck | null = null;
let adminRules: SecurityRules | null = null;

export function getAdminApp(customServiceAccount?: Record<string, unknown>): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  let credentialConfig;
  if (customServiceAccount) {
    credentialConfig = cert(customServiceAccount);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    credentialConfig = cert(parsed);
  }

  adminApp = initializeApp({
    credential: credentialConfig,
    projectId: 'ucds-f5db9'
  });

  return adminApp;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) adminAuth = getAuth(getAdminApp());
  return adminAuth;
}

export function getAdminDb(): Firestore {
  if (!adminDb) adminDb = getFirestore(getAdminApp());
  return adminDb;
}

export function getAdminAppCheck(): AppCheck {
  if (!adminAppCheck) adminAppCheck = getAppCheck(getAdminApp());
  return adminAppCheck;
}

export function getAdminRules(): SecurityRules {
  if (!adminRules) adminRules = getSecurityRules(getAdminApp());
  return adminRules;
}
