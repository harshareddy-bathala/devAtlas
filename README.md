# DevOrbit 🚀

A personal knowledge and project hub for developers. Track your skills, manage projects, save resources, and visualize your learning journey.

## Features

- 📚 **Skills Tracker** - Track technologies you're learning, want to learn, or have mastered
- 📁 **Project Manager** - Manage your projects with status tracking
- 🔗 **Resource Library** - Save and organize learning resources
- 📊 **Activity Dashboard** - Visualize your progress with charts and heatmaps
- 🔐 **Authentication** - Secure login with Email, Google, or GitHub
- 🌙 **Dark Mode** - Beautiful dark-themed UI

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication

---

## Quick Start (Development)

### Prerequisites

- Node.js 18+
- A Firebase project

### 1. Clone the repository

```bash
git clone https://github.com/harshareddy-bathala/devAtlas.git
cd devAtlas
```

### 2. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Firestore Database** (Start in test mode for development)
4. Enable **Authentication** and add providers:
   - Email/Password
   - Google (optional)
   - GitHub (optional)

### 3. Get Firebase credentials

**For the Client:**
1. In Firebase Console → Project Settings → General
2. Scroll to "Your apps" → Click web icon (`</>`) to add a web app
3. Copy the config values

**For the Server:**
1. In Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `server/serviceAccountKey.json`

### 4. Configure environment variables

**Client** (`client/.env`):
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_API_URL=http://localhost:3001/api
```

**Server** (`server/.env`):
```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### 5. Install dependencies

```bash
# Install all dependencies
npm run install-all
```

### 6. Start development servers

```bash
# Start both client and server
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

---

## Production Deployment

### Deploy Frontend (Vercel)

1. Push code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repo
3. Set root directory to `client`
4. Add environment variables:
   - All `VITE_FIREBASE_*` variables
   - `VITE_API_URL` = your backend URL (e.g., `https://your-api.railway.app/api`)
5. Deploy

### Deploy Backend (Railway)

1. Go to [Railway](https://railway.app) and create new project
2. Connect your GitHub repo
3. Set root directory to `server`
4. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `CORS_ORIGIN=https://your-app.vercel.app`
   - `FIREBASE_SERVICE_ACCOUNT=<paste entire JSON content of serviceAccountKey.json>`
5. Deploy

### Alternative Backend Deployment (Render)

1. Go to [Render](https://render.com)
2. Create new Web Service, connect repo
3. Set root directory to `server`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add same environment variables as Railway

---

## Firestore Security Rules

For production, update your Firestore rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /skills/{skillId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    match /projects/{projectId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    match /resources/{resourceId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    match /activities/{activityId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

---

## Project Structure

```
devorbit/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts (Auth, Theme)
│   │   ├── lib/            # Firebase config
│   │   ├── pages/          # Page components
│   │   └── utils/          # API client, helpers
│   └── package.json
├── server/                 # Express backend
│   ├── index.js            # Server entry point
│   ├── firebase.js         # Firebase Admin SDK
│   ├── firestore.js        # Database operations
│   ├── middleware.js       # Express middleware
│   ├── validation.js       # Request validation
│   ├── errors.js           # Error classes
│   └── package.json
└── package.json            # Root package.json
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/skills` | List all skills |
| POST | `/api/skills` | Create skill |
| PUT | `/api/skills/:id` | Update skill |
| DELETE | `/api/skills/:id` | Delete skill |
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/resources` | List all resources |
| POST | `/api/resources` | Create resource |
| PUT | `/api/resources/:id` | Update resource |
| DELETE | `/api/resources/:id` | Delete resource |
| GET | `/api/activities` | List activities |
| GET | `/api/activities/heatmap` | Get heatmap data |
| GET | `/api/stats` | Get dashboard stats |
| GET | `/api/stats/progress` | Get progress data |

---

## License

MIT
