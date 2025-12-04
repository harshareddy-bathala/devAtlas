# DevOrbit Deployment Guide 🚀

Deploy DevOrbit to production using:
- **Frontend**: Vercel (free tier)
- **Backend**: DigitalOcean App Platform ($5/month)
- **Database & Auth**: Firebase Firestore & Auth (free tier)

---

## Prerequisites

1. GitHub account with your code pushed
2. Firebase project set up
3. Vercel account: https://vercel.com (free)
4. DigitalOcean account: https://digitalocean.com ($200 free credit for new users)

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│    DigitalOcean      │────▶│    Firebase     │
│   (Frontend)    │     │     (Backend)        │     │  (Auth + DB)    │
│   React + Vite  │     │   Node.js + Express  │     │   Firestore     │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
        │                         │                          │
        └─────────────────────────┴──────────────────────────┘
                          Firebase Auth
```

---

## Step 1: Prepare Firebase (Already Done)

Make sure you have:
- ✅ Firebase project created
- ✅ Firestore database in Native mode
- ✅ Authentication enabled (Email/Password, Google, GitHub)
- ✅ Service account key downloaded (`serviceAccountKey.json`)

### Get Your Firebase Config

1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps" → Web app
3. Copy the config values (you'll need them for Vercel):
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## Step 2: Deploy Backend to DigitalOcean App Platform

### 2.1 Create DigitalOcean Account
1. Go to https://digitalocean.com
2. Sign up (new users get $200 free credit for 60 days)

### 2.2 Create App from GitHub

1. Go to DigitalOcean Dashboard → **Apps** → **Create App**
2. Choose **GitHub** as source
3. Authorize DigitalOcean to access your repository
4. Select your repo: `harshareddy-bathala/devAtlas`
5. Select branch: `main`

### 2.3 Configure the App

**Source Settings:**
| Setting | Value |
|---------|-------|
| Source Directory | `/server` |
| Autodeploy | ✅ Enabled |

**Resources - Click Edit:**
| Setting | Value |
|---------|-------|
| Resource Type | Web Service |
| HTTP Port | `3001` |
| Build Command | `npm install` |
| Run Command | `npm start` |

**Plan:**
- Select **Basic** → **$5/mo** (1 vCPU, 512 MB RAM)
- Or use free trial credits

### 2.4 Add Environment Variables

Click **Edit** on Environment Variables and add:

| Variable | Value | Encrypt |
|----------|-------|---------|
| `NODE_ENV` | `production` | No |
| `PORT` | `3001` | No |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | No |
| `FIREBASE_SERVICE_ACCOUNT` | *(entire JSON content)* | ✅ Yes |

**For FIREBASE_SERVICE_ACCOUNT:**
1. Open your `serviceAccountKey.json` file
2. Copy the ENTIRE contents (all the JSON)
3. Paste as the value
4. Make sure to check "Encrypt" for security

Example (minified):
```json
{"type":"service_account","project_id":"devorbit-xxxxx","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"firebase-adminsdk@devorbit-xxxxx.iam.gserviceaccount.com",...}
```

### 2.5 Configure Health Check

In **Settings** → **Health Checks**:
| Setting | Value |
|---------|-------|
| HTTP Path | `/api/health` |
| Initial Delay | `10` seconds |
| Period | `30` seconds |
| Timeout | `5` seconds |

### 2.6 Deploy

1. Click **Review** → **Create Resources**
2. Wait for deployment (5-10 minutes)
3. Copy your API URL: `https://devorbit-api-xxxxx.ondigitalocean.app`

### 2.7 Test Backend

```bash
curl https://your-api-url.ondigitalocean.app/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-12-04T..."}
```

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub

### 3.2 Import Project

1. Click **Add New...** → **Project**
2. Import your GitHub repo: `devAtlas`
3. Configure:

| Setting | Value |
|---------|-------|
| Framework Preset | `Vite` |
| Root Directory | `client` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 3.3 Add Environment Variables

Add these in the Vercel project settings:

| Key | Value |
|-----|-------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your Firebase app ID |
| `VITE_API_URL` | `https://your-api.ondigitalocean.app/api` |

> ⚠️ Use your actual DigitalOcean URL from Step 2.6

### 3.4 Deploy

1. Click **Deploy**
2. Wait for deployment (2-3 minutes)
3. Your app is live at: `https://your-app.vercel.app`

---

## Step 4: Connect Everything

### 4.1 Update DigitalOcean CORS

Now that you have your Vercel URL, update the backend:

1. DigitalOcean Dashboard → Your App → **Settings** → **App-Level Environment Variables**
2. Update `CORS_ORIGIN` to your actual Vercel URL:
   ```
   https://devorbit.vercel.app
   ```
3. Click **Save** (app will redeploy)

### 4.2 Update Firebase Authorized Domains

1. Firebase Console → **Authentication** → **Settings**
2. Under **Authorized domains**, add:
   - `your-app.vercel.app`
   - `your-api.ondigitalocean.app`

### 4.3 Update GitHub OAuth (if using GitHub login)

1. GitHub → Settings → Developer settings → OAuth Apps
2. Find your DevOrbit OAuth app
3. Update:
   - **Homepage URL**: `https://your-app.vercel.app`
   - **Authorization callback URL**: `https://your-project.firebaseapp.com/__/auth/handler`

---

## Step 5: Verify Deployment

### Test Checklist

- [ ] Frontend loads at your Vercel URL
- [ ] Sign up with email/password works
- [ ] Google Sign-in works
- [ ] GitHub Sign-in works
- [ ] Can create skills, projects, resources
- [ ] Dashboard shows data correctly
- [ ] Activity heatmap updates

### Check Logs

**Vercel Logs:**
- Dashboard → Your Project → Deployments → Click deployment → Logs

**DigitalOcean Logs:**
- Dashboard → Your App → **Runtime Logs**

---

## Firestore Security Rules

Set these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcollections under user
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## Troubleshooting

### "Network Error" or "Failed to fetch"
1. Check CORS_ORIGIN in DigitalOcean matches your Vercel URL exactly
2. Make sure VITE_API_URL in Vercel includes `/api` at the end
3. Check DigitalOcean logs for errors

### Authentication not working
1. Verify all `VITE_FIREBASE_*` variables are correct in Vercel
2. Add your Vercel domain to Firebase Authorized Domains
3. Check browser console for specific errors

### 500 errors from backend
1. Check DigitalOcean Runtime Logs
2. Verify FIREBASE_SERVICE_ACCOUNT JSON is valid
3. Make sure Firestore database is created and in Native mode

### Deployment fails on DigitalOcean
1. Check build logs for npm errors
2. Verify package.json has correct scripts
3. Make sure Node.js version is compatible (v18+)

---

## Cost Summary

| Service | Cost |
|---------|------|
| **Vercel** | Free (hobby tier) |
| **DigitalOcean** | $5/month (or free with credits) |
| **Firebase Firestore** | Free (Spark plan: 50K reads/day) |
| **Firebase Auth** | Free (unlimited users) |
| **Total** | ~$5/month |

> 💡 New DigitalOcean users get $200 free credit for 60 days!

---

## Production Checklist

- [ ] HTTPS enabled (automatic on both platforms)
- [ ] Environment variables set correctly
- [ ] CORS configured properly
- [ ] Firebase security rules deployed
- [ ] OAuth providers configured for production URLs
- [ ] Health check endpoint working
- [ ] Error logging enabled

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Frontend | `https://your-app.vercel.app` |
| Backend API | `https://your-api.ondigitalocean.app/api` |
| Firebase Console | https://console.firebase.google.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| DigitalOcean Dashboard | https://cloud.digitalocean.com |

---

## Alternative: Using Docker on DigitalOcean Droplet

If you prefer a VPS over App Platform:

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Clone repo
git clone https://github.com/harshareddy-bathala/devAtlas.git
cd devAtlas/server

# Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-app.vercel.app
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
EOF

# Build and run with Docker
docker build -t devorbit-api .
docker run -d -p 3001:3001 --env-file .env --name devorbit-api devorbit-api

# Set up nginx reverse proxy with SSL (using certbot)
```

---

🎉 **Congratulations!** Your DevOrbit app is now live in production!
