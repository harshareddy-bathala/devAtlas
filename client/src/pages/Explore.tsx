import { Search, Sparkles, BookOpen, Code2 } from 'lucide-react';

export default function Explore() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Explore Courses</h1>
        <p className="text-light-500">Discover new skills and expand your knowledge</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-light-500" />
          <input
            type="text"
            placeholder="Search for courses, technologies, frameworks..."
            className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-md text-white placeholder-light-500 focus:outline-none focus:border-accent-primary transition-colors"
          />
        </div>
      </div>

      {/* Coming Soon Message */}
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-dark-800 border border-dark-600 rounded-md p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent-primary/10 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-accent-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Coming Soon!</h2>
          <p className="text-light-500 mb-6">
            We're building an amazing course catalog for you. Stay tuned!
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-light-500">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              <span>Programming Languages</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Frameworks & Tools</span>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Categories (Placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {['Web Development', 'Mobile Development', 'Backend Development', 'DevOps', 'Data Science', 'AI & Machine Learning'].map((category) => (
          <div
            key={category}
            className="bg-dark-800 border border-dark-600 rounded-md p-6 hover:border-accent-primary transition-colors cursor-pointer"
          >
            <h3 className="text-lg font-semibold text-white mb-2">{category}</h3>
            <p className="text-sm text-light-500">Coming soon</p>
          </div>
        ))}
      </div>
    </div>
  );
}
