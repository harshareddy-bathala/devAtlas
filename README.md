# DevOrbit 🚀

A Personal Knowledge & Project Hub for developers. Track your learning journey, manage projects, and organize resources - all in one minimal, clean interface.

![DevOrbit Screenshot](screenshot.png)

## Features

- **📊 Dashboard** - Overview of your learning activity with an interactive heatmap
- **📚 Stack Tracker** - Kanban-style skill tracking from "Want to Learn" to "Mastered"
- **🚀 Projects** - Manage your projects through idea → active → completed stages
- **🔗 Resources** - Organize learning resources linked to skills and projects

## Tech Stack

### Frontend
- React 18 with Vite
- TailwindCSS for styling
- React Router for navigation
- Recharts for data visualization
- React Hook Form + Zod for form validation
- React Hot Toast for notifications

### Backend
- Node.js + Express
- JSON file-based storage (no database setup required)
- Zod for input validation
- Helmet for security headers
- Rate limiting for API protection

## Getting Started

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/devorbit.git
   cd devorbit
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies (root, client, and server)
   npm install
   ```

3. **Configure environment variables**
   
   Create `.env` files from the examples:
   
   ```bash
   # Server environment
   cp server/.env.example server/.env
   
   # Client environment  
   cp client/.env.example client/.env
   ```

4. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   ```

   Or run them separately:
   ```bash
   # Terminal 1 - Backend (port 3001)
   cd server && npm run dev
   
   # Terminal 2 - Frontend (port 5173)
   cd client && npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:5173](http://localhost:5173)

## Environment Variables

### Server (`server/.env`)
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Client (`client/.env`)
```env
VITE_API_URL=http://localhost:3001/api
```

## Project Structure

```
devorbit/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   └── utils/          # API utilities
│   └── ...
├── server/                 # Express backend
│   ├── index.js            # Main server file
│   ├── database.js         # JSON file storage
│   ├── validation.js       # Zod schemas
│   ├── middleware.js       # Express middleware
│   ├── errors.js           # Custom error classes
│   └── data.json           # Data storage (auto-created)
└── package.json            # Root package.json
```

## API Endpoints

### Skills
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Create a skill
- `PUT /api/skills/:id` - Update a skill
- `DELETE /api/skills/:id` - Delete a skill

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Resources
- `GET /api/resources` - Get all resources
- `POST /api/resources` - Create a resource
- `PUT /api/resources/:id` - Update a resource
- `DELETE /api/resources/:id` - Delete a resource

### Activities & Stats
- `GET /api/activities` - Get all activities
- `POST /api/activities` - Log an activity
- `GET /api/stats` - Get dashboard statistics

### Data Management
- `GET /api/export` - Export all data
- `POST /api/import` - Import data backup

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
# Build the frontend
cd client && npm run build

# The built files will be in client/dist/
```

### Linting
```bash
npm run lint
```

## Security Features

- Input validation with Zod
- Rate limiting (100 requests per 15 minutes)
- CORS whitelist configuration
- Helmet security headers
- Request size limits
- XSS protection

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- UI inspiration from modern developer tools
