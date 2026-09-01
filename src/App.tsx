import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { FloatingNavbar } from '@/components/FloatingNavbar';
import { SettingsModal } from '@/components/SettingsModal';
import { PageTransitionWrapper } from '@/components/PageTransitionWrapper';
import { MiniScrollVisualizer } from '@/components/MiniScrollVisualizer';
import { HomeHero } from '@/components/home/HomeHero';
import { MemberLogin } from '@/components/member/MemberLogin';
import { MemberRegister } from '@/components/member/MemberRegister';
import { MemberPortal } from '@/components/member/MemberPortal';
import { Unsubscribe } from '@/components/member/Unsubscribe';
import { SocialMedia } from '@/components/connect/SocialMedia';
import { updateSeasonalSeoTags } from '@/utils/seasonalLogo';

export const App: React.FC = () => {
  // Sync seasonal logo to favicon, og:image, and SEO metadata on mount
  useEffect(() => {
    updateSeasonalSeoTags();
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#F6F6F6] dark:bg-[#15162C] text-[#1C244C] dark:text-[#F6F6F6] transition-colors duration-300 overflow-x-hidden">
      {/* Top Persistent Header */}
      <Header />

      {/* Floating Vertical Navigation Bar */}
      <FloatingNavbar />

      {/* Settings Modal (Theme & Motion Toggle) */}
      <SettingsModal />

      {/* Mini Scrollbar Progress & Visualizer */}
      <MiniScrollVisualizer />

      {/* Page Routing with Theme-Aware Fade In & Fade Out Transitions */}
      <main className="flex-1 w-full flex flex-col">
        <PageTransitionWrapper>
          <Routes>
            {/* Homepage */}
            <Route path="/" element={<HomeHero />} />

            {/* Connect Section */}
            <Route path="/connect/socials" element={<SocialMedia />} />
            <Route path="/connect/social-media" element={<SocialMedia />} />

            {/* Member Section */}
            <Route path="/member/login" element={<MemberLogin />} />
            <Route path="/member/register" element={<MemberRegister />} />
            <Route path="/member/portal" element={<MemberPortal />} />
            <Route path="/member/unsubscribe" element={<Unsubscribe />} />

            {/* Fallback to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageTransitionWrapper>
      </main>
    </div>
  );
};

export default App;
