import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Github, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

type AuthMode = 'signin' | 'signup';

interface FieldErrors {
  email?: string;
  password?: string;
}

interface TouchedFields {
  email: boolean;
  password: boolean;
}

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return { score, label: 'Weak', color: '#EF4444' };
  if (score <= 4) return { score, label: 'Medium', color: '#F59E0B' };
  return { score, label: 'Strong', color: '#22C55E' };
}

export default function LoginPage() {
  const { signIn, signUp, signInWithGitHub, signInWithGoogle, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Read initial mode from URL query param
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({ email: false, password: false });

  // Password strength for signup
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // Update mode when URL changes
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'signup') {
      setMode('signup');
    } else if (urlMode === 'signin') {
      setMode('signin');
    }
  }, [searchParams]);

  // Clear errors when mode changes
  useEffect(() => {
    setErrors({});
    setTouched({ email: false, password: false });
  }, [mode]);

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (mode === 'signup' && password.length < 8) return 'Password must be at least 8 characters';
    return undefined;
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (field === 'email') {
      const error = validateEmail(email);
      setErrors(prev => ({ ...prev, email: error }));
    } else {
      const error = validatePassword(password);
      setErrors(prev => ({ ...prev, password: error }));
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    setTouched({ email: true, password: true });
    setErrors({ email: emailError, password: passwordError });

    if (emailError || passwordError) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast.success('Welcome back!');
      } else {
        await signUp(email, password, '');
        toast.success('Account created!');
      }
    } catch (error: any) {
      // Handle specific Firebase errors with inline messages
      const errorCode = error.code || '';
      
      if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setErrors(prev => ({ ...prev, password: 'Incorrect password' }));
      } else if (errorCode === 'auth/user-not-found') {
        setErrors(prev => ({ ...prev, email: 'No account found with this email' }));
      } else if (errorCode === 'auth/email-already-in-use') {
        setErrors(prev => ({ ...prev, email: 'An account already exists with this email' }));
      } else if (errorCode === 'auth/invalid-email') {
        setErrors(prev => ({ ...prev, email: 'Invalid email address' }));
      } else if (errorCode === 'auth/weak-password') {
        setErrors(prev => ({ ...prev, password: 'Password is too weak' }));
      } else if (errorCode === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    try {
      if (provider === 'github') {
        await signInWithGitHub();
      } else {
        await signInWithGoogle();
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to sign in with ${provider}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  const showEmailError = touched.email && errors.email;
  const showPasswordError = touched.password && errors.password;

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0B]">
      {/* Header with Logo */}
      <header className="p-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#8B5CF6] flex items-center justify-center text-lg">
            🚀
          </div>
          <span className="font-semibold text-white text-lg">DevOrbit</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Title */}
          <h1 className="text-2xl font-semibold text-white mb-8">
            {mode === 'signin' ? 'Sign In to DevOrbit' : 'Create an account'}
          </h1>

          {/* OAuth Buttons - Horizontal Layout */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleOAuth('github')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-[#333] hover:border-[#555] rounded text-white transition-colors"
            >
              <Github className="w-5 h-5" />
              <span className="text-sm">GitHub</span>
            </button>
            <button
              onClick={() => handleOAuth('google')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-[#333] hover:border-[#555] rounded text-white transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm">Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#333]"></div>
            <span className="text-sm text-[#888]">or</span>
            <div className="flex-1 h-px bg-[#333]"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                onBlur={() => handleBlur('email')}
                placeholder="your@email.com"
                className={`w-full px-4 py-3 bg-transparent border rounded text-white placeholder-[#666] focus:outline-none transition-colors ${
                  showEmailError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-[#333] focus:border-[#8B5CF6]'
                }`}
                disabled={isSubmitting}
              />
              {showEmailError && (
                <p className="text-red-500 text-xs mt-2">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  onBlur={() => handleBlur('password')}
                  placeholder={mode === 'signup' ? 'Min. 8 characters' : 'Enter your password'}
                  className={`w-full px-4 py-3 pr-12 bg-transparent border rounded text-white placeholder-[#666] focus:outline-none transition-colors ${
                    showPasswordError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[#333] focus:border-[#8B5CF6]'
                  }`}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#888]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {showPasswordError && (
                <p className="text-red-500 text-xs mt-2">{errors.password}</p>
              )}
              
              {/* Password Strength Indicator - Only for signup */}
              {mode === 'signup' && password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#888]">Password strength</span>
                    <span className="text-xs font-medium" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: i <= passwordStrength.score ? passwordStrength.color : '#333'
                        }}
                      />
                    ))}
                  </div>
                  <ul className="mt-2 space-y-1">
                    <li className="flex items-center gap-2 text-xs">
                      {password.length >= 8 ? (
                        <Check className="w-3 h-3 text-[#22C55E]" />
                      ) : (
                        <X className="w-3 h-3 text-[#666]" />
                      )}
                      <span className={password.length >= 8 ? 'text-[#888]' : 'text-[#666]'}>
                        At least 8 characters
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      {/[A-Z]/.test(password) && /[a-z]/.test(password) ? (
                        <Check className="w-3 h-3 text-[#22C55E]" />
                      ) : (
                        <X className="w-3 h-3 text-[#666]" />
                      )}
                      <span className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-[#888]' : 'text-[#666]'}>
                        Upper and lowercase letters
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      {/[0-9]/.test(password) ? (
                        <Check className="w-3 h-3 text-[#22C55E]" />
                      ) : (
                        <X className="w-3 h-3 text-[#666]" />
                      )}
                      <span className={/[0-9]/.test(password) ? 'text-[#888]' : 'text-[#666]'}>
                        At least one number
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Terms notice for signup */}
            {mode === 'signup' && (
              <p className="text-sm text-[#888]">
                By signing up you agree to our{' '}
                <Link to="/terms" className="text-[#8B5CF6] hover:underline">
                  terms of service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-[#8B5CF6] hover:underline">
                  privacy policy
                </Link>.
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create Account'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-3 text-sm">
            <p className="text-[#888]">
              {mode === 'signin' ? (
                <>
                  Need an account?{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="text-[#8B5CF6] hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => setMode('signin')}
                    className="text-[#8B5CF6] hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
            {mode === 'signin' && (
              <p className="text-[#888]">
                Forgot your password?{' '}
                <Link to="/forgot-password" className="text-[#8B5CF6] hover:underline">
                  Reset it
                </Link>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
