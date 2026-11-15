import React, { useState } from 'react';
import { X, Mail, KeyRound, User, MapPin, Phone, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, requestOtp, verifyOtp, updateProfile, logout } = useAuth();

  const [step, setStep] = useState<'email' | 'otp' | 'profile'>(() => {
    if (user && !profile) return 'profile';
    return 'email';
  });

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Profile form
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [roomNumber, setRoomNumber] = useState(profile?.roomNumber || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const clean = email.trim().toLowerCase();
    if (!clean.endsWith('@rit.ac.in') && clean !== 'roombites.rit@gmail.com') {
      setErrorMsg('Only valid @rit.ac.in institutional emails (or admin login) are permitted.');
      return;
    }

    setIsLoading(true);
    try {
      await requestOtp(email.trim());
      setStep('otp');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await verifyOtp(email.trim(), otp.trim());
      const savedUserStr = localStorage.getItem('roombites_user');
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
      if (savedUser?.profile?.roomNumber && savedUser?.profile?.phoneNumber) {
        onClose();
      } else {
        setStep('profile');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!fullName.trim() || !roomNumber.trim() || !phoneNumber.trim()) {
      setErrorMsg('All profile fields are required for hostel deliveries.');
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({ fullName, roomNumber, phoneNumber });
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
            {user ? 'Student Account' : 'Institutional Sign In'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-1.5">
              <span>{errorMsg}</span>
              {errorMsg.includes('RATE_LIMITED') && (
                <button
                  type="button"
                  onClick={() => { setErrorMsg(null); setStep('otp'); }}
                  className="text-amber-400 hover:text-amber-300 text-left font-semibold underline mt-1"
                >
                  Code already requested? Click here to enter your 6-digit OTP →
                </button>
              )}
            </div>
          )}

          {/* User Already Signed In: Profile Management */}
          {user && step !== 'profile' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-semibold text-slate-200">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="font-bold text-amber-400 uppercase">{user.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Room:</span>
                  <span className="font-semibold text-slate-200">{profile?.roomNumber || 'Not set'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('profile')}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs border border-rose-500/30 flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Email Form */}
          {!user && step === 'email' && (
            <form onSubmit={handleRequestOtp} className="space-y-3">
              <p className="text-xs text-slate-400">
                Enter your official RIT student email address to receive a 6-digit verification code.
              </p>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="student@rit.ac.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Sending Code...' : 'Continue with RIT Email'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setStep('otp');
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                >
                  Already have a code? Enter verification code →
                </button>
              </div>
            </form>
          )}

          {/* Step 2: OTP Form */}
          {!user && step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <p className="text-xs text-slate-400">
                Enter the 6-digit code sent to your institutional email: <strong className="text-slate-200">{email}</strong>.
              </p>

              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-center text-sm font-mono tracking-widest text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300"
              >
                ← Change Email
              </button>
            </form>
          )}

          {/* Step 3: Complete Profile */}
          {(step === 'profile') && (
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <p className="text-xs text-slate-400">
                Setup your hostel delivery room for seamless midnight deliveries.
              </p>

              <div className="space-y-2">
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Hostel Block & Room (e.g. B-302)"
                    value={roomNumber}
                    onChange={e => setRoomNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile / WhatsApp Number"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isLoading ? 'Saving...' : 'Save Profile Details'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
