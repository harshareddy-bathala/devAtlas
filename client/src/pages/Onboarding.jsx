import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Orbit, ArrowRight, Check, X, Loader2, User, AtSign, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';

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

  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({ ...prev, displayName: user.name }));
    }
  }, [user]);

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
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < step ? 'bg-primary-500 text-white' :
                i === step ? 'bg-primary-500/20 text-primary-400 border border-primary-500' :
                'bg-dark-700 text-gray-500'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 ${i < step ? 'bg-primary-500' : 'bg-dark-600'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="glass-card p-6">
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
                <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Orbit className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Welcome to DevOrbit</h1>
                <p className="text-gray-400 mb-6">
                  Your personal space to track skills, manage projects, and grow as a developer.
                </p>
                <div className="space-y-3 text-left mb-8">
                  <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                    <span className="text-xl">📚</span>
                    <div>
                      <p className="text-sm font-medium">Track Your Skills</p>
                      <p className="text-xs text-gray-500">From learning to mastery</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                    <span className="text-xl">🚀</span>
                    <div>
                      <p className="text-sm font-medium">Manage Projects</p>
                      <p className="text-xs text-gray-500">Ideas to deployment</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                    <span className="text-xl">📊</span>
                    <div>
                      <p className="text-sm font-medium">Visualize Progress</p>
                      <p className="text-xs text-gray-500">See your growth over time</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full btn-primary flex items-center justify-center gap-2"
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
                <h2 className="text-xl font-bold mb-1">Set Up Your Profile</h2>
                <p className="text-gray-400 text-sm mb-6">Tell us a bit about yourself</p>

                <div className="space-y-4">
                  {/* Display Name */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                      <User className="w-4 h-4" />
                      Display Name <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="input-field"
                      placeholder="Your name"
                      maxLength={50}
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                      <AtSign className="w-4 h-4" />
                      Username <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.username}
                        onChange={handleUsernameChange}
                        className={`input-field pr-10 ${
                          usernameStatus.available === true ? 'border-success/50' :
                          usernameStatus.available === false ? 'border-error/50' : ''
                        }`}
                        placeholder="choose_username"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameStatus.checking && (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        )}
                        {usernameStatus.available === true && (
                          <Check className="w-4 h-4 text-success" />
                        )}
                        {usernameStatus.available === false && (
                          <X className="w-4 h-4 text-error" />
                        )}
                      </div>
                    </div>
                    {usernameStatus.reason && (
                      <p className={`text-xs mt-1 ${usernameStatus.available ? 'text-success' : 'text-error'}`}>
                        {usernameStatus.reason}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      3-20 characters, lowercase letters, numbers, underscores
                    </p>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                      <Target className="w-4 h-4" />
                      Why are you here?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PURPOSE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, purpose: opt.value })}
                          className={`p-3 rounded-lg text-left transition-colors ${
                            formData.purpose === opt.value
                              ? 'bg-primary-500/20 border border-primary-500/50'
                              : 'bg-dark-700/50 hover:bg-dark-600/50 border border-transparent'
                          }`}
                        >
                          <span className="text-lg">{opt.icon}</span>
                          <p className="text-xs mt-1">{opt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="w-full btn-primary flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-xl font-bold mb-2">You're All Set!</h2>
                <p className="text-gray-400 mb-6">
                  Welcome aboard, <span className="text-primary-400">@{formData.username}</span>! 
                  Your developer journey starts now.
                </p>

                <div className="p-4 bg-dark-700/50 rounded-lg mb-6 text-left">
                  <h3 className="text-sm font-medium mb-2">Quick Tips:</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-primary-400">→</span>
                      Add your first skill in Stack Tracker
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-400">→</span>
                      Create a project to link with skills
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary-400">→</span>
                      Check the dashboard for progress
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="w-full btn-primary flex items-center justify-center gap-2"
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
