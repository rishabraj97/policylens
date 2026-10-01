import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Menu,
  X,
  ArrowUpRight,
  User,
  LogOut,
  UploadCloud,
  FileCheck,
  LayoutDashboard,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking'); // 'healthy' | 'offline' | 'checking'
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    let isMounted = true;
    api.checkHealth()
      .then((data) => {
        if (isMounted) {
          setApiStatus(data?.status === 'healthy' ? 'healthy' : 'offline');
        }
      })
      .catch(() => {
        if (isMounted) setApiStatus('offline');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Documents', path: '/documents', icon: BookOpen },
    { label: 'Upload Policy', path: '/upload', icon: UploadCloud },
    { label: 'Analysis Engine', path: '/analysis', icon: Sparkles },
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#050816]/85 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan via-teal-400 to-neon-blue text-[#050816] shadow-[0_0_20px_rgba(0,245,212,0.4)] transition-all duration-300 group-hover:scale-105">
              <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-extrabold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  Policy<span className="text-neon-cyan">Lens</span>
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-cyan-950/80 text-neon-cyan border border-cyan-500/30">
                  AI OS
                </span>
              </div>
              <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 -mt-0.5">
                Compliance Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0B1020]/60 p-1 rounded-xl border border-slate-800/60">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-cyan-950/70 text-neon-cyan border border-cyan-500/30 shadow-[0_0_12px_rgba(0,245,212,0.2)] font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: API health & Auth / CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* Backend Health Badge (Preserved real health check) */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all ${
                apiStatus === 'healthy'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                  : apiStatus === 'offline'
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
              }`}
              title={`FastAPI Service Health: ${apiStatus}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  apiStatus === 'healthy'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e] animate-pulse'
                    : apiStatus === 'offline'
                    ? 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
                    : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className="text-[11px] font-semibold">
                API {apiStatus === 'healthy' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking'}
              </span>
            </div>

            {/* Auth section */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#0F172A] border border-slate-700/80 hover:border-cyan-500/40 text-xs text-slate-200 transition"
                >
                  <div className="w-5 h-5 rounded-full bg-cyan-950 text-neon-cyan border border-cyan-500/40 flex items-center justify-center font-mono font-bold text-[10px]">
                    {user?.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <span className="max-w-[100px] truncate font-medium">{user?.name || 'Account'}</span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0F172A] border border-slate-800 shadow-xl py-1 text-xs z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="font-semibold text-white truncate">{user?.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-xs font-semibold text-[#050816] bg-gradient-to-r from-neon-cyan to-neon-blue hover:shadow-[0_0_15px_rgba(0,245,212,0.4)] px-3 py-1.5 rounded-lg transition"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Quick Upload Action */}
            <Link
              to="/upload"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#050816] bg-gradient-to-r from-neon-cyan via-teal-300 to-neon-blue hover:shadow-[0_0_20px_rgba(0,245,212,0.45)] px-3.5 py-2 rounded-xl transition-all duration-200 active:scale-95"
            >
              <span>Upload Policy</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#0B1020]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  active
                    ? 'bg-cyan-950/80 text-neon-cyan border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiStatus === 'healthy' ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]' : 'bg-rose-500'
                  }`}
                />
                Backend: {apiStatus}
              </div>

              {!isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs text-slate-300 hover:text-white px-2 py-1"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-xs font-semibold text-[#050816] bg-neon-cyan px-2.5 py-1 rounded-lg"
                  >
                    Sign Up
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Sign Out
                </button>
              )}
            </div>

            <Link
              to="/upload"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center text-xs font-semibold text-[#050816] bg-gradient-to-r from-neon-cyan to-neon-blue py-2.5 rounded-xl shadow-[0_0_15px_rgba(0,245,212,0.3)]"
            >
              Upload Document
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

