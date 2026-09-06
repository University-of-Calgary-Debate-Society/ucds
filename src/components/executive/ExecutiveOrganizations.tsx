import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  Mail,
  MapPin,
  Clock,
  Check,
  X,
  ExternalLink,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import { ExecutiveLayout } from './ExecutiveLayout';
import { CustomSelect } from '@/components/common/CustomSelect';
import { FloatingAlert } from '@/components/common/FloatingAlert';
import { COUNTRIES, getCountryFlag } from '@/utils/countries';
import {
  fetchAllOrganizations,
  saveOrganization,
  deleteOrganization,
  sanitizeExecRoleKey,
  sanitizeLinkKey,
  type OrganizationDoc,
} from '@/services/organizationService';

const AVAILABLE_FORMATS = ['BP', 'CNDF', 'CP', 'Worlds', 'Australs'] as const;
const PREPARED_TYPES = ['club', 'university', 'college', 'governing body', 'highschool', 'academy'];
const CUSID_REGIONS = [
  { value: 'east', label: 'East' },
  { value: 'central', label: 'Central' },
  { value: 'west', label: 'West' },
];

export const ExecutiveOrganizations: React.FC = () => {
  const [organizations, setOrganizations] = useState<OrganizationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');

  // Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrganizationDoc | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameAffiliated, setNameAffiliated] = useState('');
  const [nameAbbreviation, setNameAbbreviation] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState('');

  // Location
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postcode, setPostcode] = useState('');
  const [cusidRegion, setCusidRegion] = useState('');

  // Formats & Types
  const [formats, setFormats] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [email, setEmail] = useState('');
  const [emailFinance, setEmailFinance] = useState('');
  const [types, setTypes] = useState<string[]>(['club']);
  const [customType, setCustomType] = useState('');

  // Links Map
  const [links, setLinks] = useState<Record<string, string>>({});
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);

  // Executives Map
  const [executives, setExecutives] = useState<
    Record<string, { 'name-first'?: string; 'name-last'?: string; name?: string; email?: string; rawRole?: string }>
  >({});
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [editingExecKey, setEditingExecKey] = useState<string | null>(null);
  const [execRoleInput, setExecRoleInput] = useState('');
  const [execFirstName, setExecFirstName] = useState('');
  const [execLastName, setExecLastName] = useState('');
  const [execEmail, setExecEmail] = useState('');

  // Lock background scrolling when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isEditorOpen || execModalOpen || isDeleteConfirmOpen;
    if (isAnyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isEditorOpen, execModalOpen, isDeleteConfirmOpen]);

  // Load organizations
  const loadData = (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    fetchAllOrganizations(forceRefresh)
      .then((data) => {
        setOrganizations(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error('Failed to load organizations from Firestore:', err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Failed to load organizations from Firestore.';
        setError(errorMsg);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format date helper
  const formatLastUpdated = (time: unknown) => {
    if (!time) return 'Recently';
    if (typeof time === 'object' && time !== null && 'seconds' in (time as { seconds: number })) {
      const d = new Date((time as { seconds: number }).seconds * 1000);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (typeof time === 'string') {
      const d = new Date(time);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    return 'Recently';
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingDocId(null);
    setName('');
    setNameAffiliated('');
    setNameAbbreviation('');
    setAliases([]);
    setCountry('');
    setAddress('');
    setCity('');
    setProvince('');
    setPostcode('');
    setCusidRegion('');
    setFormats([]);
    setIsOnline(false);
    setEmail('');
    setEmailFinance('');
    setTypes(['club']);
    setLinks({});
    setExecutives({});
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (org: OrganizationDoc) => {
    setEditingDocId(org.id);
    setName(org.name || '');
    setNameAffiliated(org['name-affiliated'] || '');
    setNameAbbreviation(org['name-abbreviation'] || org['name-abbreviated'] || '');
    setAliases(Array.isArray(org['name-aliases']) ? org['name-aliases'] : []);
    setCountry(org.location?.country || '');
    setAddress(org.location?.address || '');
    setCity(org.location?.city || '');
    setProvince(org.location?.province || '');
    setPostcode(org.location?.postcode || '');
    setCusidRegion(org.location?.cusidregion || '');
    setFormats(Array.isArray(org.formats) ? org.formats : []);
    setIsOnline(Boolean(org.isOnline));
    setEmail(org.email || '');
    setEmailFinance(org['email-finance'] || org.email || '');
    setTypes(Array.isArray(org.type) && org.type.length > 0 ? org.type : ['club']);
    setLinks(typeof org.links === 'object' && org.links !== null ? org.links : {});
    setExecutives(typeof org.executives === 'object' && org.executives !== null ? org.executives : {});
    setIsEditorOpen(true);
  };

  // Aliases handlers
  const handleAddAlias = () => {
    const trimmed = newAlias.trim();
    if (trimmed && !aliases.includes(trimmed)) {
      setAliases((prev) => [...prev, trimmed]);
      setNewAlias('');
    }
  };

  const handleRemoveAlias = (a: string) => {
    setAliases((prev) => prev.filter((item) => item !== a));
  };

  // Formats toggle
  const toggleFormat = (fmt: string) => {
    const lower = fmt.toLowerCase();
    setFormats((prev) =>
      prev.includes(lower) ? prev.filter((f) => f !== lower) : [...prev, lower]
    );
  };

  // Types handlers
  const toggleType = (t: string) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]));
  };

  const handleAddCustomType = () => {
    const trimmed = customType.trim().toLowerCase();
    if (trimmed && !types.includes(trimmed)) {
      setTypes((prev) => [...prev, trimmed]);
      setCustomType('');
    }
  };

  // Links handlers
  const handleAddLink = () => {
    const nameClean = newLinkName.trim();
    const urlClean = newLinkUrl.trim();
    if (!nameClean || !urlClean) return;

    const sanitizedKey = sanitizeLinkKey(nameClean);
    setLinks((prev) => ({
      ...prev,
      [sanitizedKey]: urlClean,
    }));
    setNewLinkName('');
    setNewLinkUrl('');
    setIsAddingLink(false);
  };

  const handleRemoveLink = (key: string) => {
    setLinks((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Executives handlers
  const handleOpenExecModal = (key?: string) => {
    if (key && executives[key]) {
      setEditingExecKey(key);
      const ex = executives[key];
      setExecRoleInput(key.replace(/-/g, ' '));
      setExecFirstName(ex['name-first'] || ex.name?.split(' ')[0] || '');
      setExecLastName(ex['name-last'] || ex.name?.split(' ').slice(1).join(' ') || '');
      setExecEmail(ex.email || '');
    } else {
      setEditingExecKey(null);
      setExecRoleInput('');
      setExecFirstName('');
      setExecLastName('');
      setExecEmail('');
    }
    setExecModalOpen(true);
  };

  const handleSaveExec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!execRoleInput.trim()) return;

    const existingKeys = Object.keys(executives).filter((k) => k !== editingExecKey);
    const sanitizedKey = editingExecKey || sanitizeExecRoleKey(execRoleInput, existingKeys);

    setExecutives((prev) => ({
      ...prev,
      [sanitizedKey]: {
        'name-first': execFirstName.trim() || undefined,
        'name-last': execLastName.trim() || undefined,
        email: execEmail.trim() || undefined,
      },
    }));

    setExecModalOpen(false);
  };

  const handleRemoveExec = (key: string) => {
    setExecutives((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Save Organization
  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Organization name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const orgData: Partial<OrganizationDoc> = {
        name: name.trim(),
        'name-affiliated': nameAffiliated.trim() || undefined,
        'name-abbreviation': nameAbbreviation.trim() || undefined,
        'name-aliases': aliases.length > 0 ? aliases : undefined,
        location:
          country || city || province || address || postcode
            ? {
              country: country || undefined,
              city: city || undefined,
              province: province || undefined,
              address: address || undefined,
              postcode: postcode || undefined,
              cusidregion:
                  country.toLowerCase() === 'canada' && cusidRegion ? cusidRegion : undefined,
            }
            : undefined,
        formats: formats.length > 0 ? formats : undefined,
        isOnline,
        email: email.trim() || undefined,
        'email-finance': (emailFinance.trim() || email.trim()) || undefined,
        type: types.length > 0 ? types : undefined,
        links: Object.keys(links).length > 0 ? links : undefined,
        executives: Object.keys(executives).length > 0 ? executives : undefined,
      };

      await saveOrganization(orgData, !editingDocId, editingDocId || undefined);
      setSuccess(
        editingDocId
          ? `Updated organization "${name}" successfully!`
          : `Created organization "${name}" successfully!`
      );
      setIsEditorOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error('Failed to save organization:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save organization.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Organization
  const handleConfirmDelete = async () => {
    if (!orgToDelete) return;

    try {
      await deleteOrganization(orgToDelete.id);
      setSuccess(`Deleted "${orgToDelete.name}" from Organizations.`);
      setIsDeleteConfirmOpen(false);
      setOrgToDelete(null);
      loadData();
    } catch (err: unknown) {
      console.error('Failed to delete organization:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete organization.';
      setError(msg);
    }
  };

  // Countries for dropdown
  const countryOptions = useMemo(() => {
    return [
      { value: 'all', label: '🌐 All Countries' },
      ...COUNTRIES.map((c) => ({ value: c, label: `${getCountryFlag(c)}  ${c}` })),
    ];
  }, []);

  const editorCountryOptions = useMemo(() => {
    return [
      { value: '', label: 'Select Country...' },
      ...COUNTRIES.map((c) => ({ value: c, label: `${getCountryFlag(c)}  ${c}` })),
    ];
  }, []);

  // Filtered organizations
  const filteredOrganizations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return organizations.filter((org) => {
      if (selectedCountry !== 'all') {
        const orgCountry = (org.location?.country || '').toLowerCase();
        if (orgCountry !== selectedCountry.toLowerCase()) {
          return false;
        }
      }

      if (!q) return true;

      const n = (org.name || '').toLowerCase();
      const abbrev = (org['name-abbreviation'] || org['name-abbreviated'] || '').toLowerCase();
      const affiliated = (org['name-affiliated'] || '').toLowerCase();
      const c = (org.location?.city || '').toLowerCase();
      const co = (org.location?.country || '').toLowerCase();
      const em = (org.email || '').toLowerCase();

      return (
        n.includes(q) ||
        abbrev.includes(q) ||
        affiliated.includes(q) ||
        c.includes(q) ||
        co.includes(q) ||
        em.includes(q)
      );
    });
  }, [organizations, searchQuery, selectedCountry]);

  return (
    <ExecutiveLayout activeSection="organizations">
      {/* Unified Floating Top Toast Notifications */}
      <FloatingAlert
        message={error}
        type="error"
        onDismiss={() => setError(null)}
        duration={5000}
      />
      <FloatingAlert
        message={success}
        type="success"
        onDismiss={() => setSuccess(null)}
        duration={5000}
      />

      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] tracking-tight">
              Organizations Directory
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
              Manage debate clubs, institutions, and governing authorities in the global Organizations collection ({organizations.length} total).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              className="p-2 rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-[#0075A2] dark:hover:text-[#53afd0] transition shadow-sm cursor-pointer"
              title="Refresh organizations from Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0075A2]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-exec-primary py-2 px-3.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Organization</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search by club name, abbreviation, city, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="exec-input exec-search-input !pl-10 text-xs"
              />
            </div>
          </div>

          <div className="w-56">
            <CustomSelect
              value={selectedCountry}
              onChange={(val) => setSelectedCountry(val)}
              options={countryOptions}
              searchable
              searchPlaceholder="Filter country..."
            />
          </div>
        </div>

        {/* Organizations Compact Card Grid */}
        {loading ? (
          <div className="exec-card p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
            Loading organizations directory from Firestore...
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="exec-card p-12 text-center text-slate-400">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">No organizations found matching your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredOrganizations.map((org) => {
              const orgFormats = Array.isArray(org.formats) ? org.formats : [];
              return (
                <div
                  key={org.id}
                  className="exec-card flex flex-col justify-between p-3.5 hover:border-[#0075A2] dark:hover:border-[#53afd0] transition-all duration-200 group rounded-xl"
                >
                  <div className="space-y-1.5">
                    {/* Header: Flag + Name & Abbreviation */}
                    <div className="flex items-start justify-between gap-1.5">
                      <h3
                        className="font-extrabold text-xs text-[#1C244C] dark:text-[#F6F6F6] group-hover:text-[#0075A2] dark:group-hover:text-[#53afd0] transition-colors leading-snug flex items-center gap-1.5 line-clamp-2"
                        title={org.name}
                      >
                        <span
                          className="text-base leading-none select-none flex-shrink-0 cursor-default"
                          title={org.location?.country || 'Country Unspecified'}
                        >
                          {getCountryFlag(org.location?.country)}
                        </span>
                        <span>{org.name}</span>
                      </h3>
                      {org['name-abbreviation'] && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1C244C]/5 dark:bg-[#53afd0]/15 text-[#1C244C] dark:text-[#53afd0] flex-shrink-0">
                          {org['name-abbreviation']}
                        </span>
                      )}
                    </div>

                    {org['name-affiliated'] && (
                      <div
                        className="text-[10.5px] font-medium text-[#0075A2] dark:text-[#53afd0] truncate"
                        title={org['name-affiliated']}
                      >
                        {org['name-affiliated']}
                      </div>
                    )}

                    {/* Compact Metadata Details */}
                    <div className="space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      {org.location?.country && (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">
                            {org.location.city ? `${org.location.city}, ` : ''}
                            {org.location.province ? `${org.location.province}, ` : ''}
                            {org.location.country}
                            {org.location.cusidregion ? ` (${org.location.cusidregion.toUpperCase()})` : ''}
                          </span>
                        </div>
                      )}

                      {org.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{org.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Formats and Online Tag */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {org.isOnline && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          Online
                        </span>
                      )}
                      {orgFormats.map((f) => (
                        <span
                          key={f}
                          className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#0075A2]/10 text-[#0075A2] dark:bg-[#53afd0]/15 dark:text-[#53afd0]"
                        >
                          {f.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer: Timestamp & Actions */}
                  <div className="mt-2.5 pt-2 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1 text-slate-400 truncate">
                      <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{formatLastUpdated(org['time-updated'])}</span>
                    </div>

                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(org)}
                        className="p-1 rounded-md hover:bg-[#1C244C]/10 dark:hover:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] transition cursor-pointer"
                        title="Edit Organization"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOrgToDelete(org);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="p-1 rounded-md hover:bg-rose-500/10 text-rose-500 transition cursor-pointer"
                        title="Delete Organization"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Organization Create / Edit Modal (Rendered via React Portal with Static Viewport Centering) */}
        {isEditorOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-hidden animate-viewFadeIn">
              <div className="exec-card max-w-2xl w-full max-h-[88vh] flex flex-col p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-scaleIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#1C244C]/10 dark:border-[#53afd0]/15 mb-4 flex-shrink-0">
                  <h2 className="text-base sm:text-lg font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#0075A2] dark:text-[#53afd0]" />
                    <span>{editingDocId ? 'Edit Organization' : 'Create New Organization'}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveOrganization} className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
                  {/* 1. Core Identity */}
                  <div className="space-y-2.5">
                    <h3 className="font-extrabold text-[#0075A2] dark:text-[#53afd0] text-xs uppercase tracking-wider">
                      1. General Information
                    </h3>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Organization Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. University of Calgary Debate Society"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="exec-input text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Affiliated Institution
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. University of Calgary"
                          value={nameAffiliated}
                          onChange={(e) => setNameAffiliated(e.target.value)}
                          className="exec-input text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Abbreviation
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. UCDS"
                          value={nameAbbreviation}
                          onChange={(e) => setNameAbbreviation(e.target.value)}
                          className="exec-input text-xs"
                        />
                      </div>
                    </div>

                    {/* Aliases */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Organization Aliases
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Type alias and click add..."
                          value={newAlias}
                          onChange={(e) => setNewAlias(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddAlias();
                            }
                          }}
                          className="exec-input text-xs flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleAddAlias}
                          className="btn-exec-return text-xs py-1.5 px-3"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>

                      {aliases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {aliases.map((a) => (
                            <span
                              key={a}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1C244C]/10 dark:bg-[#53afd0]/15 text-[#1C244C] dark:text-[#53afd0] text-[10px] font-semibold"
                            >
                              <span>{a}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAlias(a)}
                                className="hover:text-rose-500 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Location */}
                  <div className="space-y-2.5 pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15">
                    <h3 className="font-extrabold text-[#0075A2] dark:text-[#53afd0] text-xs uppercase tracking-wider">
                      2. Location Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Country
                        </label>
                        <CustomSelect
                          value={country}
                          onChange={(val) => setCountry(val)}
                          options={editorCountryOptions}
                          searchable
                          searchPlaceholder="Search countries..."
                          placeholder="Select Country..."
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Calgary"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="exec-input text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Province / State
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Alberta"
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="exec-input text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Street Address
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 2500 University Dr NW"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="exec-input text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. T2N 1N4"
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value)}
                          className="exec-input text-xs"
                        />
                      </div>
                    </div>

                    {/* CUSID Region: Only available if Country is Canada */}
                    {country.toLowerCase() === 'canada' && (
                      <div className="p-2.5 rounded-xl bg-[#0075A2]/5 dark:bg-[#53afd0]/10 border border-[#0075A2]/20 animate-viewFadeIn">
                        <label className="block font-bold text-[#0075A2] dark:text-[#53afd0] mb-1">
                          CUSID Region (Canada Only)
                        </label>
                        <CustomSelect
                          value={cusidRegion}
                          onChange={(val) => setCusidRegion(val)}
                          options={[
                            { value: '', label: 'None / Not Assigned' },
                            ...CUSID_REGIONS,
                          ]}
                          placeholder="Select CUSID Region..."
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Formats & Online Toggle */}
                  <div className="space-y-2.5 pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15">
                    <h3 className="font-extrabold text-[#0075A2] dark:text-[#53afd0] text-xs uppercase tracking-wider">
                      3. Debate Formats & Online Presence
                    </h3>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Debate Formats (Saved as lowercase)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_FORMATS.map((fmt) => {
                          const isSelected = formats.includes(fmt.toLowerCase());
                          return (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => toggleFormat(fmt)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-[#0075A2] text-white dark:bg-[#53afd0] dark:text-[#15162C]'
                                  : 'bg-[#1C244C]/5 dark:bg-[#53afd0]/10 text-slate-600 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{fmt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">Online Club (isOnline)</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Toggle if this society operates primarily online / remotely.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOnline((prev) => !prev)}
                        className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 font-bold ${
                          isOnline
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {isOnline ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                      </button>
                    </div>
                  </div>

                  {/* 4. Contact & Organization Type */}
                  <div className="space-y-2.5 pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15">
                    <h3 className="font-extrabold text-[#0075A2] dark:text-[#53afd0] text-xs uppercase tracking-wider">
                      4. Contact & Classification
                    </h3>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Main Contact Email
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. debate@ucds.ca"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="exec-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Finance / Billing Email (email-finance)
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. finance@ucds.ca (defaults to main contact email if empty)"
                        value={emailFinance}
                        onChange={(e) => setEmailFinance(e.target.value)}
                        className="exec-input text-xs"
                      />
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Used for invoicing tournament fees, dues, and ledger auto-resolution.
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Classification Types
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {PREPARED_TYPES.map((t) => {
                          const isSelected = types.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => toggleType(t)}
                              className={`px-2 py-0.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                                isSelected
                                  ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2]'
                                  : 'bg-[#1C244C]/5 dark:bg-[#53afd0]/10 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Add custom type..."
                          value={customType}
                          onChange={(e) => setCustomType(e.target.value)}
                          className="exec-input text-xs flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomType}
                          className="btn-exec-return text-xs py-1.5 px-3"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5. Links Manager */}
                  <div className="space-y-2.5 pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-[#0075A2] dark:text-[#53afd0] text-xs uppercase tracking-wider">
                        5. External Links ({Object.keys(links).length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsAddingLink((prev) => !prev)}
                        className="btn-exec-return text-xs py-1 px-2.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Link</span>
                      </button>
                    </div>

                    {/* Add Link Sub-card */}
                    {isAddingLink && (
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 space-y-2 animate-viewFadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Link Name (e.g. Discord, Website)"
                            value={newLinkName}
                            onChange={(e) => setNewLinkName(e.target.value)}
                            className="exec-input text-xs"
                          />
                          <input
                            type="url"
                            placeholder="URL (e.g. https://discord.gg/...)"
                            value={newLinkUrl}
                            onChange={(e) => setNewLinkUrl(e.target.value)}
                            className="exec-input text-xs"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingLink(false)}
                            className="text-xs text-slate-500 hover:underline cursor-pointer px-2"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddLink}
                            className="btn-exec-primary text-xs py-1 px-3"
                          >
                            Save Link
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Links Buttons Display */}
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(links).length === 0 ? (
                        <span className="text-slate-400 italic">No external links attached.</span>
                      ) : (
                        Object.entries(links).map(([k, url]) => (
                          <div
                            key={k}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#1C244C]/15 dark:border-[#53afd0]/30 shadow-sm"
                          >
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold capitalize text-[#0075A2] dark:text-[#53afd0] hover:underline flex items-center gap-1 text-xs"
                            >
                              <span>{k.replace(/-/g, ' ')}</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(k)}
                              className="text-slate-400 hover:text-rose-500 transition ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 6. Executives Manager */}
                  <div className="space-y-2.5 pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-[#0075A2] dark:text-[#53afd0] text-xs uppercase tracking-wider">
                        6. Executive Officers ({Object.keys(executives).length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleOpenExecModal()}
                        className="btn-exec-return text-xs py-1 px-2.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Officer</span>
                      </button>
                    </div>

                    {/* Executives List */}
                    <div className="space-y-1.5">
                      {Object.keys(executives).length === 0 ? (
                        <span className="text-slate-400 italic">No executive officers listed.</span>
                      ) : (
                        Object.entries(executives).map(([roleKey, ex]) => {
                          const fullName =
                            ex['name-first'] || ex['name-last']
                              ? `${ex['name-first'] || ''} ${ex['name-last'] || ''}`.trim()
                              : ex.name || 'Unnamed Officer';

                          return (
                            <div
                              key={roleKey}
                              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="font-bold text-xs capitalize text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  <span>{roleKey.replace(/-/g, ' ')}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">({roleKey})</span>
                                </div>
                                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {fullName} {ex.email ? `• ${ex.email}` : ''}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenExecModal(roleKey)}
                                  className="p-1 rounded-md text-[#0075A2] dark:text-[#53afd0] hover:bg-black/5"
                                  title="Edit Officer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExec(roleKey)}
                                  className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10"
                                  title="Remove Officer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Submit & Cancel */}
                  <div className="pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-end gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(false)}
                      className="btn-exec-return text-xs py-2 px-3"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-exec-primary text-xs py-2 px-4"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Save Organization'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* Executive Officer Sub-modal */}
        {execModalOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-viewFadeIn">
              <div className="exec-card max-w-md w-full p-5 space-y-3 shadow-2xl animate-scaleIn">
                <h3 className="font-bold text-sm text-[#1C244C] dark:text-[#F6F6F6]">
                  {editingExecKey ? 'Edit Executive Officer' : 'Add Executive Officer'}
                </h3>

                <form onSubmit={handleSaveExec} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Role Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Director of Debate, President, VP Finance"
                      value={execRoleInput}
                      onChange={(e) => setExecRoleInput(e.target.value)}
                      className="exec-input text-xs"
                      required
                    />
                    <span className="text-[10px] text-slate-400">
                      Auto-sanitized to lowercase, &quot;of&quot; removed, hyphenated.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={execFirstName}
                        onChange={(e) => setExecFirstName(e.target.value)}
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
                        value={execLastName}
                        onChange={(e) => setExecLastName(e.target.value)}
                        className="exec-input text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Officer Email
                    </label>
                    <input
                      type="email"
                      placeholder="officer@example.com"
                      value={execEmail}
                      onChange={(e) => setExecEmail(e.target.value)}
                      className="exec-input text-xs"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setExecModalOpen(false)}
                      className="btn-exec-return text-xs py-1.5 px-3"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn-exec-primary text-xs py-1.5 px-3">
                      Save Officer
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}

        {/* Delete Confirmation Dialog */}
        {isDeleteConfirmOpen &&
          orgToDelete &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden animate-viewFadeIn">
              <div className="exec-card max-w-sm w-full p-5 text-center space-y-4 shadow-2xl animate-scaleIn">
                <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-bold text-base text-[#1C244C] dark:text-[#F6F6F6]">
                    Delete Organization?
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Are you sure you want to permanently delete <strong>{orgToDelete.name}</strong> from the Organizations directory?
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteConfirmOpen(false);
                      setOrgToDelete(null);
                    }}
                    className="btn-exec-return text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition shadow-md cursor-pointer"
                  >
                    Delete Organization
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
