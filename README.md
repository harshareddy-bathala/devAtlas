<div align="center">

# DevOrbit

### A Developer's Personal Knowledge Hub

Track skills, manage projects, save resources, and visualize your development journey.

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![CI/CD](https://github.com/harshareddy-bathala/devAtlas/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/harshareddy-bathala/devAtlas/actions/workflows/ci-cd.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Features](#features) · [Tech Stack](#tech-stack) · [Quick Start](#quick-start) · [Deployment](#deployment) · [API Reference](#api-reference)

</div>

---

## Features

| Feature | Description |
|---------|-------------|
| <img src="https://api.iconify.design/lucide:layers.svg" width="16" height="16" /> **Stack Tracker** | Track technologies across learning stages with Kanban-style boards |
| <img src="https://api.iconify.design/lucide:folder-kanban.svg" width="16" height="16" /> **Project Manager** | Manage projects from idea to completion with GitHub integration |
| <img src="https://api.iconify.design/lucide:book-open.svg" width="16" height="16" /> **Resource Library** | Organize articles, tutorials, and documentation with tags |
| <img src="https://api.iconify.design/lucide:layout-dashboard.svg" width="16" height="16" /> **Analytics Dashboard** | Visualize progress with charts and GitHub-style activity heatmaps |
| <img src="https://api.iconify.design/lucide:shield-check.svg" width="16" height="16" /> **Secure Authentication** | Sign in with Email, Google, or GitHub |
| <img src="https://api.iconify.design/lucide:link.svg" width="16" height="16" /> **Skill-Project Linking** | Connect skills to projects for context-aware tracking |

---

## Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context API
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Animations:** Framer Motion

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Validation:** Zod
- **Security:** Helmet, CORS, Rate Limiting

### Infrastructure
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth (Email, Google, GitHub)
- **Frontend Hosting:** Vercel
- **Backend Hosting:** DigitalOcean App Platform

---

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Firebase project

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/harshareddy-bathala/devAtlas.git
cd devAtlas
```

2. **Set up Firebase**

   - Create a project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database (Native mode)
   - Enable Authentication with Email/Password, Google, and GitHub providers
   - Generate a service account key for the server

3. **Configure environment variables**

   **Client** (`client/.env`):
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_API_URL=http://localhost:3001/api
   ```

   **Server** (`server/.env`):
   ```env
   NODE_ENV=development
   PORT=3001
   CORS_ORIGIN=http://localhost:5173
   ```

   Place your Firebase service account JSON as `server/serviceAccountKey.json`

4. **Install dependencies**

```bash
npm run install-all
```

5. **Start development servers**

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |

---

## Deployment

### Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│    DigitalOcean      │────▶│    Firebase     │
│   (Frontend)    │     │     (Backend)        │     │  (Auth + DB)    │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
```

### Frontend (Vercel)

1. Import repository at [vercel.com](https://vercel.com)
2. Set root directory to `client`
3. Configure environment variables:
   - All `VITE_FIREBASE_*` variables
   - `VITE_API_URL` pointing to your backend

### Backend (DigitalOcean App Platform)

1. Create new app at [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Connect GitHub repository
3. Set source directory to `/server`
4. Configure environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `CORS_ORIGIN=https://your-app.vercel.app`
   - `FIREBASE_SERVICE_ACCOUNT` (JSON content)

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Project Structure

```
devAtlas/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── contexts/           # React Context providers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Firebase configuration
│   │   ├── pages/              # Page components
│   │   ├── types/              # TypeScript type definitions
│   │   └── utils/              # API client and utilities
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Express backend API
│   ├── index.js                # Application entry point
│   ├── firebase.js             # Firebase Admin SDK setup
│   ├── firestore.js            # Database operations
│   ├── middleware.js           # Express middleware
│   ├── validation.js           # Zod schemas
│   ├── errors.js               # Custom error classes
│   ├── Dockerfile              # Container configuration
│   └── package.json
│
├── DEPLOYMENT.md               # Deployment guide
└── package.json                # Root package configuration
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/me` | Get current user |
| `DELETE` | `/api/auth/account` | Delete user account |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profile` | Get user profile |
| `PUT` | `/api/profile` | Update user profile |
| `GET` | `/api/profile/check-username/:username` | Check username availability |

### Skills

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/skills` | List all skills |
| `POST` | `/api/skills` | Create a new skill |
| `PUT` | `/api/skills/:id` | Update a skill |
| `DELETE` | `/api/skills/:id` | Delete a skill |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a new project |
| `PUT` | `/api/projects/:id` | Update a project |
| `DELETE` | `/api/projects/:id` | Delete a project |

### Resources

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/resources` | List all resources |
| `POST` | `/api/resources` | Create a new resource |
| `PUT` | `/api/resources/:id` | Update a resource |
| `DELETE` | `/api/resources/:id` | Delete a resource |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Get dashboard statistics |
| `GET` | `/api/stats/progress` | Get progress data |
| `GET` | `/api/activities` | List activities |
| `GET` | `/api/activities/heatmap` | Get activity heatmap data |

### Data Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/export` | Export all user data |
| `POST` | `/api/import` | Import user data |
| `DELETE` | `/api/data` | Clear all user data |

---

## Security

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Backend Security

- JWT token verification via Firebase Admin SDK
- Rate limiting on all API endpoints
- Helmet.js for HTTP security headers
- CORS configured for production domains only

---

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built by [Harsha Reddy](https://github.com/harshareddy-bathala)

</div>
