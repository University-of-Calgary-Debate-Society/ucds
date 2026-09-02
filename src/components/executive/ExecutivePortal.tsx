import {
  Users,
  DollarSign,
  Calendar,
  Mail,
  FileText,
  Building2,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Shield,
} from 'lucide-react';
import { ExecutiveLayout } from './ExecutiveLayout';
import { useSmoothNavigate } from '@/utils/navigation';

export const ExecutivePortal: React.FC = () => {
  const smoothNavigate = useSmoothNavigate();

  const metrics = [
    { label: 'Active Members', value: '48', change: '+12% this term', icon: Users },
    { label: 'Dues Collected', value: '$1,200', change: '48 paid debaters', icon: DollarSign },
    { label: 'Active Events', value: '4', change: '2 tournaments scheduled', icon: Calendar },
    { label: 'Subscribers', value: '142', change: 'across 5 lists', icon: Mail },
  ];

  const executiveModules = [
    {
      id: 'mail',
      title: 'Mailing & Communications',
      desc: 'Manage subscriber lists, compose official weekly digests, and monitor delivery analytics.',
      href: '/executive/mail',
      icon: Mail,
      badge: '5 Lists Active',
    },
    {
      id: 'events',
      title: 'Tournament & Practice Events',
      desc: 'Schedule weekly training rounds, manage tournament team allocations, and track attendance.',
      href: '/executive/events',
      icon: Calendar,
      badge: 'Calgary Invitational Prep',
    },
    {
      id: 'finance',
      title: 'Finance & Membership Dues',
      desc: 'Verify member fee payments across Stripe, PayPal, and Interac. Review semester cash balance.',
      href: '/executive/finance',
      icon: DollarSign,
      badge: '$1,200 YTD',
    },
    {
      id: 'members',
      title: 'Member Directory & Roles',
      desc: 'Search active debaters, assign adjudicator permissions, and inspect institutional affiliations.',
      href: '/executive/members',
      icon: Users,
      badge: '48 Members',
    },
    {
      id: 'posts',
      title: 'Announcements & Motions',
      desc: 'Publish official club notices, update tournament motion archives, and edit website matter files.',
      href: '/executive/posts',
      icon: FileText,
      badge: '32 Motions Archived',
    },
    {
      id: 'organizations',
      title: 'Organizations Directory',
      desc: 'Manage debate societies, institutions, format records, and executive directories globally.',
      href: '/executive/organizations',
      icon: Building2,
      badge: 'Global Registry',
    },
  ];

  const recentTasks = [
    { id: 1, text: 'Confirm room bookings for Thursday BP Practice (ST 140)', done: true, time: 'Today' },
    { id: 2, text: 'Reconcile e-Transfer dues with member records', done: true, time: 'Yesterday' },
    { id: 3, text: 'Send reminder for Calgary High School Tournament judge registration', done: false, time: 'Pending' },
    { id: 4, text: 'Finalize CUSID Winter Novice registration roster', done: false, time: 'Due Friday' },
  ];

  return (
    <ExecutiveLayout activeSection="overview">
      <div className="space-y-8">
        {/* Page Title & Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] tracking-tight">
              Executive Overview
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              University of Calgary Debate Society • Executive Management Console
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>2026/2027 Academic Term Active</span>
          </div>
        </div>

        {/* Compact Key Metrics */}
        <div className="exec-metrics-grid">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="exec-metric-card">
                <div className="exec-metric-icon">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="exec-metric-value">{m.value}</div>
                  <div className="exec-metric-label">{m.label}</div>
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>{m.change}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Executive Quick Launcher Cards */}
        <div>
          <h2 className="text-lg font-bold font-sans text-[#1C244C] dark:text-[#F6F6F6] mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
            <span>Executive Management Hubs</span>
          </h2>

          <div className="exec-launcher-grid">
            {executiveModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  onClick={() => smoothNavigate(mod.href)}
                  className="exec-launcher-card group"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && smoothNavigate(mod.href)}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/15 text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#1C244C]/5 dark:bg-[#53afd0]/10 text-[#1C244C] dark:text-[#53afd0] border border-[#1C244C]/10 dark:border-[#53afd0]/20">
                        {mod.badge}
                      </span>
                    </div>

                    <h3 className="exec-launcher-title group-hover:text-[#0075A2] dark:group-hover:text-[#53afd0] transition-colors">
                      {mod.title}
                    </h3>
                    <p className="exec-launcher-desc">
                      {mod.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 text-xs font-bold text-[#0075A2] dark:text-[#53afd0]">
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Executive Action Checklist & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Executive Checklist */}
          <div className="exec-card">
            <h3 className="text-base font-bold font-sans text-[#1C244C] dark:text-[#F6F6F6] mb-4 flex items-center justify-between">
              <span>Executive Action Items</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Term 2026/2027</span>
            </h3>

            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-sm transition ${
                    task.done
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-600 dark:text-slate-300'
                      : 'bg-[#1C244C]/5 dark:bg-[#53afd0]/5 border-[#1C244C]/10 dark:border-[#53afd0]/20 text-[#1C244C] dark:text-[#F6F6F6]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {task.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                    <span className={task.done ? 'line-through opacity-70' : 'font-semibold'}>
                      {task.text}
                    </span>
                  </div>
                  <span className="text-xs font-bold opacity-60 flex-shrink-0">{task.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Announcement Broadcast Preview */}
          <div className="exec-card flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold font-sans text-[#1C244C] dark:text-[#F6F6F6] mb-2 flex items-center justify-between">
                <span>Quick Dispatch</span>
                <span className="text-xs font-bold text-[#0075A2] dark:text-[#53afd0]">Broadcast</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Send urgent announcements or schedule updates to all 142 registered debaters and subscribers.
              </p>

              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Broadcast Subject (e.g. Practice Room Change)"
                  className="exec-input text-xs"
                />
                <textarea
                  rows={3}
                  placeholder="Message content..."
                  className="exec-input text-xs resize-none"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Target: General Members list</span>
              <button
                type="button"
                onClick={() => smoothNavigate('/executive/mail')}
                className="btn-exec-primary text-xs py-1.5 px-3"
              >
                <span>Compose in Mail Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ExecutiveLayout>
  );
};
