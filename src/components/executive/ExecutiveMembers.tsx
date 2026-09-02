import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Mail,
  ShieldCheck,
  GraduationCap,
  X,
  Clock,
  UserCheck,
  UserX,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  RefreshCw,
  Building2,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ExecutiveLayout } from './ExecutiveLayout';
import { CustomSelect } from '@/components/common/CustomSelect';
import { FloatingAlert } from '@/components/common/FloatingAlert';
import {
  fetchAllUsers,
  updateUserPrivileges,
  fetchPreviousExecutiveYears,
  savePreviousExecutiveYear,
  deletePreviousExecutiveYear,
  fetchCurrentExecutiveRoster,
  saveCurrentExecutiveRoster,
  formatExecRoleKey,
  type UserDirectoryEntry,
  type PreviousExecutiveYearDoc,
  type PreviousExecutiveOfficer,
  type CurrentExecutiveOfficer,
} from '@/services/userService';

type MemberTab = 'external' | 'members' | 'executives';

export const ExecutiveMembers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MemberTab>('members');
  const [users, setUsers] = useState<UserDirectoryEntry[]>([]);
  const [currentRoster, setCurrentRoster] = useState<CurrentExecutiveOfficer[]>([]);
  const [prevYears, setPrevYears] = useState<PreviousExecutiveYearDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [filterRegistration, setFilterRegistration] = useState<string>('all');
  const [filterPaid, setFilterPaid] = useState<string>('all');
  const [filterExec, setFilterExec] = useState<string>('all');

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isCurrentExecModalOpen, setIsCurrentExecModalOpen] = useState(false);
  const [editingCurrentOfficer, setEditingCurrentOfficer] = useState<CurrentExecutiveOfficer | null>(null);
  const [currentRoleTitle, setCurrentRoleTitle] = useState('');
  const [currentOfficerEmail, setCurrentOfficerEmail] = useState('');
  const [currentOfficerFirstName, setCurrentOfficerFirstName] = useState('');
  const [currentOfficerLastName, setCurrentOfficerLastName] = useState('');
  const [currentOfficerBio, setCurrentOfficerBio] = useState('');

  // Previous Year Modals
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  const [isPrevOfficerModalOpen, setIsPrevOfficerModalOpen] = useState(false);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [editingPrevOfficerKey, setEditingPrevOfficerKey] = useState<string | null>(null);
  const [prevRoleInput, setPrevRoleInput] = useState('');
  const [prevOfficerFirstName, setPrevOfficerFirstName] = useState('');
  const [prevOfficerLastName, setPrevOfficerLastName] = useState('');
  const [prevOfficerEmail, setPrevOfficerEmail] = useState('');
  const [prevOfficerBio, setPrevOfficerBio] = useState('');

  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  // Delete Confirmations
  const [deleteConfirmType, setDeleteConfirmType] = useState<'year' | 'prevOfficer' | null>(null);
  const [deleteTargetYearId, setDeleteTargetYearId] = useState<string | null>(null);
  const [deleteTargetOfficerKey, setDeleteTargetOfficerKey] = useState<string | null>(null);

  // Scroll lock when any modal is open
  useEffect(() => {
    const isAnyOpen =
      isCurrentExecModalOpen ||
      isYearModalOpen ||
      isPrevOfficerModalOpen ||
      Boolean(deleteConfirmType);

    if (isAnyOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isCurrentExecModalOpen, isYearModalOpen, isPrevOfficerModalOpen, deleteConfirmType]);

  // Load All Data
  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, rosterData, yearsData] = await Promise.all([
        fetchAllUsers(forceRefresh),
        fetchCurrentExecutiveRoster(forceRefresh),
        fetchPreviousExecutiveYears(forceRefresh),
      ]);
      setUsers(usersData);
      setCurrentRoster(rosterData);
      setPrevYears(yearsData);
      if (yearsData.length > 0) {
        setExpandedYear((curr) => curr || yearsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load member/executive data:', err);
      setError('Failed to load directory from Firestore.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle Member Field
  const handleTogglePrivilege = async (
    userItem: UserDirectoryEntry,
    field: 'isPaid' | 'isExecutive' | 'isRestricted'
  ) => {
    const nextVal = !userItem[field];
    try {
      await updateUserPrivileges(userItem.id, { [field]: nextVal });
      setUsers((prev) =>
        prev.map((u) => (u.id === userItem.id ? { ...u, [field]: nextVal } : u))
      );
      setSuccess(`Updated ${field} to ${nextVal} for ${userItem['name-first'] || userItem.username || 'user'}.`);
    } catch (err) {
      console.error(`Failed to toggle ${field}:`, err);
      setError(`Failed to update ${field}.`);
    }
  };

  // Filtered Users for External Tab (isUCDS is false or not true)
  const externalUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      if (u.id === '_default' || u.id.toLowerCase() === '_default') return false;
      if (u.isUCDS) return false;

      // Filter registration
      if (filterRegistration === 'registered' && !u.isRegistered) return false;
      if (filterRegistration === 'unregistered' && u.isRegistered) return false;

      if (!q) return true;

      const fullName = `${u['name-first'] || ''} ${u['name-last'] || ''}`.toLowerCase();
      const email = (u['email-login'] || u['email-preferred'] || '').toLowerCase();
      const org = (u['affiliated-organization'] || '').toLowerCase();
      const un = (u.username || '').toLowerCase();

      return fullName.includes(q) || email.includes(q) || org.includes(q) || un.includes(q);
    }).sort((a, b) => {
      const nameA = `${a['name-first'] || ''} ${a['name-last'] || ''}`.trim() || a.username || '';
      const nameB = `${b['name-first'] || ''} ${b['name-last'] || ''}`.trim() || b.username || '';
      if (sortBy === 'name-asc') return nameA.localeCompare(nameB);
      if (sortBy === 'name-desc') return nameB.localeCompare(nameA);
      if (sortBy === 'email') return (a['email-login'] || '').localeCompare(b['email-login'] || '');
      if (sortBy === 'org') return (a['affiliated-organization'] || '').localeCompare(b['affiliated-organization'] || '');
      return 0;
    });
  }, [users, searchQuery, filterRegistration, sortBy]);

  // Filtered Users for Members Tab (isUCDS is true)
  const memberUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      if (u.id === '_default' || u.id.toLowerCase() === '_default') return false;
      if (!u.isUCDS) return false;

      // Filter registration
      if (filterRegistration === 'registered' && !u.isRegistered) return false;
      if (filterRegistration === 'unregistered' && u.isRegistered) return false;

      // Filter paid
      if (filterPaid === 'paid' && !u.isPaid) return false;
      if (filterPaid === 'unpaid' && u.isPaid) return false;

      // Filter exec
      if (filterExec === 'exec' && !u.isExecutive) return false;
      if (filterExec === 'non-exec' && u.isExecutive) return false;

      if (!q) return true;

      const fullName = `${u['name-first'] || ''} ${u['name-last'] || ''}`.toLowerCase();
      const email = (u['email-login'] || u['email-preferred'] || u['email-ucalgary'] || '').toLowerCase();
      const un = (u.username || '').toLowerCase();

      return fullName.includes(q) || email.includes(q) || un.includes(q);
    }).sort((a, b) => {
      if (sortBy === 'exec-first') {
        if (a.isExecutive !== b.isExecutive) return a.isExecutive ? -1 : 1;
      }
      if (sortBy === 'paid-first') {
        if (a.isPaid !== b.isPaid) return a.isPaid ? -1 : 1;
      }
      const nameA = `${a['name-first'] || ''} ${a['name-last'] || ''}`.trim() || a.username || '';
      const nameB = `${b['name-first'] || ''} ${b['name-last'] || ''}`.trim() || b.username || '';
      if (sortBy === 'name-desc') return nameB.localeCompare(nameA);
      if (sortBy === 'email') return (a['email-login'] || '').localeCompare(b['email-login'] || '');
      return nameA.localeCompare(nameB);
    });
  }, [users, searchQuery, filterRegistration, filterPaid, filterExec, sortBy]);

  // Current Executive Editing
  const handleOpenCurrentExecModal = (officer: CurrentExecutiveOfficer) => {
    setEditingCurrentOfficer(officer);
    setCurrentRoleTitle(officer.roleTitle);
    setCurrentOfficerEmail(officer.email || '');
    setCurrentOfficerFirstName(officer['name-first'] || '');
    setCurrentOfficerLastName(officer['name-last'] || '');
    setCurrentOfficerBio(officer.bio || '');
    setIsCurrentExecModalOpen(true);
  };

  const handleSaveCurrentOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCurrentOfficer) return;

    try {
      // Build clean map of current roster with no undefined properties
      const currentMap: Record<string, PreviousExecutiveOfficer> = {};
      const trimmedRole = currentRoleTitle.trim() || editingCurrentOfficer.roleTitle;
      const trimmedEmail = currentOfficerEmail.trim().toLowerCase();
      const trimmedFirstName = currentOfficerFirstName.trim();
      const trimmedLastName = currentOfficerLastName.trim();
      const trimmedBio = currentOfficerBio.trim();
      const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();

      currentRoster.forEach((off) => {
        if (off.key === editingCurrentOfficer.key) {
          const entry: PreviousExecutiveOfficer = {
            role: trimmedRole,
          };
          if (trimmedFirstName) entry['name-first'] = trimmedFirstName;
          if (trimmedLastName) entry['name-last'] = trimmedLastName;
          if (fullName) entry.name = fullName;
          if (trimmedEmail) entry.email = trimmedEmail;
          if (trimmedBio) entry.bio = trimmedBio;
          currentMap[off.key] = entry;
        } else {
          const entry: PreviousExecutiveOfficer = {
            role: off.roleTitle,
          };
          if (off['name-first']) entry['name-first'] = off['name-first'];
          if (off['name-last']) entry['name-last'] = off['name-last'];
          if (off.name) entry.name = off.name;
          if (off.email) entry.email = off.email;
          if (off.bio) entry.bio = off.bio;
          currentMap[off.key] = entry;
        }
      });

      await saveCurrentExecutiveRoster(currentMap);

      // Check if this officer corresponds to a registered user account
      const matchedUser = trimmedEmail
        ? users.find(
          (u) =>
            (u['email-ucalgary'] && u['email-ucalgary'].toLowerCase() === trimmedEmail) ||
            (u['email-login'] && u['email-login'].toLowerCase() === trimmedEmail) ||
            (u['email-preferred'] && u['email-preferred'].toLowerCase() === trimmedEmail)
        )
        : undefined;

      const targetUid = editingCurrentOfficer.registeredUid || matchedUser?.id;

      // If registered user exists and bio changed, update User document bio as well
      if (targetUid && trimmedBio !== editingCurrentOfficer.bio) {
        await updateUserPrivileges(targetUid, { biography: trimmedBio });
      }

      setSuccess(`Successfully updated executive officer "${trimmedRole}".`);
      setIsCurrentExecModalOpen(false);
      await loadData(true);
    } catch (err) {
      console.error('Failed to save current officer:', err);
      setError('Failed to update current executive officer in Firestore.');
    }
  };

  // Add / Save Previous Year Document
  const handleSaveYearDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanYear = newYearInput.trim();
    if (!cleanYear) return;

    try {
      await savePreviousExecutiveYear(cleanYear, {}, true);
      setSuccess(`Created past executive record for "${cleanYear}".`);
      setIsYearModalOpen(false);
      setNewYearInput('');
      setExpandedYear(cleanYear);
      loadData();
    } catch (err) {
      console.error('Failed to save executive year:', err);
      setError('Failed to create executive year.');
    }
  };

  // Open Officer Modal for a Previous Year
  const handleOpenPrevOfficerModal = (yearId: string, officerKey?: string) => {
    setSelectedYearId(yearId);
    const yearDoc = prevYears.find((y) => y.id === yearId);
    if (officerKey && yearDoc?.executives[officerKey]) {
      setEditingPrevOfficerKey(officerKey);
      const ex = yearDoc.executives[officerKey];
      setPrevRoleInput(ex.role || officerKey.replace(/-/g, ' '));
      setPrevOfficerFirstName(ex['name-first'] || ex.name?.split(' ')[0] || '');
      setPrevOfficerLastName(ex['name-last'] || ex.name?.split(' ').slice(1).join(' ') || '');
      setPrevOfficerEmail(ex.email || '');
      setPrevOfficerBio(ex.bio || '');
    } else {
      setEditingPrevOfficerKey(null);
      setPrevRoleInput('');
      setPrevOfficerFirstName('');
      setPrevOfficerLastName('');
      setPrevOfficerEmail('');
      setPrevOfficerBio('');
    }
    setIsPrevOfficerModalOpen(true);
  };

  // Save Officer for a Previous Year
  const handleSavePrevOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYearId || !prevRoleInput.trim()) return;

    const yearDoc = prevYears.find((y) => y.id === selectedYearId);
    const existingExecutives = { ...(yearDoc?.executives || {}) };

    const roleKey =
      editingPrevOfficerKey ||
      formatExecRoleKey(prevRoleInput, Object.keys(existingExecutives));

    const fullName = `${prevOfficerFirstName} ${prevOfficerLastName}`.trim();

    const officerEntry: PreviousExecutiveOfficer = {
      role: prevRoleInput.trim(),
    };
    if (prevOfficerFirstName.trim()) officerEntry['name-first'] = prevOfficerFirstName.trim();
    if (prevOfficerLastName.trim()) officerEntry['name-last'] = prevOfficerLastName.trim();
    if (fullName) officerEntry.name = fullName;
    if (prevOfficerEmail.trim()) officerEntry.email = prevOfficerEmail.trim().toLowerCase();
    if (prevOfficerBio.trim()) officerEntry.bio = prevOfficerBio.trim();

    existingExecutives[roleKey] = officerEntry;

    try {
      await savePreviousExecutiveYear(selectedYearId, existingExecutives, false);
      setSuccess(`Saved officer "${prevRoleInput}" in ${selectedYearId}.`);
      setIsPrevOfficerModalOpen(false);
      await loadData(true);
    } catch (err) {
      console.error('Failed to save previous officer:', err);
      setError('Failed to save previous officer in Firestore.');
    }
  };

  // Confirm Delete Year / Officer
  const handleExecuteDelete = async () => {
    if (deleteConfirmType === 'year' && deleteTargetYearId) {
      try {
        await deletePreviousExecutiveYear(deleteTargetYearId);
        setSuccess(`Deleted executive records for ${deleteTargetYearId}.`);
        setDeleteConfirmType(null);
        setDeleteTargetYearId(null);
        loadData();
      } catch (err) {
        console.error('Failed to delete year record:', err);
        setError('Failed to delete year record.');
      }
    } else if (deleteConfirmType === 'prevOfficer' && deleteTargetYearId && deleteTargetOfficerKey) {
      const yearDoc = prevYears.find((y) => y.id === deleteTargetYearId);
      if (yearDoc) {
        const copy = { ...yearDoc.executives };
        delete copy[deleteTargetOfficerKey];
        try {
          await savePreviousExecutiveYear(deleteTargetYearId, copy, false);
          setSuccess(`Removed officer from ${deleteTargetYearId}.`);
          setDeleteConfirmType(null);
          setDeleteTargetYearId(null);
          setDeleteTargetOfficerKey(null);
          loadData();
        } catch (err) {
          console.error('Failed to remove officer:', err);
          setError('Failed to remove officer.');
        }
      }
    }
  };

  return (
    <ExecutiveLayout activeSection="members">
      {/* Floating Alerts */}
      <FloatingAlert message={error} type="error" onDismiss={() => setError(null)} duration={5000} />
      <FloatingAlert message={success} type="success" onDismiss={() => setSuccess(null)} duration={5000} />

      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] tracking-tight">
              Member Directory & Roster
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
              Manage external debaters, UCDS society members, and executive officers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              className="p-2 rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-[#0075A2] dark:hover:text-[#53afd0] transition shadow-sm cursor-pointer"
              title="Refresh from Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0075A2]' : ''}`} />
            </button>
            {activeTab === 'executives' && (
              <button
                type="button"
                onClick={() => setIsYearModalOpen(true)}
                className="btn-exec-primary py-2 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Past Year</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Main Tabs Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#1C244C]/5 dark:bg-[#53afd0]/10 border border-[#1C244C]/10 dark:border-[#53afd0]/20 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'members'
              ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2] shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#0075A2]'
              }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Members ({users.filter((u) => u.isUCDS && u.id !== '_default').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('external')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'external'
              ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2] shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#0075A2]'
              }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>External ({users.filter((u) => !u.isUCDS && u.id !== '_default').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('executives')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'executives'
              ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2] shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#0075A2]'
              }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Executives</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MEMBERS DIRECTORY (UCDS = TRUE)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full flex items-center">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="Search UCDS members by name, email, or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="exec-input exec-search-input !pl-10 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="w-36">
                  <CustomSelect
                    value={filterPaid}
                    onChange={(val) => setFilterPaid(val)}
                    options={[
                      { value: 'all', label: 'All Dues Status' },
                      { value: 'paid', label: 'Paid Dues' },
                      { value: 'unpaid', label: 'Unpaid Dues' },
                    ]}
                  />
                </div>
                <div className="w-36">
                  <CustomSelect
                    value={filterExec}
                    onChange={(val) => setFilterExec(val)}
                    options={[
                      { value: 'all', label: 'All Roles' },
                      { value: 'exec', label: 'Executives Only' },
                      { value: 'non-exec', label: 'General Members' },
                    ]}
                  />
                </div>
                <div className="w-40">
                  <CustomSelect
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    options={[
                      { value: 'name-asc', label: 'Sort: Name (A-Z)' },
                      { value: 'name-desc', label: 'Sort: Name (Z-A)' },
                      { value: 'exec-first', label: 'Sort: Executives First' },
                      { value: 'paid-first', label: 'Sort: Paid First' },
                      { value: 'email', label: 'Sort: Email' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Members Compact Card Grid */}
            {loading ? (
              <div className="exec-card p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
                Loading members directory from Firestore...
              </div>
            ) : memberUsers.length === 0 ? (
              <div className="exec-card p-12 text-center text-slate-400">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">No UCDS members found matching your search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {memberUsers.map((m) => {
                  const fullName = `${m['name-first'] || ''} ${m['name-last'] || ''}`.trim() || m.username || 'UCDS Member';
                  const email = m['email-ucalgary'] || m['email-login'] || m['email-preferred'] || 'No email';
                  const pronounDisplay = m.pronouns?.subject && m.pronouns?.object ? `${m.pronouns.subject}/${m.pronouns.object}` : '';

                  return (
                    <div
                      key={m.id}
                      className="exec-card flex flex-col justify-between p-3.5 hover:border-[#0075A2] dark:hover:border-[#53afd0] transition-all rounded-xl"
                    >
                      <div className="space-y-2">
                        {/* Header: Name + Registered Badge */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <h3 className="font-extrabold text-xs text-[#1C244C] dark:text-[#F6F6F6] leading-snug">
                              {fullName}
                            </h3>
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                              @{m.username || 'user'} {pronounDisplay ? `• (${pronounDisplay})` : ''}
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${m.isRegistered
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                              }`}
                            title={m.isRegistered ? 'Verified Registered User' : 'Unregistered User'}
                          >
                            {m.isRegistered ? <UserCheck className="w-2.5 h-2.5" /> : <UserX className="w-2.5 h-2.5" />}
                            <span>{m.isRegistered ? 'Registered' : 'Guest'}</span>
                          </span>
                        </div>

                        {/* Email & Year */}
                        <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 truncate" title={email}>
                            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{email}</span>
                          </div>
                        </div>

                        {/* Roles */}
                        {Array.isArray(m.type) && m.type.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {m.type.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-[#0075A2]/10 text-[#0075A2] dark:bg-[#53afd0]/15 dark:text-[#53afd0]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Privilege Toggles: isPaid, isExecutive, isRestricted */}
                      <div className="mt-3 pt-2.5 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 space-y-1.5 text-[11px]">
                        {/* Paid Dues Switch */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                            <span>Dues Paid</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePrivilege(m, 'isPaid')}
                            className={`p-1 rounded-md transition cursor-pointer flex items-center gap-1 font-bold text-[10px] ${m.isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                              }`}
                          >
                            {m.isPaid ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </div>

                        {/* Executive Status Switch */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">Executive</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePrivilege(m, 'isExecutive')}
                            className={`p-1 rounded-md transition cursor-pointer flex items-center gap-1 font-bold text-[10px] ${m.isExecutive ? 'text-[#0075A2] dark:text-[#53afd0]' : 'text-slate-400'
                              }`}
                          >
                            {m.isExecutive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </div>

                        {/* Restricted Status Switch */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">Restricted</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePrivilege(m, 'isRestricted')}
                            className={`p-1 rounded-md transition cursor-pointer flex items-center gap-1 font-bold text-[10px] ${m.isRestricted ? 'text-rose-600' : 'text-slate-400'
                              }`}
                          >
                            {m.isRestricted ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: EXTERNAL DIRECTORY (isUCDS = FALSE)                               */}
        {/* ========================================================================= */}
        {activeTab === 'external' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full flex items-center">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="Search external members by name, email, or affiliation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="exec-input exec-search-input !pl-10 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="w-36">
                  <CustomSelect
                    value={filterRegistration}
                    onChange={(val) => setFilterRegistration(val)}
                    options={[
                      { value: 'all', label: 'All Users' },
                      { value: 'registered', label: 'Registered' },
                      { value: 'unregistered', label: 'Guest / Unregistered' },
                    ]}
                  />
                </div>
                <div className="w-40">
                  <CustomSelect
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    options={[
                      { value: 'name-asc', label: 'Sort: Name (A-Z)' },
                      { value: 'name-desc', label: 'Sort: Name (Z-A)' },
                      { value: 'org', label: 'Sort: Affiliation' },
                      { value: 'email', label: 'Sort: Email' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* External Cards Grid */}
            {loading ? (
              <div className="exec-card p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
                Loading external directory from Firestore...
              </div>
            ) : externalUsers.length === 0 ? (
              <div className="exec-card p-12 text-center text-slate-400">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">No external members found matching your search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {externalUsers.map((m) => {
                  const fullName = `${m['name-first'] || ''} ${m['name-last'] || ''}`.trim() || m.username || 'External User';
                  const email = m['email-login'] || m['email-preferred'] || 'No email attached';
                  const affiliation = m['affiliated-organization']?.trim() || 'Independent';

                  return (
                    <div
                      key={m.id}
                      className="exec-card flex flex-col justify-between p-3.5 hover:border-[#0075A2] dark:hover:border-[#53afd0] transition-all rounded-xl"
                    >
                      <div className="space-y-2">
                        {/* Header: Name + Registered Badge */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <h3 className="font-extrabold text-xs text-[#1C244C] dark:text-[#F6F6F6] leading-snug">
                              {fullName}
                            </h3>
                            <div className="text-[10.5px] text-[#0075A2] dark:text-[#53afd0] font-medium truncate" title={affiliation}>
                              {affiliation}
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${m.isRegistered
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                              }`}
                            title={m.isRegistered ? 'Registered on website' : 'Not registered on website'}
                          >
                            {m.isRegistered ? <UserCheck className="w-2.5 h-2.5" /> : <UserX className="w-2.5 h-2.5" />}
                            <span>{m.isRegistered ? 'Registered' : 'Guest'}</span>
                          </span>
                        </div>

                        {/* Email */}
                        <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 truncate" title={email}>
                            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Privilege Toggles: isRestricted */}
                      <div className="mt-3 pt-2.5 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 space-y-1.5 text-[11px]">

                        {/* Restricted Status Switch */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">Restricted</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePrivilege(m, 'isRestricted')}
                            className={`p-1 rounded-md transition cursor-pointer flex items-center gap-1 font-bold text-[10px] ${m.isRestricted ? 'text-rose-600' : 'text-slate-400'
                              }`}
                          >
                            {m.isRestricted ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EXECUTIVES (CURRENT ROSTER & PREVIOUS EXECUTIVE TEAMS)            */}
        {/* ========================================================================= */}
        {activeTab === 'executives' && (
          <div className="space-y-8">
            {/* Section A: Current Executive Team */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#1C244C]/10 dark:border-[#53afd0]/20 pb-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#1C244C] dark:text-[#F6F6F6] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                    <span>Current Executive Team</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    UCDS executive officers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {currentRoster.map((off) => {
                  return (
                    <div
                      key={off.key}
                      className="exec-card flex flex-col justify-between p-3.5 hover:border-[#0075A2] dark:hover:border-[#53afd0] transition-all rounded-xl"
                    >
                      <div className="space-y-2">
                        {/* Role Header */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <h3 className="font-extrabold text-xs text-[#0075A2] dark:text-[#53afd0]">
                              {off.roleTitle}
                            </h3>
                            <div className="font-bold text-xs text-[#1C244C] dark:text-[#F6F6F6] mt-0.5">
                              {off.name || 'Unassigned Officer'}
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${off.isRegisteredUser
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                              }`}
                            title={off.isRegisteredUser ? 'Synced with verified @ucalgary.ca profile' : 'Unregistered Email'}
                          >
                            {off.isRegisteredUser ? <UserCheck className="w-2.5 h-2.5" /> : <UserX className="w-2.5 h-2.5" />}
                            <span>{off.isRegisteredUser ? 'Verified' : 'Manual'}</span>
                          </span>
                        </div>

                        {/* Email */}
                        <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5 truncate" title={off.email}>
                            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{off.email || 'No email specified'}</span>
                          </div>
                        </div>

                        {/* Bio snippet */}
                        {off.bio && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic pt-0.5">
                            &quot;{off.bio}&quot;
                          </p>
                        )}
                      </div>

                      {/* Action Tools */}
                      <div className="mt-3 pt-2.5 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenCurrentExecModal(off)}
                          className="btn-exec-return text-[11px] py-1 px-2.5 flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit Details</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Previous Executive Teams */}
            <div className="space-y-4 pt-4 border-t border-[#1C244C]/10 dark:border-[#53afd0]/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#1C244C] dark:text-[#F6F6F6] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                    <span>Historical Executive Teams</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Archives of past executive administrations by academic year.
                  </p>
                </div>
              </div>

              {prevYears.length === 0 ? (
                <div className="exec-card p-8 text-center text-slate-400">
                  <Clock className="w-7 h-7 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">No historical executive teams recorded yet.</p>
                  <button
                    type="button"
                    onClick={() => setIsYearModalOpen(true)}
                    className="btn-exec-primary mt-3 text-xs py-1.5 px-3"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add First Past Year</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {prevYears.map((yearDoc) => {
                    const isExpanded = expandedYear === yearDoc.id;
                    const officersList = Object.entries(yearDoc.executives || {});

                    return (
                      <div
                        key={yearDoc.id}
                        className="exec-card p-4 rounded-xl border border-[#1C244C]/15 dark:border-[#53afd0]/20 space-y-3"
                      >
                        {/* Year Card Header Accordion */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setExpandedYear(isExpanded ? null : yearDoc.id)}
                            className="flex items-center gap-2 font-black text-sm text-[#1C244C] dark:text-[#F6F6F6] cursor-pointer hover:text-[#0075A2] dark:hover:text-[#53afd0] transition"
                          >
                            <Calendar className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                            <span>Executive Team {yearDoc.id}</span>
                            <span className="text-xs font-normal text-slate-400">
                              ({officersList.length} officers)
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPrevOfficerModal(yearDoc.id)}
                              className="btn-exec-return text-xs py-1 px-2.5"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Officer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTargetYearId(yearDoc.id);
                                setDeleteConfirmType('year');
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                              title={`Delete ${yearDoc.id} Record`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Officers Grid */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 animate-viewFadeIn">
                            {officersList.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">
                                No officers added for this year yet. Click &quot;Add Officer&quot; to populate.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                {officersList.map(([roleKey, off]) => {
                                  const fullName = off.name || `${off['name-first'] || ''} ${off['name-last'] || ''}`.trim() || 'Officer';
                                  return (
                                    <div
                                      key={roleKey}
                                      className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start justify-between gap-2 text-xs"
                                    >
                                      <div className="space-y-0.5">
                                        <div className="font-extrabold text-[#0075A2] dark:text-[#53afd0]">
                                          {off.role || roleKey.replace(/-/g, ' ')}
                                        </div>
                                        <div className="font-bold text-slate-800 dark:text-slate-200">
                                          {fullName}
                                        </div>
                                        {off.email && (
                                          <div className="text-[11px] text-slate-500 truncate" title={off.email}>
                                            {off.email}
                                          </div>
                                        )}
                                        {off.bio && (
                                          <div className="text-[10.5px] text-slate-400 italic line-clamp-2 pt-0.5">
                                            &quot;{off.bio}&quot;
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenPrevOfficerModal(yearDoc.id, roleKey)}
                                          className="p-1 rounded-md text-[#0075A2] dark:text-[#53afd0] hover:bg-black/5"
                                          title="Edit Officer"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDeleteTargetYearId(yearDoc.id);
                                            setDeleteTargetOfficerKey(roleKey);
                                            setDeleteConfirmType('prevOfficer');
                                          }}
                                          className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10"
                                          title="Remove Officer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: EDIT CURRENT EXECUTIVE OFFICER                                  */}
        {/* ========================================================================= */}
        {isCurrentExecModalOpen &&
          editingCurrentOfficer &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-hidden animate-viewFadeIn">
              <div className="exec-card max-w-lg w-full p-5 sm:p-6 shadow-2xl relative animate-scaleIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#1C244C]/10 dark:border-[#53afd0]/15 mb-4">
                  <h3 className="font-extrabold text-sm text-[#1C244C] dark:text-[#F6F6F6] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                    <span>Edit Current Officer: {editingCurrentOfficer.roleTitle}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCurrentExecModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveCurrentOfficer} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Role Title
                    </label>
                    <input
                      type="text"
                      value={currentRoleTitle}
                      onChange={(e) => setCurrentRoleTitle(e.target.value)}
                      className="exec-input text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Officer UCalgary Email (matches registered user)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. michael.wang2@ucalgary.ca"
                      value={currentOfficerEmail}
                      onChange={(e) => setCurrentOfficerEmail(e.target.value)}
                      className="exec-input text-xs"
                    />
                  </div>

                  {!editingCurrentOfficer.isRegisteredUser && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={currentOfficerFirstName}
                          onChange={(e) => setCurrentOfficerFirstName(e.target.value)}
                          className="exec-input text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={currentOfficerLastName}
                          onChange={(e) => setCurrentOfficerLastName(e.target.value)}
                          className="exec-input text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Biography
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Public executive biography and background..."
                      value={currentOfficerBio}
                      onChange={(e) => setCurrentOfficerBio(e.target.value)}
                      className="exec-input text-xs"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCurrentExecModalOpen(false)}
                      className="btn-exec-return text-xs py-1.5 px-3"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-exec-primary text-xs py-1.5 px-4">
                      Save Officer
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* MODAL 2: ADD PAST YEAR RECORD                                            */}
        {/* ========================================================================= */}
        {isYearModalOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-hidden animate-viewFadeIn">
              <div className="exec-card max-w-sm w-full p-5 shadow-2xl relative animate-scaleIn">
                <div className="flex items-center justify-between pb-2 border-b border-[#1C244C]/10 dark:border-[#53afd0]/15 mb-3">
                  <h3 className="font-extrabold text-sm text-[#1C244C] dark:text-[#F6F6F6]">
                    Add Past Executive Year
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsYearModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveYearDoc} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Academic Year (e.g. 2024-2025)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2024-2025"
                      value={newYearInput}
                      onChange={(e) => setNewYearInput(e.target.value)}
                      className="exec-input text-xs"
                      pattern="^\d{4}-\d{4}$"
                      title="Format: YYYY-YYYY (e.g. 2024-2025)"
                      required
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsYearModalOpen(false)}
                      className="btn-exec-return text-xs py-1.5 px-3"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-exec-primary text-xs py-1.5 px-4">
                      Create Year
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* MODAL 3: ADD/EDIT OFFICER IN PREVIOUS YEAR                               */}
        {/* ========================================================================= */}
        {isPrevOfficerModalOpen &&
          selectedYearId &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-hidden animate-viewFadeIn">
              <div className="exec-card max-w-md w-full p-5 shadow-2xl relative animate-scaleIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#1C244C]/10 dark:border-[#53afd0]/15 mb-3">
                  <h3 className="font-extrabold text-sm text-[#1C244C] dark:text-[#F6F6F6]">
                    {editingPrevOfficerKey ? 'Edit Officer' : 'Add Officer'} ({selectedYearId})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsPrevOfficerModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSavePrevOfficer} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Role Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vice-President Finance, Director of Equity"
                      value={prevRoleInput}
                      onChange={(e) => setPrevRoleInput(e.target.value)}
                      className="exec-input text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={prevOfficerFirstName}
                        onChange={(e) => setPrevOfficerFirstName(e.target.value)}
                        className="exec-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={prevOfficerLastName}
                        onChange={(e) => setPrevOfficerLastName(e.target.value)}
                        className="exec-input text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="officer@example.com"
                      value={prevOfficerEmail}
                      onChange={(e) => setPrevOfficerEmail(e.target.value)}
                      className="exec-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bio / Achievements
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional notes or achievements..."
                      value={prevOfficerBio}
                      onChange={(e) => setPrevOfficerBio(e.target.value)}
                      className="exec-input text-xs"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPrevOfficerModalOpen(false)}
                      className="btn-exec-return text-xs py-1.5 px-3"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-exec-primary text-xs py-1.5 px-4">
                      Save Officer
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* DELETE CONFIRMATION DIALOG                                               */}
        {/* ========================================================================= */}
        {deleteConfirmType &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-viewFadeIn">
              <div className="exec-card max-w-sm w-full p-5 text-center space-y-4 shadow-2xl animate-scaleIn">
                <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-bold text-base text-[#1C244C] dark:text-[#F6F6F6]">
                    {deleteConfirmType === 'year' ? 'Delete Historical Year Record?' : 'Remove Officer?'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {deleteConfirmType === 'year'
                      ? `Are you sure you want to delete the entire executive record for ${deleteTargetYearId}?`
                      : `Are you sure you want to remove this officer from ${deleteTargetYearId}?`}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmType(null);
                      setDeleteTargetYearId(null);
                      setDeleteTargetOfficerKey(null);
                    }}
                    className="btn-exec-return text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition shadow-md cursor-pointer"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </ExecutiveLayout>
  );
};
