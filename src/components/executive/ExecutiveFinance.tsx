import React, { useState } from 'react';
import {
  DollarSign,
  CheckCircle,
  Clock,
  Download,
  Search,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { ExecutiveLayout } from './ExecutiveLayout';
import { CustomSelect } from '@/components/common/CustomSelect';

interface DuesRecord {
  id: string;
  name: string;
  username: string;
  ucid: string;
  email: string;
  method: 'Stripe' | 'PayPal' | 'Interac e-Transfer' | 'Exempt';
  amount: string;
  status: 'Verified' | 'Pending' | 'Exempt';
  date: string;
}

export const ExecutiveFinance: React.FC = () => {
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const records: DuesRecord[] = [
    {
      id: 'd1',
      name: 'Michael Chang',
      username: 'mchang',
      ucid: '30089123',
      email: 'm.chang@ucalgary.ca',
      method: 'Stripe',
      amount: '$25.00 CAD',
      status: 'Verified',
      date: 'Aug 30, 2026',
    },
    {
      id: 'd2',
      name: 'Sarah Al-Mansoor',
      username: 'salmansoor',
      ucid: '30142891',
      email: 'sarah.almansoor@ucalgary.ca',
      method: 'PayPal',
      amount: '$25.00 CAD',
      status: 'Verified',
      date: 'Aug 29, 2026',
    },
    {
      id: 'd3',
      name: 'David Roberts',
      username: 'droberts',
      ucid: '30095812',
      email: 'david.roberts@ucalgary.ca',
      method: 'Interac e-Transfer',
      amount: '$25.00 CAD',
      status: 'Pending',
      date: 'Aug 28, 2026',
    },
    {
      id: 'd4',
      name: 'Elena Rostova',
      username: 'erostova',
      ucid: '30128910',
      email: 'elena.rostova@ucalgary.ca',
      method: 'Exempt',
      amount: '$0.00 CAD',
      status: 'Exempt',
      date: 'Aug 25, 2026',
    },
  ];

  const filteredRecords = records.filter((r) => {
    const matchesMethod = filterMethod === 'all' || r.method.toLowerCase().includes(filterMethod.toLowerCase());
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ucid.includes(searchQuery);
    return matchesMethod && matchesSearch;
  });

  return (
    <ExecutiveLayout activeSection="finance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] tracking-tight">
              Finance & Membership Dues
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Verify membership fee receipts across Stripe, PayPal, and e-Transfer. Track society operating ledger.
            </p>
          </div>

          <button
            type="button"
            onClick={() => alert('Exporting society financial records to CSV...')}
            className="btn-exec-return"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Ledger</span>
          </button>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="exec-card p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>Total Dues Revenue</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6]">$1,200.00 CAD</div>
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              48 active paid members
            </div>
          </div>

          <div className="exec-card p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>Tournament Grants & Subsidy</span>
              <DollarSign className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
            </div>
            <div className="text-2xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6]">$2,450.00 CAD</div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
              SU Quality Money + Dept Funds
            </div>
          </div>

          <div className="exec-card p-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>Current Cash Balance</span>
              <ShieldCheck className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6]">$3,650.00 CAD</div>
            <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
              Bank of Montreal (BMO) Account
            </div>
          </div>
        </div>

        {/* Table Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search by debater name, UCID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="exec-input exec-search-input !pl-10 text-xs"
              />
            </div>
          </div>

          <div className="w-56">
            <CustomSelect
              value={filterMethod}
              onChange={(val) => setFilterMethod(val)}
              options={[
                { value: 'all', label: 'All Payment Channels' },
                { value: 'Stripe', label: 'Stripe' },
                { value: 'PayPal', label: 'PayPal' },
                { value: 'Interac', label: 'Interac e-Transfer' },
                { value: 'Exempt', label: 'Exempt / Alumni' },
              ]}
            />
          </div>
        </div>

        {/* Dues Transactions Table */}
        <div className="exec-card p-0 overflow-hidden">
          <div className="exec-table-wrapper">
            <table className="exec-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>UCID / Identifier</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <div className="font-bold text-xs">{rec.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {rec.email}
                      </div>
                    </td>
                    <td className="text-xs font-mono font-semibold">
                      {rec.ucid || 'External'}
                    </td>
                    <td>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#1C244C]/5 dark:bg-[#53afd0]/10 text-[#1C244C] dark:text-[#53afd0]">
                        {rec.method}
                      </span>
                    </td>
                    <td className="text-xs font-black font-sans text-[#0075A2] dark:text-[#53afd0]">
                      {rec.amount}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          rec.status === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : rec.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              : 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        {rec.status === 'Verified' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{rec.status}</span>
                      </span>
                    </td>
                    <td className="text-xs text-slate-500 dark:text-slate-400">{rec.date}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => alert(`Reviewing transaction ${rec.id}`)}
                        className="text-xs font-bold text-[#0075A2] dark:text-[#53afd0] hover:underline cursor-pointer"
                      >
                        Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ExecutiveLayout>
  );
};
