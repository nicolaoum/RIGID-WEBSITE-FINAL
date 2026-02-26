import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { redeemInviteCode, verifyEmail } from '../lib/api';

export default function JoinPage() {
  const router = useRouter();

  const [step, setStep] = useState<'code' | 'details' | 'verify' | 'success'>('code');
  const [code, setCode] = useState('');

  // Pre-fill code from URL query param once router is ready
  useEffect(() => {
    if (router.isReady && router.query.code && !code) {
      setCode(router.query.code as string);
    }
  }, [router.isReady, router.query.code]);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter your invite code');
      return;
    }
    setError('');
    setStep('details');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const result = await redeemInviteCode({
        code: code.toUpperCase().trim(),
        email: formData.email.toLowerCase().trim(),
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        password: formData.password,
      });
      setSuccessData(result);
      if (result.requiresVerification) {
        setStep('verify');
      } else {
        setStep('success');
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please try again.';
      // Extract the actual error message from the API response
      try {
        const parsed = JSON.parse(msg.replace('API Error: ', '').replace(/^\d+ - /, ''));
        setError(parsed.message || msg);
      } catch {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verificationCode.trim() || verificationCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setSubmitting(true);
    try {
      await verifyEmail({
        email: formData.email.toLowerCase().trim(),
        verificationCode: verificationCode.trim(),
      });
      setStep('success');
    } catch (err: any) {
      const msg = err.message || 'Verification failed. Please try again.';
      try {
        const parsed = JSON.parse(msg.replace('API Error: ', '').replace(/^\d+ - /, ''));
        setError(parsed.message || msg);
      } catch {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              Rigid Residential
            </Link>
            <div className="hidden md:flex space-x-1">
              <Link href="/" className="text-gray-700 hover:text-gray-900 px-3 py-2">Home</Link>
              <Link href="/buildings" className="text-gray-700 hover:text-gray-900 px-3 py-2">Buildings</Link>
              <Link href="/contact" className="text-gray-700 hover:text-gray-900 px-3 py-2">Contact</Link>
            </div>
            <a href="/api/login" className="text-gray-700 hover:text-gray-900 font-semibold">
              Login
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          {/* Step 1: Code */}
          <div className={`flex items-center ${step === 'code' ? 'text-gray-900' : 'text-green-600'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === 'code' ? 'bg-gray-900 text-white' : 'bg-green-600 text-white'
            }`}>
              {step !== 'code' ? '✓' : '1'}
            </span>
            <span className="ml-1 font-medium text-xs sm:text-sm">Code</span>
          </div>
          <div className={`w-6 sm:w-10 h-0.5 mx-1 sm:mx-2 ${step !== 'code' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
          {/* Step 2: Details */}
          <div className={`flex items-center ${step === 'details' ? 'text-gray-900' : (step === 'verify' || step === 'success') ? 'text-green-600' : 'text-gray-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === 'details' ? 'bg-gray-900 text-white' : (step === 'verify' || step === 'success') ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {(step === 'verify' || step === 'success') ? '✓' : '2'}
            </span>
            <span className="ml-1 font-medium text-xs sm:text-sm">Details</span>
          </div>
          <div className={`w-6 sm:w-10 h-0.5 mx-1 sm:mx-2 ${(step === 'verify' || step === 'success') ? 'bg-green-600' : 'bg-gray-300'}`}></div>
          {/* Step 3: Verify */}
          <div className={`flex items-center ${step === 'verify' ? 'text-gray-900' : step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === 'verify' ? 'bg-gray-900 text-white' : step === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step === 'success' ? '✓' : '3'}
            </span>
            <span className="ml-1 font-medium text-xs sm:text-sm">Verify</span>
          </div>
          <div className={`w-6 sm:w-10 h-0.5 mx-1 sm:mx-2 ${step === 'success' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
          {/* Step 4: Done */}
          <div className={`flex items-center ${step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step === 'success' ? '✓' : '4'}
            </span>
            <span className="ml-1 font-medium text-xs sm:text-sm">Done</span>
          </div>
        </div>

        {/* Step 1: Enter Code */}
        {step === 'code' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-gray-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Your Building</h1>
              <p className="text-gray-600">Enter the invite code provided by your property manager</p>
            </div>

            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Invite Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-2xl font-mono tracking-[0.3em] text-gray-900 placeholder-gray-300 focus:border-gray-900 focus:ring-0 transition-colors uppercase"
                  placeholder="XXXX-XXX-XXXX"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-4 rounded-xl hover:bg-gray-800 transition font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                Continue →
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Don't have an invite code? Contact your property manager.</p>
              <p className="mt-2">
                Already have an account?{' '}
                <a href="/api/login" className="text-gray-900 font-semibold hover:text-gray-700">
                  Log in here
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Enter Details */}
        {step === 'details' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-gray-100">
            <div className="mb-6">
              <button
                onClick={() => { setStep('code'); setError(''); }}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center"
              >
                ← Back to code
              </button>
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-mono text-lg tracking-wider mb-4">
                🔑 {code}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
              <p className="text-gray-600">Fill in your details to complete registration</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:ring-0 transition-colors"
                  placeholder="John Smith"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:ring-0 transition-colors"
                  placeholder="john@example.com"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:ring-0 transition-colors"
                  placeholder="+357 99 123456"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:ring-0 transition-colors"
                  placeholder="Min. 8 characters"
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500 mt-1">Must include uppercase, lowercase, numbers, and symbols</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:ring-0 transition-colors"
                  placeholder="Repeat your password"
                  disabled={submitting}
                />
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gray-900 text-white py-4 rounded-xl hover:bg-gray-800 transition font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  'Create Account & Join'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Verify Email */}
        {step === 'verify' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-gray-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
              <p className="text-gray-600">
                We sent a 6-digit code to <strong className="text-gray-900">{formData.email}</strong>
              </p>
              <p className="text-gray-500 text-sm mt-1">Check your inbox (and spam folder)</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Verification Code</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(val);
                    setError('');
                  }}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl font-mono tracking-[0.5em] text-gray-900 placeholder-gray-300 focus:border-blue-500 focus:ring-0 transition-colors"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  disabled={submitting}
                />
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || verificationCode.length !== 6}
                className="w-full bg-gray-900 text-white py-4 rounded-xl hover:bg-gray-800 transition font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify Email ✓'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Didn't receive the code? Check your spam folder or contact your property manager.
            </p>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 border border-gray-100 text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome Home! 🎉</h2>
            <p className="text-lg text-gray-600 mb-6">
              Your account has been created and you've been assigned to your unit.
            </p>

            {successData && (
              <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Your Details:</h3>
                <div className="space-y-2 text-gray-700">
                  {successData.buildingName && (
                    <p>🏢 <span className="font-medium">Building:</span> {successData.buildingName}</p>
                  )}
                  {successData.unitNumber && (
                    <p>🚪 <span className="font-medium">Unit:</span> {successData.unitNumber}</p>
                  )}
                  <p>📧 <span className="font-medium">Email:</span> {successData.email}</p>
                </div>
              </div>
            )}

            <a
              href="/api/login"
              className="inline-flex items-center justify-center bg-gray-900 text-white px-10 py-4 rounded-xl hover:bg-gray-800 transition-all font-semibold text-lg shadow-lg hover:shadow-xl group w-full"
            >
              Log In to Your Portal
              <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        )}

        {/* Info box */}
        {step !== 'success' && (
          <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-blue-900 mb-3">How it works</h3>
            <ul className="space-y-2">
              {[
                'Your property manager generates a unique code for your unit',
                'Enter the code above and fill in your details',
                'Your account is created instantly — no waiting for approval!',
                'Log in and access the resident portal immediately',
              ].map((step, index) => (
                <li key={index} className="flex items-start text-blue-900">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-blue-800 text-sm">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
