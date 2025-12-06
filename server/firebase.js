const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
let app;
let db;
let auth;

function initializeFirebase() {
  if (app) return { db, auth };

  let serviceAccount;
  const isDev = process.env.NODE_ENV !== 'production';

  // Try to get service account from environment variable first (RECOMMENDED)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const envValue = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    
    try {
      // Check if it's base64 encoded (doesn't start with '{')
      if (!envValue.startsWith('{')) {
        // Decode from base64
        const decoded = Buffer.from(envValue, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
        console.log('🔐 Using Firebase service account from environment variable (base64 decoded)');
      } else {
        // Parse as raw JSON
        serviceAccount = JSON.parse(envValue);
        console.log('🔐 Using Firebase service account from environment variable');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable');
      console.error('   Make sure it contains valid JSON or base64-encoded JSON');
      console.error('   Error:', parseError.message);
      process.exit(1);
    }
  } else {
    // Fall back to file-based auth for local development ONLY
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      serviceAccount = require('./serviceAccountKey.json');
      
      // Show warning in dev mode about using file-based auth
      if (isDev) {
        console.warn('');
        console.warn('⚠️  WARNING: Using file-based Firebase authentication');
        console.warn('   This is acceptable for local development, but for production:');
        console.warn('   1. Set FIREBASE_SERVICE_ACCOUNT environment variable');
        console.warn('   2. Never commit serviceAccountKey.json to version control');
        console.warn('   3. See SECURITY.md for proper configuration');
        console.warn('');
      } else {
        // In production, strongly warn about file-based auth
        console.error('');
        console.error('🚨 SECURITY WARNING: Using file-based Firebase authentication in production!');
        console.error('   This is NOT recommended. Please set FIREBASE_SERVICE_ACCOUNT env variable.');
        console.error('   See SECURITY.md for proper production configuration.');
        console.error('');
      }
    } else {
      console.error('❌ Firebase service account not found!');
      console.error('   Please either:');
      console.error('   1. Set FIREBASE_SERVICE_ACCOUNT env variable with the JSON content (RECOMMENDED)');
      console.error('   2. Create server/serviceAccountKey.json file (local dev only)');
      console.error('');
      console.error('   Get the service account key from:');
      console.error('   Firebase Console → Project Settings → Service Accounts → Generate new private key');
      console.error('');
      console.error('   See SECURITY.md for detailed setup instructions.');
      process.exit(1);
    }
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  db = admin.firestore();
  auth = admin.auth();

  // Configure Firestore settings
  db.settings({
    ignoreUndefinedProperties: true
  });

  console.log('🔥 Firebase initialized successfully');
  console.log(`📁 Project ID: ${serviceAccount.project_id}`);
  
  // Test Firestore connection
  db.collection('_health_check').limit(1).get()
    .then(() => console.log('✅ Firestore connection verified'))
    .catch(err => {
      console.error('❌ Firestore connection failed:', err.message);
      console.error('   Make sure:');
      console.error('   1. Firestore database is created in Firebase Console');
      console.error('   2. Database is in Native mode (not Datastore mode)');
      console.error('   3. Service account has Firestore permissions');
    });
    
  return { db, auth };
}

// Get Firestore instance
function getDb() {
  if (!db) initializeFirebase();
  return db;
}

// Get Auth instance
function getAuth() {
  if (!auth) initializeFirebase();
  return auth;
}

// Verify Firebase ID token from client
async function verifyIdToken(idToken) {
  try {
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error.code || 'NO_CODE', '-', error.message);
    
    // Provide more specific error messages
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Token expired. Please sign in again.');
    }
    if (error.code === 'auth/argument-error') {
      throw new Error('Invalid token format');
    }
    if (error.code === 'auth/id-token-revoked') {
      throw new Error('Token has been revoked. Please sign in again.');
    }
    
    throw new Error('Invalid or expired token');
  }
}

// Get or create user in Firestore
async function getOrCreateUser(firebaseUser) {
  const db = getDb();
  const userRef = db.collection('users').doc(firebaseUser.uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    // Update last login
    await userRef.update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { id: firebaseUser.uid, ...userDoc.data() };
  }

  // Create new user
  const newUser = {
    email: firebaseUser.email,
    name: firebaseUser.name || firebaseUser.email?.split('@')[0] || 'User',
    avatarUrl: firebaseUser.picture || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await userRef.set(newUser);
  return { id: firebaseUser.uid, ...newUser };
}

module.exports = {
  initializeFirebase,
  getDb,
  getAuth,
  verifyIdToken,
  getOrCreateUser,
  admin
};
