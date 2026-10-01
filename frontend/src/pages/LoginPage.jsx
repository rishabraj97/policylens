import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
} from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      await login(email.trim(), password);
      // Seamless redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#050816] cyber-grid relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="ambient-glow w-96 h-96 bg-cyan-500/10 top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2" />
      <div className="ambient-glow w-96 h-96 bg-purple-500/10 bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 w-full max-w-5xl rounded-3xl bg-[#0B1020]/90 border border-slate-800/80 shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Branding Column */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-between bg-gradient-to-br from-[#0F172A] via-[#0B1020] to-[#050816] border-b lg:border-b-0 lg:border-r border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950/80 text-neon-cyan border border-cyan-500/30 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enterprise Compliance Suite</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Sign in to your <span className="gradient-text-cyan">PolicyLens</span> workspace.
            </h1>

            <p className="mt-4 text-sm text-slate-400 leading-relaxed">
              Automate policy decomposition, monitor statutory deadlines, and maintain audit readiness with continuous AI compliance intelligence.
            </p>

            <div className="mt-8 space-y-3.5">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="p-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Automated multi-department obligation extraction</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="p-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Real-time compliance readiness score & analytics</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="p-1 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Direct page-level evidentiary audit trails</span>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>256-Bit TLS Encryption</span>
            <span>SOC2 Compliance Ready</span>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-[#0B1020]/60">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Welcome Back
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your credentials to access your organization's dashboard.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="compliance.officer@enterprise.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password reset instructions will be sent to your work email in production.');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#0F172A] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isLoading}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full py-3"
                >
                  {isLoading ? 'Authenticating...' : 'Sign In to Workspace'}
                </Button>
              </div>
            </form>

            <p className="text-center text-xs text-slate-400 pt-2">
              Don't have an account?{' '}
              <Link to="/signup" className="text-neon-cyan font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
