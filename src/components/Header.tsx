import React from 'react';
import { Settings, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';

export const Header: React.FC = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const { setIsSettingsOpen } = useAppSettings();

  return (
    <header className="site-header">
      {/* Left: Cog for Settings */}
      <div className="header-left">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn-cogwheel"
          title="Open Settings (Theme & Animations)"
          aria-label="Open Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Center: Centred Club Logo (logo_normal) */}
      <a href="/" className="header-center-logo" aria-label="University of Calgary Debate Society">
        <img
          src="/images/seo/logo_normal.png"
          alt="University of Calgary Debate Society Logo"
          className="header-logo-img"
          onError={(e) => {
            // Fallback to /photos/rex.png or public path if not found
            (e.target as HTMLImageElement).src = '/photos/rex.png';
          }}
        />
      </a>

      {/* Right: Login / Logout Button */}
      <div className="header-right">
        {user ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex text-xs font-semibold text-[#1C244C] dark:text-[#F6F6F6] truncate max-w-[120px]">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <button
              onClick={() => logout()}
              className="btn-header-auth btn-header-logout"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithGoogle()}
            className="btn-header-auth btn-header-login"
            title="Sign in with Google"
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
};
