# DevOrbit Security Guide

This document outlines security best practices for deploying and maintaining DevOrbit.

## Table of Contents

- [Firebase Service Account Setup](#firebase-service-account-setup)
- [Environment Variables](#environment-variables)
- [Firestore Security Rules](#firestore-security-rules)
- [Key Rotation](#key-rotation)
- [Security Checklist](#security-checklist)

---

## Firebase Service Account Setup

### Generating a Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate new private key**
5. Save the JSON file securely - **NEVER commit this to version control**

### Using the Service Account

#### Option 1: Environment Variable (Recommended for Production)

1. Open the downloaded JSON file
2. Minify the JSON (remove all newlines and extra spaces)
3. Set as environment variable:

```bash
# Linux/macOS
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}'

# Windows PowerShell
$env:FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

For deployment platforms:
- **Vercel**: Add in Project Settings → Environment Variables
- **Railway/Render**: Add in dashboard Environment section
- **Google Cloud Run**: Add via Console or gcloud CLI
- **Docker**: Pass via `-e` flag or docker-compose environment

#### Option 2: File-based (Local Development Only)

1. Save the JSON file as `server/serviceAccountKey.json`
2. Ensure it's in `.gitignore` (already configured)
3. **NEVER deploy with the file in the repository**

---

## Environment Variables

### Required for Production

#### Server (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_SERVICE_ACCOUNT` | Full service account JSON | `{"type":"service_account",...}` |
| `NODE_ENV` | Environment mode | `production` |
| `CORS_ORIGIN` | Allowed frontend origins | `https://yourdomain.com` |
| `PORT` | Server port | `3001` |

#### Client (Frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | `my-project-id` |
| `VITE_API_URL` | Backend API URL | `https://api.yourdomain.com` |

### Optional (Recommended)

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Session/rate limit storage |

---

## Firestore Security Rules

DevOrbit uses a **backend-only access model**. The Firestore security rules block ALL direct client access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

### Why This Approach?

1. **Centralized Security**: All authorization logic is in the backend
2. **Audit Trail**: All operations are logged server-side
3. **Flexibility**: Complex business logic without rules limitations
4. **Admin SDK Bypass**: Firebase Admin SDK bypasses these rules entirely

### Deploying Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy rules only
firebase deploy --only firestore:rules
```

---

## Key Rotation

### When to Rotate Keys

- **Immediately** if keys are exposed (committed to repo, shared publicly)
- **Periodically** (recommended: every 90 days)
- When team members with access leave

### How to Rotate Firebase Service Account Key

1. **Generate new key** (see [Generating a Service Account Key](#generating-a-service-account-key))

2. **Update environment variables** in all deployment environments:
   ```bash
   # Update the FIREBASE_SERVICE_ACCOUNT variable with new JSON
   ```

3. **Deploy the update** to your backend

4. **Verify the new key works**:
   ```bash
   curl https://your-api.com/api/health
   ```

5. **Revoke old key** in Firebase Console:
   - Go to Project Settings → Service Accounts
   - Find the old key and click the trash icon
   - Confirm deletion

### If Keys Are Compromised

**Act immediately:**

1. **Revoke the compromised key** in Firebase Console
2. **Generate a new key**
3. **Update all deployments** with the new key
4. **Audit Firestore** for unauthorized changes:
   ```bash
   # Check Firebase Console → Firestore → Usage for anomalies
   ```
5. **Review authentication logs** in Firebase Console → Authentication
6. **Notify affected users** if data was accessed

### Rotating Other Secrets

| Secret | How to Rotate |
|--------|---------------|
| Firebase API Key | Firebase Console → Project Settings → General |
| Redis Password | Your Redis provider's dashboard |

---

## Security Checklist

### Pre-Deployment

- [ ] `serviceAccountKey.json` is NOT in the repository
- [ ] `.gitignore` includes sensitive files
- [ ] Environment variables are set (not hardcoded)
- [ ] Firestore rules are deployed (blocking client access)
- [ ] CORS is configured for production domains only
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced

### Post-Deployment

- [ ] Health endpoint responds correctly
- [ ] Authentication flow works
- [ ] Direct Firestore access is blocked (test from browser console)
- [ ] Security headers are present (use [securityheaders.com](https://securityheaders.com))
- [ ] SSL certificate is valid

### Ongoing

- [ ] Monitor error logs for authentication failures
- [ ] Review Firebase usage for anomalies
- [ ] Rotate keys periodically (every 90 days)
- [ ] Keep dependencies updated
- [ ] Run `npm audit` regularly

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to the maintainers
3. Allow reasonable time for a fix before disclosure

---

## Additional Resources

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/security-rules-best-practices)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
