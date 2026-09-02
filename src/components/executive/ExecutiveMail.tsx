import React, { useState } from 'react';
import {
  Send,
  Users,
  CheckCircle,
  Clock,
  Plus,
  Search,
  AlertCircle,
} from 'lucide-react';
import { ExecutiveLayout } from './ExecutiveLayout';
import { CustomSelect } from '@/components/common/CustomSelect';
import { FloatingAlert } from '@/components/common/FloatingAlert';
import { PUBLIC_MAILING_LISTS } from '@/services/userService';

interface CampaignDraft {
  id: string;
  subject: string;
  list: string;
  recipientCount: number;
  status: 'Sent' | 'Draft' | 'Scheduled';
  date: string;
}

export const ExecutiveMail: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'lists' | 'compose'>('campaigns');
  const [selectedList, setSelectedList] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Compose State
  const [composeSubject, setComposeSubject] = useState('');
  const [composeList, setComposeList] = useState<string>(PUBLIC_MAILING_LISTS[0]);
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const pastCampaigns: CampaignDraft[] = [
    {
      id: 'c1',
      subject: 'Weekly Debate Practice Schedule & Topic Matter: Carbon Taxes & Climate Markets',
      list: 'General',
      recipientCount: 142,
      status: 'Sent',
      date: 'Aug 29, 2026',
    },
    {
      id: 'c2',
      subject: 'Calgary High School Tournament Judge Registration Open',
      list: 'Highschool Debate',
      recipientCount: 68,
      status: 'Sent',
      date: 'Aug 24, 2026',
    },
    {
      id: 'c3',
      subject: 'September Executive Council Meeting Agenda & Room Booking',
      list: 'Newsletter',
      recipientCount: 8,
      status: 'Sent',
      date: 'Aug 20, 2026',
    },
    {
      id: 'c4',
      subject: 'Alumni Dinner & Society 60th Anniversary Gala Save the Date',
      list: 'Opportunities',
      recipientCount: 85,
      status: 'Draft',
      date: 'Sep 02, 2026',
    },
  ];

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeSubject || !composeBody) {
      setToastType('error');
      setToastMessage('Please fill in both subject and email body.');
      return;
    }

    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setToastType('success');
      setToastMessage('Email broadcast successfully queued for delivery!');
      setComposeSubject('');
      setComposeBody('');
      setTimeout(() => {
        setActiveTab('campaigns');
      }, 1200);
    }, 800);
  };

  const filteredCampaigns = pastCampaigns.filter((c) => {
    const matchesList = selectedList === 'all' || c.list.toLowerCase() === selectedList.toLowerCase();
    const matchesSearch = c.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesList && matchesSearch;
  });

  const listFilterOptions = [
    { value: 'all', label: 'All Mailing Lists' },
    ...PUBLIC_MAILING_LISTS.map((listName) => ({
      value: listName,
      label: `${listName} List`,
    })),
  ];

  const composeListOptions = PUBLIC_MAILING_LISTS.map((listName) => ({
    value: listName,
    label: `${listName} Mailing List`,
  }));

  return (
    <ExecutiveLayout activeSection="mail">
      <FloatingAlert
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastMessage(null)}
      />

      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] tracking-tight">
              Mail & Communications Hub
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Manage mailing list subscribers, schedule tournament newsletters, and dispatch executive broadcasts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className="btn-exec-primary"
          >
            <Plus className="w-4 h-4" />
            <span>New Broadcast</span>
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-[#1C244C]/10 dark:border-[#53afd0]/20 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'campaigns'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-[#1C244C]/5 dark:hover:bg-[#53afd0]/10'
            }`}
          >
            Campaign History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lists')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'lists'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-[#1C244C]/5 dark:hover:bg-[#53afd0]/10'
            }`}
          >
            Mailing Lists ({PUBLIC_MAILING_LISTS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'compose'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-[#1C244C]/5 dark:hover:bg-[#53afd0]/10'
            }`}
          >
            Compose Email
          </button>
        </div>

        {/* Tab 1: Campaign History */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full flex items-center">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="Search past campaigns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="exec-input exec-search-input !pl-10 text-xs"
                  />
                </div>
              </div>

              <div className="w-52">
                <CustomSelect
                  value={selectedList}
                  onChange={(val) => setSelectedList(val)}
                  options={listFilterOptions}
                />
              </div>
            </div>

            {/* Campaign Table */}
            <div className="exec-card p-0 overflow-hidden">
              <div className="exec-table-wrapper">
                <table className="exec-table">
                  <thead>
                    <tr>
                      <th>Subject & Campaign</th>
                      <th>Target List</th>
                      <th>Recipients</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map((camp) => (
                      <tr key={camp.id}>
                        <td className="font-bold font-sans text-xs">
                          {camp.subject}
                        </td>
                        <td>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#0075A2]/10 text-[#0075A2] dark:bg-[#53afd0]/15 dark:text-[#53afd0]">
                            {camp.list}
                          </span>
                        </td>
                        <td className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {camp.recipientCount} subscribers
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              camp.status === 'Sent'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {camp.status === 'Sent' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span>{camp.status}</span>
                          </span>
                        </td>
                        <td className="text-xs text-slate-500 dark:text-slate-400">
                          {camp.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Mailing Lists */}
        {activeTab === 'lists' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PUBLIC_MAILING_LISTS.map((listName) => (
              <div key={listName} className="exec-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-[#1C244C] dark:text-[#F6F6F6]">
                      {listName}
                    </h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#1C244C]/10 dark:bg-[#53afd0]/15 text-[#1C244C] dark:text-[#53afd0]">
                      Subscribers
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    Official society mailing list for {listName.toLowerCase()} updates, announcements, and notices.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                    <Users className="w-3.5 h-3.5" />
                    <span>Auto-synced with Subscribers collection</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setComposeList(listName);
                      setActiveTab('compose');
                    }}
                    className="text-[#0075A2] dark:text-[#53afd0] font-bold hover:underline cursor-pointer"
                  >
                    Compose to List
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Compose Email */}
        {activeTab === 'compose' && (
          <div className="exec-card max-w-3xl mx-auto">
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Mailing List
                </label>
                <CustomSelect
                  value={composeList}
                  onChange={(val) => setComposeList(val)}
                  options={composeListOptions}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  placeholder="e.g. UCDS Weekly Training & Calgary Cup Allocations"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="exec-input text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Message (Markdown supported)
                </label>
                <textarea
                  rows={8}
                  placeholder="Type your official executive message here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="exec-input text-xs resize-y font-mono"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Sender: debate@ucds.ca</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('campaigns')}
                    className="btn-exec-return text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="btn-exec-primary text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'Sending Broadcast...' : 'Dispatch Broadcast'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </ExecutiveLayout>
  );
};
