import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Building2,
  LayoutDashboard,
  ArrowLeft,
  Settings,
  Lock,
  AlertTriangle,
  UserCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { getSeasonalLogoInfo } from '@/utils/seasonalLogo';
import { getAssetUrl } from '@/utils/assetUrl';
import { useSmoothNavigate } from '@/utils/navigation';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ExecutiveLayoutProps {
  children: React.ReactNode;
  activeSection?: 'overview' | 'mail' | 'events' | 'finance' | 'members' | 'posts' | 'organizations';
}

const EXEC_SECTIONS = [
  { id: 'overview', name: 'Overview', href: '/executive/portal', icon: LayoutDashboard },
  { id: 'members', name: 'Members & Roster', href: '/executive/members', icon: Users },
  { id: 'organizations', name: 'Organizations', href: '/executive/organizations', icon: Building2 },
  { id: 'events', name: 'Events', href: '/executive/events', icon: Calendar },
  { id: 'finance', name: 'Finance', href: '/executive/finance', icon: DollarSign },
  { id: 'mail', name: 'Communications', href: '/executive/mail', icon: Mail },
  { id: 'posts', name: 'Posts & Forms', href: '/executive/posts', icon: FileText },
];

export const ExecutiveLayout: React.FC<ExecutiveLayoutProps> = ({ children, activeSection }) => {
  const { user, profile, isExecutive, loading: authLoading } = useAuth();
  const { setIsSettingsOpen } = useAppSettings();
  const smoothNavigate = useSmoothNavigate();
  const location = useLocation();

  // Collapsible Sidebar State (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ucds_exec_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ucds_exec_sidebar_collapsed', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Determine current active section from location pathname if not explicitly passed
  const currentSection =
    activeSection ||
    (location.pathname.includes('/members')
      ? 'members'
      : location.pathname.includes('/organizations')
        ? 'organizations'
        : location.pathname.includes('/events')
          ? 'events'
          : location.pathname.includes('/finance')
            ? 'finance'
            : location.pathname.includes('/mail')
              ? 'mail'
              : location.pathname.includes('/posts')
                ? 'posts'
                : 'overview');

  // Loading state
  if (authLoading) {
    return (
      <div className="executive-page-container flex items-center justify-center min-h-screen">
        <LoadingScreen delayMs={300} message="Verifying executive credentials..." />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="executive-page-container flex items-center justify-center p-4">
        <div className="exec-card exec-restricted-card">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] mb-2">
            Authentication Required
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            You must be signed in with an authorized officer account to access the Executive Portal.
          </p>
          <button
            type="button"
            onClick={() => smoothNavigate('/member/login')}
            className="btn-exec-primary w-full"
          >
            <span>Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  // Not an Executive (Access Denied)
  if (!profile || !isExecutive) {
    return (
      <div className="executive-page-container flex items-center justify-center p-4">
        <div className="exec-card exec-restricted-card">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] mb-2">
            Executive Access Restricted
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            Your account (@{profile?.username || 'user'}) is not registered as an elected Executive Officer. If you believe this is an error, please contact the Society Administrator.
          </p>
          <button
            type="button"
            onClick={() => smoothNavigate('/member/portal')}
            className="btn-exec-primary w-full"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Member Portal</span>
          </button>
        </div>
      </div>
    );
  }

  const { logoUrl, altText, seasonName } = getSeasonalLogoInfo();

  return (
    <div className="executive-page-container">
      {/* Constant Static Executive Header (No Page Switch Animation) */}
      <header className="executive-header">
        <div className="executive-header-inner">
          {/* Left: Settings Cog + Executive Badge */}
          <div className="header-left">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="btn-cogwheel"
              title="Open Settings (Theme & Animations)"
              aria-label="Open Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="executive-brand-badge">
              <ShieldCheck className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
              <span className="hidden sm:inline">UCDS Executive</span>
            </div>
          </div>

          {/* Center: Centered Seasonal Club Logo */}
          <button
            type="button"
            onClick={() => smoothNavigate('/')}
            className="header-center-logo cursor-pointer bg-transparent border-none"
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
          </button>

          {/* Right: Officer Name & Member Portal Button */}
          <div className="header-right">
            {profile && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C244C]/5 dark:bg-[#53afd0]/10 border border-[#1C244C]/10 dark:border-[#53afd0]/20 text-xs font-bold text-[#1C244C] dark:text-[#F6F6F6]">
                <UserCircle className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                <span className="truncate max-w-[120px]">@{profile.username || profile['name-first']}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => smoothNavigate('/member/portal')}
              className="btn-exec-return"
              title="Return to Member Portal"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Member Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout with Collapsible Left Navigation Sidebar */}
      <div className="executive-layout-body">
        <aside
          className={`executive-sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}
          aria-label="Executive Section Sidebar"
        >
          {/* Sidebar Section Navigation Links */}
          <nav className="executive-sidebar-nav">
            {EXEC_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = currentSection === sec.id;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => smoothNavigate(sec.href)}
                  className={`executive-sidebar-link ${isActive ? 'active' : ''}`}
                  title={isCollapsed ? sec.name : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{sec.name}</span>}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Collapse Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="executive-sidebar-toggle"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center justify-between w-full px-2 text-xs font-semibold">
                <span>Collapse</span>
                <ChevronLeft className="w-4 h-4" />
              </div>
            )}
          </button>
        </aside>

        {/* Main Section Content */}
        <main className="executive-main-content">
          <div key={location.pathname} className="animate-pageEnter w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
