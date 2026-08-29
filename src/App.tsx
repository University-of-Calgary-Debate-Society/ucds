import React from 'react';
import { Header } from '@/components/Header';
import { FloatingNavbar } from '@/components/FloatingNavbar';
import { SettingsModal } from '@/components/SettingsModal';
import { HomeHero } from '@/components/home/HomeHero';

export const App: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-[#F6F6F6] dark:bg-[#15162C] text-[#1C244C] dark:text-[#F6F6F6] transition-colors duration-300">
      {/* Top Header */}
      <Header />

      {/* Floating Vertical Navigation Bar */}
      <FloatingNavbar />

      {/* Settings Modal (Theme & Motion Toggle) */}
      <SettingsModal />

      {/* Main Content: Reworked Animated Homepage */}
      <main className="flex-1 w-full flex items-center justify-center">
        <HomeHero />
      </main>
    </div>
  );
};

export default App;
