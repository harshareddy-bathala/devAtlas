# DevOrbit - Developer Skill & Project Tracker

A modern, full-stack application for tracking your development skills, projects, resources, and learning progress.

## Features

- 🎯 **Skill Tracking**: Track your programming skills with progress levels and learning goals
- 📁 **Project Management**: Manage your personal and professional projects
- 📚 **Resource Library**: Save and organize learning resources
- ⏱️ **Time Tracking**: Track time spent on skills and projects
- 🏷️ **Tags System**: Organize everything with a flexible tagging system
- 📊 **Activity Dashboard**: Visualize your coding activity with a heatmap
- 🌓 **Dark/Light Theme**: Toggle between dark and light modes
- ⌨️ **Keyboard Shortcuts**: Navigate quickly with keyboard shortcuts
- 📱 **Responsive Design**: Works great on desktop and mobile

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth (GitHub, Google OAuth)
- **Logging**: Pino
- **Validation**: Zod

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context + Custom Hooks
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### Testing
- **Unit Tests**: Vitest + Testing Library
- **E2E Tests**: Playwright
- **Coverage**: V8

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A Supabase account (free tier works great)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/devorbit.git
   cd devorbit
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client && npm install && cd ..

   # Install server dependencies
   cd server && npm install && cd ..
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings > API to get your project URL and keys
   - Enable GitHub and/or Google OAuth in Authentication > Providers

4. **Configure environment variables**
   ```bash
   # Server
   cp server/.env.sample server/.env
   # Edit server/.env with your Supabase credentials

   # Client
   cp client/.env.sample client/.env
   # Edit client/.env with your Supabase credentials
   ```

5. **Set up the database**
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

6. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev

   # Terminal 2 - Frontend
   cd client && npm run dev
   ```

7. Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
devorbit/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth, Theme)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and API client
│   │   ├── pages/         # Page components
│   │   ├── test/          # Test setup and utils
│   │   └── types/         # TypeScript types
│   ├── e2e/               # Playwright E2E tests
│   └── public/            # Static assets
├── server/                 # Express backend
│   └── src/
│       ├── lib/           # Core utilities (logger, prisma, etc.)
│       ├── middleware/    # Express middleware
│       ├── routes/        # API routes
│       └── schemas/       # Zod validation schemas
├── prisma/                 # Database schema and migrations
└── docs/                   # Documentation
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/skills` | List user's skills |
| POST | `/api/skills` | Create skill |
| PUT | `/api/skills/:id` | Update skill |
| DELETE | `/api/skills/:id` | Delete skill |
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/resources` | List user's resources |
| POST | `/api/resources` | Create resource |
| PUT | `/api/resources/:id` | Update resource |
| DELETE | `/api/resources/:id` | Delete resource |
| GET | `/api/tags` | List user's tags |
| POST | `/api/tags` | Create tag |
| GET | `/api/time-entries` | List time entries |
| POST | `/api/time-entries/start` | Start timer |
| POST | `/api/time-entries/stop` | Stop timer |
| GET | `/api/stats` | Get statistics |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G D` | Go to Dashboard |
| `G S` | Go to Skills |
| `G P` | Go to Projects |
| `G R` | Go to Resources |
| `G T` | Go to Settings |
| `N` | Create new item |
| `/` | Focus search |
| `Alt+S` | Start/Stop timer |
| `?` | Show shortcuts help |
| `Escape` | Close modal |

## Scripts

### Root
```bash
npm run dev          # Start both servers
npm run build        # Build both apps
npm run test         # Run all tests
npm run lint         # Lint all code
```

### Client
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run Vitest tests
npm run test:e2e     # Run Playwright tests
npm run lint         # ESLint
npm run format       # Prettier
```

### Server
```bash
npm run dev          # Start with nodemon
npm run build        # TypeScript compile
npm run start        # Start production server
npm run db:push      # Push schema to database
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set the root directory to `client`
3. Add environment variables
4. Deploy!

### Backend (Railway/Render)
1. Connect your GitHub repository
2. Set the root directory to `server`
3. Add environment variables
4. Set start command: `npm run start`
5. Deploy!

### Database (Supabase)
Your database is already hosted on Supabase. Just make sure:
- Row Level Security (RLS) is enabled
- Policies are set up correctly
- Connection pooling is enabled for production

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Supabase](https://supabase.com) for the awesome backend-as-a-service
- [Tailwind CSS](https://tailwindcss.com) for utility-first CSS
- [Lucide](https://lucide.dev) for beautiful icons
- [Prisma](https://prisma.io) for type-safe database access
