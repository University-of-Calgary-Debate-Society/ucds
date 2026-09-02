import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  CheckCircle,
} from 'lucide-react';
import { ExecutiveLayout } from './ExecutiveLayout';
import { CustomSelect } from '@/components/common/CustomSelect';

interface SocietyEvent {
  id: string;
  title: string;
  type: 'Practice' | 'Tournament' | 'High School' | 'Workshop';
  date: string;
  time: string;
  location: string;
  attendeesCount: number;
  format: 'BP' | 'CP' | 'APDA' | 'All';
  status: 'Upcoming' | 'Completed';
}

export const ExecutiveEvents: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for New Event
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'Practice' | 'Tournament' | 'High School' | 'Workshop'>('Practice');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('6:00 PM - 8:30 PM');
  const [newLocation, setNewLocation] = useState('Science Theatres (ST 140)');
  const [newFormat, setNewFormat] = useState<'BP' | 'CP' | 'APDA' | 'All'>('BP');

  const [eventsList, setEventsList] = useState<SocietyEvent[]>([
    {
      id: 'e1',
      title: 'Weekly Training & Novice Debate Seminar',
      type: 'Practice',
      date: 'Thursday, Sep 04, 2026',
      time: '6:00 PM - 8:30 PM',
      location: 'Science Theatres (ST 140)',
      attendeesCount: 32,
      format: 'BP',
      status: 'Upcoming',
    },
    {
      id: 'e2',
      title: '60th Annual Calgary Invitational Parliamentary Debate Tournament',
      type: 'Tournament',
      date: 'Oct 16-18, 2026',
      time: 'Full Weekend',
      location: 'MacEwan Hall & Murray Fraser Hall',
      attendeesCount: 84,
      format: 'CP',
      status: 'Upcoming',
    },
    {
      id: 'e3',
      title: 'Calgary High School Fall Debate Invitational & Training Camp',
      type: 'High School',
      date: 'Nov 07, 2026',
      time: '9:00 AM - 5:00 PM',
      location: 'Craigie Hall (CH C104)',
      attendeesCount: 64,
      format: 'BP',
      status: 'Upcoming',
    },
    {
      id: 'e4',
      title: 'Adjudication Workshop & Speaker Scoring Calibration',
      type: 'Workshop',
      date: 'Tuesday, Sep 09, 2026',
      time: '6:30 PM - 8:00 PM',
      location: 'Taylor Institute for Teaching & Learning',
      attendeesCount: 24,
      format: 'All',
      status: 'Upcoming',
    },
  ]);

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate) return;

    const created: SocietyEvent = {
      id: `e_${Date.now()}`,
      title: newTitle,
      type: newType,
      date: newDate,
      time: newTime,
      location: newLocation,
      attendeesCount: 0,
      format: newFormat,
      status: 'Upcoming',
    };

    setEventsList((prev) => [created, ...prev]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewDate('');
  };

  const filteredEvents = eventsList.filter((ev) => {
    const matchesType = filterType === 'all' || ev.type.toLowerCase() === filterType.toLowerCase();
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <ExecutiveLayout activeSection="events">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] tracking-tight">
              Event & Tournament Management
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Schedule weekly training sessions, coordinate tournament allocations, and organize high school events.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-exec-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search events or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="exec-input exec-search-input !pl-10 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {['all', 'Practice', 'Tournament', 'High School', 'Workshop'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === t
                    ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2]'
                    : 'bg-[#1C244C]/5 dark:bg-[#53afd0]/10 text-slate-700 dark:text-slate-300 hover:bg-[#1C244C]/10'
                }`}
              >
                {t === 'all' ? 'All Events' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((ev) => (
            <div key={ev.id} className="exec-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      ev.type === 'Tournament'
                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                        : ev.type === 'High School'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                          : 'bg-[#0075A2]/10 text-[#0075A2] dark:text-[#53afd0] border border-[#0075A2]/20'
                    }`}
                  >
                    {ev.type} • {ev.format} Format
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{ev.status}</span>
                  </span>
                </div>

                <h3 className="text-base font-bold font-sans text-[#1C244C] dark:text-[#F6F6F6] mb-3 leading-snug">
                  {ev.title}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#0075A2] dark:text-[#53afd0]" />
                    <span>{ev.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#0075A2] dark:text-[#53afd0]" />
                    <span>{ev.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#0075A2] dark:text-[#53afd0]" />
                    <span>{ev.location}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                  <Users className="w-3.5 h-3.5 text-[#0075A2] dark:text-[#53afd0]" />
                  <span>{ev.attendeesCount} Registered Debaters</span>
                </div>

                <button
                  type="button"
                  className="text-xs font-bold text-[#0075A2] dark:text-[#53afd0] hover:underline cursor-pointer"
                >
                  Manage Roster
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Event Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-viewFadeIn">
            <div className="exec-card max-w-lg w-full">
              <h2 className="text-lg font-bold font-sans text-[#1C244C] dark:text-[#F6F6F6] mb-4">
                Schedule Society Event
              </h2>

              <form onSubmit={handleCreateEvent} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Winter Invitational Preparation Round"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="exec-input text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Event Category
                    </label>
                    <CustomSelect
                      value={newType}
                      onChange={(val) => setNewType(val as 'Practice' | 'Tournament' | 'High School' | 'Workshop')}
                      options={[
                        { value: 'Practice', label: 'Practice' },
                        { value: 'Tournament', label: 'Tournament' },
                        { value: 'High School', label: 'High School' },
                        { value: 'Workshop', label: 'Workshop' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Debate Style
                    </label>
                    <CustomSelect
                      value={newFormat}
                      onChange={(val) => setNewFormat(val as 'BP' | 'CP' | 'APDA' | 'All')}
                      options={[
                        { value: 'BP', label: 'British Parliamentary (BP)' },
                        { value: 'CP', label: 'Canadian Parliamentary (CP)' },
                        { value: 'APDA', label: 'APDA' },
                        { value: 'All', label: 'All Formats' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Date
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Thursday, Sep 18, 2026"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="exec-input text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Time Slot
                    </label>
                    <input
                      type="text"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="exec-input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Room / Campus Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="exec-input text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-exec-return text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-exec-primary text-xs">
                    Save Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ExecutiveLayout>
  );
};
