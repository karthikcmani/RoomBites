import React, { useState } from 'react';
import { X, Mail, Lock, User, MapPin, Phone, LogOut, CheckCircle2, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, login, register, requestOtp, verifyOtp, updateProfile, logout } = useAuth();

  const [mode, setMode] = useState<'login' | 'register_email' | 'register_complete' | 'otp_login' | 'profile'>(() => {
    if (user) return 'profile';
    return 'login';
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regRoomNumber, setRegRoomNumber] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const [otpLoginEmail, setOtpLoginEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [editFullName, setEditFullName] = useState(profile?.fullName || '');
  const [editRoomNumber, setEditRoomNumber] = useState(profile?.roomNumber || '');
  const [editPhoneNumber, setEditPhoneNumber] = useState(profile?.phoneNumber || '');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
      setSuccessMsg(`Verification code dispatched to ${clean}`);
      setMode('register_complete');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (!regFullName.trim() || !regRoomNumber.trim() || !regPhone.trim()) {
      setErrorMsg('Please enter your full name, hostel room, and phone number.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: regEmail.trim().toLowerCase(),
        code: regOtp.trim(),
        password: regPassword,
        fullName: regFullName.trim(),
        roomNumber: regRoomNumber.trim(),
        phoneNumber: regPhone.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpLoginSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await requestOtp(otpLoginEmail.trim().toLowerCase());
      setOtpSent(true);
      setSuccessMsg('OTP code sent to your email.');
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
      await verifyOtp(otpLoginEmail.trim().toLowerCase(), otpCode.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await updateProfile({
        fullName: editFullName.trim(),
        roomNumber: editRoomNumber.trim(),
        phoneNumber: editPhoneNumber.trim()
      });
      setSuccessMsg('Profile updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border-subtle w-full max-w-sm rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border-subtle shrink-0">
          <h3 className="font-bold text-sm text-text-main">
            {user ? 'Student Account' : mode === 'register_complete' || mode === 'register_email' ? 'New Registration' : 'Student Sign In'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-surface-elevated flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Logged in Profile View */}
          {user && (
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-text-muted">Institutional Email</label>
                <p className="font-mono font-bold text-text-main mt-0.5">{user.email}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">Hostel Block & Room</label>
                <input
                  type="text"
                  value={editRoomNumber}
                  onChange={e => setEditRoomNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">Phone Number</label>
                <input
                  type="tel"
                  value={editPhoneNumber}
                  onChange={e => setEditPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-accent text-slate-950 font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all"
              >
                {isLoading ? 'Saving...' : 'Save Profile'}
              </button>

              <button
                type="button"
                onClick={() => { logout(); onClose(); }}
                className="w-full py-2 rounded-xl bg-surface-elevated text-rose-500 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </form>
          )}

          {/* Mode 1: Standard Password Login */}
          {!user && mode === 'login' && (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">RIT Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. 25m2576@rit.ac.in"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-accent text-slate-950 font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="pt-2 border-t border-border-subtle flex flex-col gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('register_email'); setErrorMsg(null); }}
                  className="text-[11px] text-accent font-semibold hover:underline"
                >
                  New student? Register with @rit.ac.in
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('otp_login'); setErrorMsg(null); }}
                  className="text-[11px] text-text-dim hover:text-text-muted"
                >
                  Forgot password? Sign in with email OTP
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: Register Step 1 (Send OTP) */}
          {!user && mode === 'register_email' && (
            <form onSubmit={handleRegisterSendOtp} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">Institutional RIT Email</label>
                <input
                  type="email"
                  placeholder="e.g. yourname@rit.ac.in"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                  required
                />
                <p className="text-[10px] text-text-dim">Only official college domains (@rit.ac.in) are authorized.</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-accent text-slate-950 font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1"
              >
                <span>{isLoading ? 'Sending OTP...' : 'Send Verification Code'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="pt-2 border-t border-border-subtle text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(null); }}
                  className="text-[11px] text-accent font-semibold hover:underline"
                >
                  Already registered? Sign in
                </button>
              </div>
            </form>
          )}

          {/* Mode 3: Register Step 2 (Complete with OTP & Password) */}
          {!user && mode === 'register_complete' && (
            <form onSubmit={handleRegisterComplete} className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">6-Digit Code sent to {regEmail}</label>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={regOtp}
                  onChange={e => setRegOtp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold text-center tracking-widest bg-surface border border-border-subtle text-text-main"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">Create Password (min. 6 chars)</label>
                <input
                  type="password"
                  placeholder="Choose password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Arun Kumar"
                  value={regFullName}
                  onChange={e => setRegFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-text-muted">Hostel & Room</label>
                  <input
                    type="text"
                    placeholder="e.g. 204, MH1"
                    value={regRoomNumber}
                    onChange={e => setRegRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-text-muted">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-accent text-slate-950 font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all mt-1"
              >
                {isLoading ? 'Registering...' : 'Complete Registration'}
              </button>
            </form>
          )}

          {/* Mode 4: OTP Login Fallback */}
          {!user && mode === 'otp_login' && (
            <form onSubmit={otpSent ? handleOtpLoginVerify : handleOtpLoginSend} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-text-muted">RIT Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. 25m2576@rit.ac.in"
                  value={otpLoginEmail}
                  onChange={e => setOtpLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-surface border border-border-subtle text-text-main"
                  required
                  disabled={otpSent}
                />
              </div>

              {otpSent && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-text-muted">6-Digit Verification Code</label>
                  <input
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold text-center tracking-widest bg-surface border border-border-subtle text-text-main"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-accent text-slate-950 font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all"
              >
                {isLoading ? 'Verifying...' : otpSent ? 'Verify Code & Sign In' : 'Send One-Time Code'}
              </button>

              <div className="pt-2 border-t border-border-subtle text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(null); }}
                  className="text-[11px] text-accent font-semibold hover:underline"
                >
                  Back to Password Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
