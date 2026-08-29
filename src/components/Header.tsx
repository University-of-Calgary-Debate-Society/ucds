import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, LogIn, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { getSeasonalLogoInfo } from '@/utils/seasonalLogo';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setIsSettingsOpen } = useAppSettings();
  const { logoUrl, altText, seasonName } = getSeasonalLogoInfo();

  return (
    <header className="site-header">
      {/* Left: Cogwheel for Settings */}
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

      {/* Center: Centred Seasonal Club Logo */}
      <Link
        to="/"
        className="header-center-logo"
        aria-label={`University of Calgary Debate Society (${seasonName})`}
        title={`UCDS - ${seasonName}`}
      >
        <img
          src={logoUrl}
          alt={altText}
          className="header-logo-img"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/seo/logo_normal.png';
          }}
        />
      </Link>

      {/* Right: Login Icon / Logout & Portal Buttons (Icon only) */}
      <div className="header-right">
        {user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/member/portal"
              className="btn-cogwheel"
              title="Member Portal"
              aria-label="Member Portal"
            >
              <UserCircle className="w-5 h-5 text-[#0075A2] dark:text-[#53afd0]" />
            </Link>
            <button
              onClick={async () => {
                await logout();
                navigate('/member/login');
              }}
              className="btn-cogwheel hover:border-rose-400 hover:text-rose-500 text-slate-500 dark:text-slate-400"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <Link
            to="/member/login"
            className="btn-cogwheel"
            title="Sign In"
            aria-label="Sign In"
          >
            <LogIn className="w-5 h-5 text-[#0075A2] dark:text-[#53afd0]" />
          </Link>
        )}
      </div>
    </header>
  );
};
