import React from 'react';
import {
  Layers,
  Zap,
  Globe,
  Flame,
  Shield,
  Code2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { StatusBadge } from '@/components/StatusBadge';
import { FirebaseDemo } from '@/components/FirebaseDemo';
import { DeploymentGuide } from '@/components/DeploymentGuide';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C8102E] to-[#E35205] text-white flex items-center justify-center font-black text-lg shadow-md shadow-red-500/20 ring-2 ring-red-500/30">
              U
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                  University of Calgary Debate Society
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-[#C8102E] dark:bg-red-950/60 dark:text-red-300">
                  UCDS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Modern Webapp Platform Stack
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/University-of-Calgary-Debate-Society/ucds"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800"
            >
              <span>GitHub Repo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 w-full">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/50 dark:from-slate-900 dark:via-slate-900/40 dark:to-slate-950 p-8 sm:p-10 shadow-sm">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-red-500/10 dark:bg-red-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 dark:bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-[#C8102E] dark:text-red-400 border border-red-500/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Production-Ready Web Stack Bootstrapped
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Modern Full-Stack Client Architecture for{' '}
              <span className="bg-gradient-to-r from-[#C8102E] via-red-500 to-amber-500 bg-clip-text text-transparent">
                UCDS
              </span>
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Equipped with <strong>Vite + React 19</strong>, <strong>TypeScript</strong>, <strong>Tailwind CSS</strong>, automated <strong>GitHub Pages CI/CD</strong>, modular <strong>Firebase Auth & Firestore</strong> services, and <strong>Cloudflare CDN / DNS Proxy</strong> configuration.
            </p>

            <div className="pt-2 flex flex-wrap gap-2">
              <StatusBadge status="ready" text="Vite 6 + React 19" />
              <StatusBadge status="ready" text="GitHub Actions CI/CD" />
              <StatusBadge status="active" text="Firebase Modular SDK" />
              <StatusBadge status="ready" text="Cloudflare Headers & SPA" />
              <StatusBadge status="ready" text="Dark Mode & Accessibility" />
            </div>
          </div>
        </div>

        {/* Stack Overview Diagnostic Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-500" />
              Integrated Technology Stack
            </h3>
            <span className="text-xs text-slate-500">Fully configured & wired</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Vite + React */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl">
              <div className="p-2.5 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 w-fit mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Vite + React 19</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                Lightning-fast HMR, ES modules bundling, and React 19 concurrent features.
              </p>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Code2 className="w-3 h-3 text-slate-400" />
                vite.config.ts
              </div>
            </div>

            {/* GitHub Pages */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 w-fit mb-3">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">GitHub Pages</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                Automated continuous deployment workflow with custom 404 SPA route handling.
              </p>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-slate-400" />
                .github/workflows/deploy.yml
              </div>
            </div>

            {/* Firebase */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl">
              <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 w-fit mb-3">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Firebase Suite</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                Modular Authentication (Google OAuth), Firestore database, and Analytics.
              </p>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Code2 className="w-3 h-3 text-slate-400" />
                src/lib/firebase.ts
              </div>
            </div>

            {/* Cloudflare */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl">
              <div className="p-2.5 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 w-fit mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Cloudflare Edge</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                Security headers, asset caching policy, custom domain proxy, & SPA rewrites.
              </p>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Code2 className="w-3 h-3 text-slate-400" />
                public/_headers
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Firebase Section */}
        <FirebaseDemo />

        {/* Deployment & Hookup Documentation Guide */}
        <DeploymentGuide />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} University of Calgary Debate Society. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/University-of-Calgary-Debate-Society/ucds"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              GitHub Repository
            </a>
            <span>•</span>
            <a
              href="https://University-of-Calgary-Debate-Society.github.io/ucds"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition"
            >
              Live Deployment
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
