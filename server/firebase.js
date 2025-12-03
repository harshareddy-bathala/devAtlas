const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let app;
let db;
let auth;

function initializeFirebase() {
  if (app) return { db, auth };

  // Use service account from environment variable or file
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require('./serviceAccountKey.json');

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  db = admin.firestore();
  auth = admin.auth();

  // Enable offline persistence settings
  db.settings({
    ignoreUndefinedProperties: true
  });

  console.log('🔥 Firebase initialized successfully');
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
    console.error('Token verification failed:', error.message);
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
