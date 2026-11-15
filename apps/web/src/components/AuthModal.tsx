import React, { useState } from 'react';
import { X, Mail, Lock, User, MapPin, Phone, LogOut, CheckCircle2, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, login, register, requestOtp, verifyOtp, updateProfile, logout } = useAuth();

  // Mode: 'login' | 'register_email' | 'register_complete' | 'otp_login' | 'profile'
  const [mode, setMode] = useState<'login' | 'register_email' | 'register_complete' | 'otp_login' | 'profile'>(() => {
    if (user) return 'profile';
    return 'login';
  });

  // Login credentials
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regRoomNumber, setRegRoomNumber] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // OTP-only fallback
  const [otpLoginEmail, setOtpLoginEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Edit profile form
  const [editFullName, setEditFullName] = useState(profile?.fullName || '');
  const [editRoomNumber, setEditRoomNumber] = useState(profile?.roomNumber || '');
  const [editPhoneNumber, setEditPhoneNumber] = useState(profile?.phoneNumber || '');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Register: Step 1 Send OTP
  const handleRegisterSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const clean = regEmail.trim().toLowerCase();
    if (!clean.endsWith('@rit.ac.in') && clean !== 'roombites.rit@gmail.com') {
      setErrorMsg('Only official @rit.ac.in student emails are permitted.');
      return;
    }

    setIsLoading(true);
    try {
      await requestOtp(clean);
      setSuccessMsg(`Verification code sent to ${clean}`);
      setMode('register_complete');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Register: Step 2 Complete Registration
  const handleRegisterComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (!regFullName.trim() || !regRoomNumber.trim() || !regPhone.trim()) {
      setErrorMsg('Please fill in your name, room number, and phone number.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: regEmail.trim(),
        code: regOtp.trim(),
        password: regPassword,
        fullName: regFullName.trim(),
        roomNumber: regRoomNumber.trim(),
        phoneNumber: regPhone.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Check your OTP and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Fallback OTP Login
  const handleOtpLoginRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await requestOtp(otpLoginEmail.trim());
      setOtpSent(true);
      setSuccessMsg(`OTP sent to ${otpLoginEmail}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpLoginVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await verifyOtp(otpLoginEmail.trim(), otpCode.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Update Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await updateProfile({
        fullName: editFullName.trim(),
        roomNumber: editRoomNumber.trim(),
        phoneNumber: editPhoneNumber.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="font-bold text-sm text-white">
            {user
              ? 'Student Profile'
              : mode === 'login'
              ? 'Sign In to RoomBites'
              : mode === 'register_email' || mode === 'register_complete'
              ? 'New Student Registration'
              : 'Sign In with OTP'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-1">
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              {successMsg}
            </div>
          )}

          {/* VIEW: Signed-In Profile & Edit */}
          {user && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-semibold text-slate-200">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="font-semibold text-slate-200">{profile?.fullName || 'Student'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Delivery Room:</span>
                  <span className="font-bold text-amber-400">{profile?.roomNumber || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold text-slate-200">{profile?.phoneNumber || 'Not set'}</span>
                </div>
              </div>

              {mode === 'profile' ? (
                <form onSubmit={handleSaveProfile} className="space-y-3 pt-1 border-t border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-400">Update Delivery Details</p>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Hostel Room (e.g. Room 228)"
                    value={editRoomNumber}
                    onChange={e => setEditRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile / WhatsApp Number"
                    value={editPhoneNumber}
                    onChange={e => setEditPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                    >
                      {isLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { logout(); onClose(); }}
                      className="px-3 py-2 rounded-xl bg-rose-950/40 text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode('profile')}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700"
                  >
                    Edit Details
                  </button>
                  <button
                    onClick={() => { logout(); onClose(); }}
                    className="px-4 py-2 rounded-xl bg-rose-950/40 text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW 1: Password Login (Default) */}
          {!user && mode === 'login' && (
            <form onSubmit={handlePasswordLogin} className="space-y-3.5">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 block">RIT Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="student@rit.ac.in"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('register_email');
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold text-[11px]"
                >
                  New to RoomBites? Register Account →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('otp_login');
                  }}
                  className="text-slate-500 hover:text-slate-400 text-[10px]"
                >
                  Sign in with Email OTP instead
                </button>
              </div>
            </form>
          )}

          {/* VIEW 2: Register Step 1 (Enter Email) */}
          {!user && mode === 'register_email' && (
            <form onSubmit={handleRegisterSendOtp} className="space-y-3">
              <p className="text-xs text-slate-400">
                Enter your institutional RIT email. We'll send a 6-digit code to verify your account once.
              </p>

              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="student@rit.ac.in"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isLoading ? 'Sending Code...' : 'Get Verification Code'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setMode('login');
                  }}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: Register Step 2 (Single-Screen Complete Setup) */}
          {!user && mode === 'register_complete' && (
            <form onSubmit={handleRegisterComplete} className="space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-850/80 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                <span>Verifying: <strong className="text-amber-400">{regEmail}</strong></span>
                <button
                  type="button"
                  onClick={() => setMode('register_email')}
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                >
                  Change
                </button>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="6-digit OTP from email"
                    value={regOtp}
                    onChange={e => setRegOtp(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs font-mono tracking-wider text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Create Password (min 6 chars)"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={regFullName}
                    onChange={e => setRegFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Hostel Room (e.g. Room 228)"
                    value={regRoomNumber}
                    onChange={e => setRegRoomNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile / WhatsApp Number"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isLoading ? 'Creating Account...' : 'Complete & Sign In'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  ← Already registered? Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW 4: Sign in with OTP fallback */}
          {!user && mode === 'otp_login' && (
            <div className="space-y-3">
              {!otpSent ? (
                <form onSubmit={handleOtpLoginRequest} className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Receive a one-time login code to your RIT email address.
                  </p>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="student@rit.ac.in"
                      value={otpLoginEmail}
                      onChange={e => setOtpLoginEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                  >
                    {isLoading ? 'Sending...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleOtpLoginVerify} className="space-y-3">
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="6-digit OTP"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-center font-mono text-sm tracking-widest text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                </form>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode('login');
                  }}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  ← Back to Password Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
