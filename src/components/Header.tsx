import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, LogIn, UserCircle, LogOut, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { getSeasonalLogoInfo } from '@/utils/seasonalLogo';
import { getAssetUrl } from '@/utils/assetUrl';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setIsSettingsOpen } = useAppSettings();
  const { logoUrl, altText, seasonName } = getSeasonalLogoInfo();

  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const signoutWrapperRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        signoutWrapperRef.current &&
        !signoutWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSignoutConfirm(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSignoutConfirm(false);
      }
    };

    if (showSignoutConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSignoutConfirm]);

  const handleConfirmSignout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setShowSignoutConfirm(false);
      navigate('/member/login');
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

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
            (e.target as HTMLImageElement).src = getAssetUrl('images/seo/logo_normal.png');
          }}
        />
      </Link>

      {/* Right: Login Icon / Logout & Portal Buttons */}
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

            {/* Top-Right Anchored Sign-Out Button & Confirmation Popover */}
            <div ref={signoutWrapperRef} className="signout-popover-wrapper">
              <button
                type="button"
                onClick={() => setShowSignoutConfirm((prev) => !prev)}
                className={`btn-cogwheel transition-colors ${
                  showSignoutConfirm
                    ? 'border-rose-500 text-rose-500 bg-rose-500/10'
                    : 'hover:border-rose-400 hover:text-rose-500 text-slate-500 dark:text-slate-400'
                }`}
                title="Sign Out"
                aria-label="Sign Out"
                aria-expanded={showSignoutConfirm}
              >
                <LogOut className="w-5 h-5" />
              </button>

              {/* In-Window Top-Right Anchored Confirmation Popup */}
              {showSignoutConfirm && (
                <div
                  className="signout-popover-card"
                  role="dialog"
                  aria-labelledby="signout-popup-title"
                  aria-describedby="signout-popup-desc"
                >
                  <h3 id="signout-popup-title" className="signout-popover-title">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>Sign Out?</span>
                  </h3>
                  <p id="signout-popup-desc" className="signout-popover-desc">
                    Are you sure you want to sign out of your account?
                  </p>
                  <div className="signout-popover-actions">
                    <button
                      type="button"
                      onClick={() => setShowSignoutConfirm(false)}
                      className="btn-signout-cancel"
                      disabled={isLoggingOut}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSignout}
                      className="btn-signout-confirm"
                      disabled={isLoggingOut}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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
