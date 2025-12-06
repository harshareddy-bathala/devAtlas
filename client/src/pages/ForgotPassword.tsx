import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendResetEmail } from '../lib/firebase';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await sendResetEmail(email);
      setIsSent(true);
    } catch (err: any) {
      // Handle Firebase errors
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later');
      } else {
        setError(err.message || 'Failed to send reset email');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const showError = touched && error;
  const showEmailError = touched && !email;

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
          {/* Back Link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-[#888] hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to sign in</span>
          </Link>

          {isSent ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 bg-[#22C55E]/20 rounded flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-[#22C55E]" />
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">Check your email</h1>
              <p className="text-[#888] mb-6">
                We've sent a password reset link to{' '}
                <span className="text-white">{email}</span>
              </p>
              <p className="text-sm text-[#666] mb-8">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => {
                    setIsSent(false);
                    setTouched(false);
                  }}
                  className="text-[#8B5CF6] hover:underline"
                >
                  try again
                </button>
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors"
              >
                Return to sign in
              </Link>
            </div>
          ) : (
            // Form State
            <>
              <h1 className="text-2xl font-semibold text-white mb-2">Reset your password</h1>
              <p className="text-[#888] mb-8">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      onBlur={() => setTouched(true)}
                      placeholder="your@email.com"
                      className={`w-full px-4 py-3 bg-transparent border rounded text-white placeholder-[#666] focus:outline-none transition-colors ${
                        showEmailError || showError
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-[#333] focus:border-[#8B5CF6]'
                      }`}
                      disabled={isSubmitting}
                    />
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                  </div>
                  {(showEmailError || showError) && (
                    <p className="text-red-500 text-xs mt-2">
                      {error || 'Email is required'}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send reset link
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
