import { Link } from 'react-router-dom';
import { 
  Code2, 
  FolderKanban, 
  BarChart3, 
  ArrowRight, 
  CheckCircle2,
  Zap,
  Target,
  Layers
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-sm border-b border-dark-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-accent-primary flex items-center justify-center text-lg">
                🚀
              </div>
              <span className="font-bold text-xl">DevOrbit</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="text-sm font-medium text-light-500 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link 
                to="/login?mode=signup" 
                className="px-4 py-2 bg-accent-primary text-white text-sm font-medium rounded hover:bg-accent-primary-hover transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-primary/10 border border-accent-primary/20 rounded-full text-sm text-accent-primary mb-8">
            <Zap className="w-4 h-4" />
            <span>Built for developers, by developers</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Your Developer
            <br />
            <span className="text-accent-primary">Knowledge Hub</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-light-500 max-w-2xl mx-auto mb-10">
            Track skills, manage projects, visualize progress—all in one place. 
            The simplest way to organize your development journey.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/login?mode=signup" 
              className="w-full sm:w-auto px-8 py-3 bg-accent-primary text-white font-medium rounded hover:bg-accent-primary-hover transition-colors flex items-center justify-center gap-2"
            >
              Start Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-8 py-3 bg-transparent text-white font-medium rounded border border-dark-500 hover:bg-dark-700 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-dark-600">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to grow</h2>
            <p className="text-light-500 max-w-xl mx-auto">
              Simple, powerful tools to track your learning journey and build your portfolio.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stack Tracker */}
            <div className="bg-dark-800 border border-dark-600 rounded p-6 hover:border-dark-500 transition-colors">
              <div className="w-12 h-12 bg-accent-primary/10 rounded flex items-center justify-center mb-5">
                <Code2 className="w-6 h-6 text-accent-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Stack Tracker</h3>
              <p className="text-light-500 leading-relaxed">
                Track your technology stack from "want to learn" to "mastered". Visualize your skills 
                with an intuitive Kanban board.
              </p>
            </div>

            {/* Project Manager */}
            <div className="bg-dark-800 border border-dark-600 rounded p-6 hover:border-dark-500 transition-colors">
              <div className="w-12 h-12 bg-accent-green/10 rounded flex items-center justify-center mb-5">
                <FolderKanban className="w-6 h-6 text-accent-green" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Project Manager</h3>
              <p className="text-light-500 leading-relaxed">
                Manage projects from idea to completion. Link GitHub repos, track tech stacks, 
                and showcase your portfolio.
              </p>
            </div>

            {/* Analytics Dashboard */}
            <div className="bg-dark-800 border border-dark-600 rounded p-6 hover:border-dark-500 transition-colors">
              <div className="w-12 h-12 bg-accent-blue/10 rounded flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6 text-accent-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Analytics Dashboard</h3>
              <p className="text-light-500 leading-relaxed">
                Visualize your progress with beautiful charts and a GitHub-style activity heatmap. 
                Track your consistency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-850 border-t border-dark-600">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-light-500 max-w-xl mx-auto">
              Get started in minutes. No complex setup required.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-accent-primary rounded flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div className="flex-1 h-px bg-dark-600 hidden md:block" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Track your learning</h3>
              <p className="text-light-500">
                Add skills to your stack and move them through stages as you progress.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-accent-primary rounded flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div className="flex-1 h-px bg-dark-600 hidden md:block" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Build projects</h3>
              <p className="text-light-500">
                Document your projects, link repositories, and track your builds.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-accent-primary rounded flex items-center justify-center font-bold text-lg">
                  3
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Visualize growth</h3>
              <p className="text-light-500">
                See your progress with beautiful analytics and activity tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-dark-600">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-accent-primary/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-accent-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Skill Mastery Tracking</h4>
                  <p className="text-light-500 text-sm">
                    Link skills to completed projects to prove mastery with real work.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-accent-primary/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Layers className="w-4 h-4 text-accent-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Resource Library</h4>
                  <p className="text-light-500 text-sm">
                    Save articles, videos, and docs. Organize with tags for easy access.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-accent-primary/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Activity Heatmap</h4>
                  <p className="text-light-500 text-sm">
                    GitHub-style contribution graph to track your daily consistency.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-accent-primary/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">GitHub Integration</h4>
                  <p className="text-light-500 text-sm">
                    Link your repositories and showcase your real work.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-accent-primary/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Activity Tracking</h4>
                  <p className="text-light-500 text-sm">
                    Track your coding sessions with visual heatmaps.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-accent-primary/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Focus Timer</h4>
                  <p className="text-light-500 text-sm">
                    Built-in Pomodoro timer to boost your productivity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-850 border-t border-dark-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to organize your dev journey?
          </h2>
          <p className="text-light-500 mb-8">
            Join developers who are tracking their skills, building projects, and growing their careers.
          </p>
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 px-8 py-3 bg-accent-primary text-white font-medium rounded hover:bg-accent-primary-hover transition-colors"
          >
            Get Started for Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-dark-600">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent-primary flex items-center justify-center text-sm">
              🚀
            </div>
            <span className="font-semibold">DevOrbit</span>
          </div>
          <p className="text-sm text-light-500">
            © {new Date().getFullYear()} DevOrbit. Built for developers.
          </p>
        </div>
      </footer>
    </div>
  );
}
