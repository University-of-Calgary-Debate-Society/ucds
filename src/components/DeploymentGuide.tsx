import React, { useState } from 'react';
import { Cloud, Terminal, Check, Copy, ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

export const DeploymentGuide: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const gitCommands = [
    'git init',
    'git add .',
    'git commit -m "feat: bootstrap modern Vite+React stack with Firebase, GitHub Pages, and Cloudflare"',
    'git branch -M main',
    'git remote add origin https://github.com/University-of-Calgary-Debate-Society/ucds.git',
    'git push -u origin main',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* GitHub Pages Hookup Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <GithubIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">GitHub Pages CI/CD</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automated deployment via GitHub Actions
                </p>
              </div>
            </div>
            <StatusBadge status="ready" text="Workflow Configured" />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            Every push to <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400 font-mono text-[11px]">main</code> automatically triggers the GitHub Actions workflow (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">.github/workflows/deploy.yml</code>), running typechecks, linting, Vite build, and deploying static bundles directly to GitHub Pages.
          </p>

          <div className="space-y-2 mb-4">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                Push Repository Commands:
              </span>
              <button
                onClick={() => copyToClipboard(gitCommands.join('\n'), 100)}
                className="text-[11px] text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1"
              >
                {copiedIndex === 100 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedIndex === 100 ? 'Copied' : 'Copy All'}
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto space-y-1">
              {gitCommands.map((cmd, idx) => (
                <div key={idx} className="flex justify-between items-center group">
                  <span>{cmd}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
            <span className="font-semibold">Important GitHub Setting:</span> In GitHub repository settings (<strong>Settings &gt; Pages &gt; Build and deployment</strong>), select <strong>GitHub Actions</strong> as the source.
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Target URL:</span>
          <a
            href="https://University-of-Calgary-Debate-Society.github.io/ucds"
            target="_blank"
            rel="noreferrer"
            className="text-red-600 dark:text-red-400 font-medium hover:underline inline-flex items-center gap-1"
          >
            University-of-Calgary-Debate-Society.github.io/ucds
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Cloudflare Hookup Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800/60 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Cloudflare Edge & CDN</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Edge caching, security headers, & custom domain
                </p>
              </div>
            </div>
            <StatusBadge status="ready" text="Headers & Rules Ready" />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
            Cloudflare connects in front of GitHub Pages to provide global DDoS mitigation, TLS 1.3 encryption, automatic Brotli compression, and custom apex/subdomain routing (e.g. <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">debate.ucalgary.ca</code> or <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">ucds.ca</code>).
          </p>

          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Included Cloudflare Hookup Files:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60">
                <span className="font-mono text-red-600 dark:text-red-400 font-semibold block">public/_headers</span>
                <span className="text-[11px] text-slate-500">HSTS, CSP, X-Frame-Options, 1-year asset cache</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60">
                <span className="font-mono text-red-600 dark:text-red-400 font-semibold block">public/_redirects</span>
                <span className="text-[11px] text-slate-500">SPA 200 rewrite for edge & Cloudflare Pages</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
              Custom Domain DNS Setup (CNAME Record):
            </span>
            <div className="font-mono text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div>Type: <span className="text-slate-900 dark:text-slate-100 font-bold">CNAME</span></div>
              <div>Name: <span className="text-slate-900 dark:text-slate-100 font-bold">@ / www / debate</span></div>
              <div>Target: <span className="text-slate-900 dark:text-slate-100 font-bold">University-of-Calgary-Debate-Society.github.io</span></div>
              <div>Proxy status: <span className="text-orange-500 font-bold">Proxied (Orange Cloud)</span></div>
              <div>SSL/TLS encryption: <span className="text-emerald-500 font-bold">Full (Strict)</span></div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">Documentation:</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1">
            docs/CLOUDFLARE_GUIDE.md <ArrowRight className="w-3 h-3 text-slate-400" />
          </span>
        </div>
      </div>
    </div>
  );
};
