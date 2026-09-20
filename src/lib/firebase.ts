import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';

// Environment variables configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBBhqUR9zKC0bmvZGfgLkvetgGH-5UBJFI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ucds-f5db9.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ucds-f5db9',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ucds-f5db9.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '179956125478',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:179956125478:web:aefea28728026263a43be7',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-LD17NHLFET',
  appCheckSiteKey: import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || '',
};

// Check if Firebase configuration is configured with actual non-placeholder values
export function isFirebaseConfigured(): boolean {
  const apiKey = firebaseConfig.apiKey;
  return Boolean(
    apiKey &&
    !apiKey.includes('Placeholder') &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('Placeholder')
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let appCheck: AppCheck | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  // Only attempt initialization if API key is provided
  if (firebaseConfig.apiKey) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    auth = getAuth(app);
    if (typeof window !== 'undefined') {
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch (cacheErr) {
        console.warn('Persistent cache initialization notice, falling back to memory cache:', cacheErr);
        try {
          db = initializeFirestore(app, {
            localCache: memoryLocalCache(),
          });
        } catch {
          db = getFirestore(app);
        }
      }
    } else {
      db = getFirestore(app);
    }
    googleProvider = new GoogleAuthProvider();

    // App Check initialization (only if an actual site key is configured)
    if (
      typeof window !== 'undefined' &&
      app &&
      firebaseConfig.appCheckSiteKey &&
      firebaseConfig.appCheckSiteKey.trim().length > 0
    ) {
      try {
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(firebaseConfig.appCheckSiteKey.trim()),
          isTokenAutoRefreshEnabled: true,
        });
      } catch (e) {
        console.warn('App Check initialization notice (non-fatal):', e);
      }
    }

    // Client-side analytics initialization
    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {
        // Analytics unsupported or blocked by adblockers (non-fatal)
      });
    }
  }
} catch (error) {
  console.warn('Firebase initialization notice:', error);
}

export { app, auth, db, analytics, appCheck, googleProvider };
