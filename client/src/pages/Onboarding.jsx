import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, Loader2, User, AtSign, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { signOut } from '../lib/firebase';

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'profile', title: 'Profile Setup' },
  { id: 'complete', title: 'Ready!' }
];

const PURPOSE_OPTIONS = [
  { value: 'track_learning', label: 'Track my learning journey', icon: '📚' },
  { value: 'manage_projects', label: 'Manage my projects', icon: '🚀' },
  { value: 'both', label: 'Both learning & projects', icon: '⚡' },
  { value: 'exploring', label: 'Just exploring', icon: '🔍' }
];

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshOnboardingStatus } = useOnboarding();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    purpose: ''
  });
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, reason: null });
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({ displayName: false, username: false });

  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({ ...prev, displayName: user.name }));
    }
  }, [user]);

  // Handle browser back button/gesture - sign out and go to signup
  useEffect(() => {
    const handlePopState = async (e) => {
      e.preventDefault();
      // Sign out the user
      try {
        await signOut();
      } catch (error) {
        console.error('Failed to sign out:', error);
      }
      // Navigate to signup page
      navigate('/login?mode=signup', { replace: true });
    };

    // Push a state so we can catch the back button
    window.history.pushState({ onboarding: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  // Debounced username check
  const checkUsername = useCallback(async (username) => {
    if (!username || username.length < 3) {
      setUsernameStatus({ checking: false, available: null, reason: null });
      return;
    }

    setUsernameStatus({ checking: true, available: null, reason: null });
    
    try {
      const result = await api.checkUsername(username);
      setUsernameStatus({
        checking: false,
        available: result.available,
        reason: result.reason
      });
    } catch (error) {
      setUsernameStatus({ checking: false, available: null, reason: 'Error checking' });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username) {
        checkUsername(formData.username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username, checkUsername]);

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setFormData({ ...formData, username: value });
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.displayName.trim().length >= 1 && 
             formData.username.length >= 3 && 
             usernameStatus.available === true;
    }
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await api.updateProfile(formData);
      // Refresh onboarding status so ProtectedRoute knows we're done
      await refreshOnboardingStatus();
      toast.success('Welcome to DevOrbit!');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col">
      {/* Header with Logo */}
      <header className="p-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#8B5CF6] flex items-center justify-center text-lg">
            🚀
          </div>
          <span className="font-semibold text-white text-lg">DevOrbit</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition-colors ${
                  i < step ? 'bg-[#8B5CF6] text-white' :
                  i === step ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]' :
                  'bg-[#1A1A1D] text-[#666] border border-[#333]'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-1 ${i < step ? 'bg-[#8B5CF6]' : 'bg-[#333]'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-[#8B5CF6] rounded flex items-center justify-center mx-auto mb-6 text-3xl">
                  🚀
                </div>
                <h1 className="text-2xl font-semibold text-white mb-2">Welcome to DevOrbit</h1>
                <p className="text-[#888] mb-8">
                  Your personal space to track skills, manage projects, and grow as a developer.
                </p>
                
                <div className="space-y-3 text-left mb-8">
                  <div className="flex items-center gap-3 p-4 bg-[#1A1A1D] border border-[#333] rounded">
                    <span className="text-xl">📚</span>
                    <div>
                      <p className="text-sm font-medium text-white">Track Your Skills</p>
                      <p className="text-xs text-[#666]">From learning to mastery</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#1A1A1D] border border-[#333] rounded">
                    <span className="text-xl">🚀</span>
                    <div>
                      <p className="text-sm font-medium text-white">Manage Projects</p>
                      <p className="text-xs text-[#666]">Ideas to deployment</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#1A1A1D] border border-[#333] rounded">
                    <span className="text-xl">📊</span>
                    <div>
                      <p className="text-sm font-medium text-white">Visualize Progress</p>
                      <p className="text-xs text-[#666]">See your growth over time</p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleNext}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 1: Profile Setup */}
            {step === 1 && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-xl font-semibold text-white mb-1">Set Up Your Profile</h2>
                <p className="text-[#888] text-sm mb-6">Tell us a bit about yourself</p>

                <div className="space-y-5">
                  {/* Display Name */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                      <User className="w-4 h-4 text-[#888]" />
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      onBlur={() => setTouched(prev => ({ ...prev, displayName: true }))}
                      className={`w-full px-4 py-3 bg-transparent border rounded text-white placeholder-[#666] focus:outline-none transition-colors ${
                        touched.displayName && !formData.displayName.trim()
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-[#333] focus:border-[#8B5CF6]'
                      }`}
                      placeholder="Your name"
                      maxLength={50}
                    />
                    {touched.displayName && !formData.displayName.trim() && (
                      <p className="text-red-500 text-xs mt-2">Display name is required</p>
                    )}
                  </div>

                  {/* Username */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                      <AtSign className="w-4 h-4 text-[#888]" />
                      Username <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.username}
                        onChange={handleUsernameChange}
                        onBlur={() => setTouched(prev => ({ ...prev, username: true }))}
                        className={`w-full px-4 py-3 pr-12 bg-transparent border rounded text-white placeholder-[#666] focus:outline-none transition-colors ${
                          usernameStatus.available === true ? 'border-[#22C55E] focus:border-[#22C55E]' :
                          usernameStatus.available === false || (touched.username && formData.username.length < 3) ? 'border-red-500 focus:border-red-500' : 
                          'border-[#333] focus:border-[#8B5CF6]'
                        }`}
                        placeholder="choose_username"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {usernameStatus.checking && (
                          <Loader2 className="w-4 h-4 animate-spin text-[#666]" />
                        )}
                        {usernameStatus.available === true && (
                          <Check className="w-4 h-4 text-[#22C55E]" />
                        )}
                        {usernameStatus.available === false && (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {usernameStatus.reason && (
                      <p className={`text-xs mt-2 ${usernameStatus.available ? 'text-[#22C55E]' : 'text-red-500'}`}>
                        {usernameStatus.reason}
                      </p>
                    )}
                    {touched.username && formData.username.length > 0 && formData.username.length < 3 && !usernameStatus.reason && (
                      <p className="text-red-500 text-xs mt-2">
                        Username must be at least 3 characters
                      </p>
                    )}
                    {touched.username && formData.username.length === 0 && (
                      <p className="text-red-500 text-xs mt-2">
                        Username is required
                      </p>
                    )}
                    <p className="text-xs text-[#666] mt-1">
                      3-20 characters, lowercase letters, numbers, underscores
                    </p>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                      <Target className="w-4 h-4 text-[#888]" />
                      Why are you here?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PURPOSE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, purpose: opt.value })}
                          className={`p-3 rounded text-left transition-colors ${
                            formData.purpose === opt.value
                              ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]'
                              : 'bg-[#1A1A1D] hover:bg-[#232326] border border-[#333]'
                          }`}
                        >
                          <span className="text-lg">{opt.icon}</span>
                          <p className="text-xs mt-1 text-white">{opt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 mt-6 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Step 2: Complete */}
            {step === 2 && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-[#22C55E]/20 rounded flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-[#22C55E]" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">You're All Set!</h2>
                <p className="text-[#888] mb-6">
                  Welcome aboard, <span className="text-[#8B5CF6]">@{formData.username}</span>! 
                  Your developer journey starts now.
                </p>

                <div className="p-4 bg-[#1A1A1D] border border-[#333] rounded mb-6 text-left">
                  <h3 className="text-sm font-medium text-white mb-3">Quick Tips:</h3>
                  <ul className="space-y-2 text-sm text-[#888]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#8B5CF6]">→</span>
                      Add your first skill in Stack Tracker
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#8B5CF6]">→</span>
                      Create a project to link with skills
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#8B5CF6]">→</span>
                      Check the dashboard for progress
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
