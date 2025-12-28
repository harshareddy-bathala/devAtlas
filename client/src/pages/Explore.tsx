import { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  Server, 
  Smartphone, 
  Database, 
  Cloud, 
  Brain, 
  Palette,
  Terminal,
  Shield,
  Zap,
  Globe,
  ArrowRight
} from 'lucide-react';

const CATEGORIES = [
  { 
    id: 'web', 
    name: 'Web Development', 
    icon: Globe, 
    color: 'bg-blue-500/10 text-blue-400',
    courses: 24,
    description: 'HTML, CSS, JavaScript, React, Vue, Angular'
  },
  { 
    id: 'mobile', 
    name: 'Mobile Development', 
    icon: Smartphone, 
    color: 'bg-green-500/10 text-green-400',
    courses: 18,
    description: 'iOS, Android, React Native, Flutter'
  },
  { 
    id: 'backend', 
    name: 'Backend Development', 
    icon: Server, 
    color: 'bg-purple-500/10 text-purple-400',
    courses: 21,
    description: 'Node.js, Python, Go, Java, APIs'
  },
  { 
    id: 'database', 
    name: 'Databases', 
    icon: Database, 
    color: 'bg-amber-500/10 text-amber-400',
    courses: 15,
    description: 'SQL, PostgreSQL, MongoDB, Redis'
  },
  { 
    id: 'devops', 
    name: 'DevOps & Cloud', 
    icon: Cloud, 
    color: 'bg-cyan-500/10 text-cyan-400',
    courses: 19,
    description: 'AWS, Docker, Kubernetes, CI/CD'
  },
  { 
    id: 'ai', 
    name: 'AI & Machine Learning', 
    icon: Brain, 
    color: 'bg-pink-500/10 text-pink-400',
    courses: 16,
    description: 'TensorFlow, PyTorch, LLMs, Data Science'
  },
  { 
    id: 'security', 
    name: 'Cybersecurity', 
    icon: Shield, 
    color: 'bg-red-500/10 text-red-400',
    courses: 12,
    description: 'Ethical Hacking, Network Security, Cryptography'
  },
  { 
    id: 'design', 
    name: 'UI/UX Design', 
    icon: Palette, 
    color: 'bg-orange-500/10 text-orange-400',
    courses: 14,
    description: 'Figma, Design Systems, User Research'
  },
];

const FEATURED_PATHS = [
  {
    id: 'fullstack',
    title: 'Full-Stack Developer',
    description: 'Master frontend, backend, and deployment skills',
    duration: '6 months',
    skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
    color: 'from-blue-500 to-purple-500'
  },
  {
    id: 'data-science',
    title: 'Data Scientist',
    description: 'Learn data analysis, ML, and visualization',
    duration: '5 months',
    skills: ['Python', 'TensorFlow', 'SQL', 'Pandas'],
    color: 'from-green-500 to-cyan-500'
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    description: 'Build scalable infrastructure and CI/CD pipelines',
    duration: '4 months',
    skills: ['Docker', 'Kubernetes', 'Terraform', 'Jenkins'],
    color: 'from-orange-500 to-red-500'
  },
];

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-8">
      {/* Coming Soon Banner - Prominent at top */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-2 border-amber-500/50 p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
              <Sparkles className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-400">🚧 Coming Soon!</h2>
              <p className="text-light-400 text-sm mt-1">
                Curated learning paths, interactive courses, and personalized recommendations are on the way!
              </p>
            </div>
          </div>
          <span className="px-4 py-2 bg-amber-500/20 text-amber-400 text-sm font-medium rounded-full border border-amber-500/30">
            In Development
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-primary/20 via-dark-800 to-dark-800 border border-dark-600 p-8 md:p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-accent-primary" />
            <span className="text-sm text-accent-primary font-medium">Coming Soon</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Explore Learning Paths
          </h1>
          <p className="text-light-400 text-lg max-w-2xl mb-8">
            Discover curated courses and roadmaps to accelerate your development journey. 
            Track progress, earn achievements, and level up your skills.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-light-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, technologies, or topics..."
              className="w-full pl-12 pr-4 py-4 bg-dark-900/50 border border-dark-600 rounded-xl text-white placeholder-light-500 focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Featured Learning Paths */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Featured Learning Paths</h2>
            <p className="text-sm text-light-500">Curated roadmaps to guide your learning journey</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_PATHS.map((path) => (
            <div 
              key={path.id}
              className="group relative bg-dark-800 border border-dark-600 rounded-xl overflow-hidden hover:border-accent-primary/50 transition-all cursor-pointer"
            >
              <div className={`h-2 bg-gradient-to-r ${path.color}`} />
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent-primary transition-colors">
                  {path.title}
                </h3>
                <p className="text-sm text-light-500 mb-4">{path.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <Terminal className="w-4 h-4 text-light-500" />
                  <span className="text-xs text-light-500">{path.duration}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {path.skills.map((skill) => (
                    <span key={skill} className="text-xs px-2 py-1 bg-dark-700 text-light-400 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View Path</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Browse by Category</h2>
            <p className="text-sm text-light-500">Find courses in your area of interest</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                className="group bg-dark-800 border border-dark-600 rounded-xl p-5 hover:border-accent-primary/50 transition-all cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-accent-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-light-500 mb-3 line-clamp-2">{category.description}</p>
                <div className="flex items-center gap-2 text-xs text-light-500">
                  <BookOpen className="w-3 h-3" />
                  <span>{category.courses} courses</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-primary/10 flex items-center justify-center">
          <Zap className="w-8 h-8 text-accent-primary" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">More Content Coming Soon</h3>
        <p className="text-light-500 max-w-lg mx-auto">
          We're working hard to bring you curated learning paths, interactive courses, 
          and personalized recommendations. Stay tuned!
        </p>
      </div>
    </div>
  );
}
