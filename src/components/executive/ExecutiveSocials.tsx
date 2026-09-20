import React, { useState, useEffect } from 'react';
import {
  Share2,
  Plus,
  Trash2,
  ExternalLink,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Globe,
  Link as LinkIcon,
} from 'lucide-react';
import { ExecutiveLayout } from './ExecutiveLayout';
import { getUcdsOrganization } from '@/services/userService';
import { updateUcdsSocialLinks, type OtherLinkItem } from '@/services/organizationService';
import { LoadingScreen } from '@/components/common';

const CANONICAL_KEYS = [
  { key: 'discord', label: 'Discord Community', placeholder: 'https://discord.gg/...' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'linktree', label: 'Linktree', placeholder: 'https://linktr.ee/...' },
];

export const ExecutiveSocials: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Social Links state (Record<string, string>)
  const [links, setLinks] = useState<Record<string, string>>({});

  // Other Links state (Array for easy editing, saved as map "0", "1", ...)
  const [otherLinks, setOtherLinks] = useState<OtherLinkItem[]>([]);

  // New Link Inputs
  const [newKey, setNewKey] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // New Other Link Inputs
  const [newOtherName, setNewOtherName] = useState('');
  const [newOtherUrl, setNewOtherUrl] = useState('');
  const [newOtherDesc, setNewOtherDesc] = useState('');

  // Load initial data from Firestore Organizations collection
  const loadData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const doc = await getUcdsOrganization(force);
      if (doc) {
        // Load canonical & custom social links
        const rawLinks: Record<string, string> = {};
        if (doc.links) {
          Object.entries(doc.links).forEach(([k, v]) => {
            if (typeof v === 'string') rawLinks[k.toLowerCase()] = v;
          });
        }
        setLinks(rawLinks);

        // Load links-other nested map
        const rawOther: OtherLinkItem[] = [];
        if (doc['links-other']) {
          // Sort keys numerically if possible
          const sortedEntries = Object.entries(doc['links-other']).sort((a, b) => {
            const numA = parseInt(a[0], 10);
            const numB = parseInt(b[0], 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a[0].localeCompare(b[0]);
          });

          sortedEntries.forEach(([, val]) => {
            if (val && typeof val === 'object') {
              rawOther.push({
                name: val.name || '',
                link: val.link || '',
                description: val.description || '',
              });
            }
          });
        }
        setOtherLinks(rawOther);
      }
    } catch (err: unknown) {
      console.error('Failed to load UCDS organization data:', err);
      setError('Could not load social media data from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update specific social link
  const handleLinkChange = (key: string, url: string) => {
    setLinks((prev) => ({
      ...prev,
      [key.toLowerCase()]: url,
    }));
  };

  // Remove a social link
  const handleRemoveLink = (key: string) => {
    setLinks((prev) => {
      const copy = { ...prev };
      delete copy[key.toLowerCase()];
      return copy;
    });
  };

  // Add a new custom social link
  const handleAddCustomLink = () => {
    const cleanKey = newKey.trim().toLowerCase();
    const cleanUrl = newUrl.trim();
    if (!cleanKey || !cleanUrl) {
      setError('Please provide both a platform name and URL.');
      return;
    }
    setLinks((prev) => ({
      ...prev,
      [cleanKey]: cleanUrl,
    }));
    setNewKey('');
    setNewUrl('');
    setError(null);
  };

  // Update an Other Link item
  const handleOtherLinkChange = (index: number, field: keyof OtherLinkItem, val: string) => {
    setOtherLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Remove an Other Link item
  const handleRemoveOtherLink = (index: number) => {
    setOtherLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // Add a new Other Link
  const handleAddOtherLink = () => {
    const name = newOtherName.trim();
    const link = newOtherUrl.trim();
    const description = newOtherDesc.trim();

    if (!name || !link) {
      setError('Please provide at least a link name and URL for Other Links.');
      return;
    }

    setOtherLinks((prev) => [...prev, { name, link, description }]);
    setNewOtherName('');
    setNewOtherUrl('');
    setNewOtherDesc('');
    setError(null);
  };

  // Save all links to Firestore document university-of-calgary-debate-society
  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Map other links into indexed map {"0": ..., "1": ...}
      const linksOtherMap: Record<string, OtherLinkItem> = {};
      otherLinks.forEach((item, index) => {
        if (item.name.trim() || item.link.trim()) {
          linksOtherMap[String(index)] = {
            name: item.name.trim(),
            link: item.link.trim(),
            description: item.description.trim(),
          };
        }
      });

      await updateUcdsSocialLinks(links, linksOtherMap);
      setSuccessMsg('Social media & other links successfully saved to Firestore!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error('Failed to save social links:', err);
      setError('Failed to save updates to Firestore. Please verify permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ExecutiveLayout activeSection="socials">
        <div className="py-24 flex items-center justify-center">
          <LoadingScreen delayMs={200} message="Loading UCDS Social Links from Organizations collection..." />
        </div>
      </ExecutiveLayout>
    );
  }

  // Find any custom social links that aren't in CANONICAL_KEYS
  const customKeys = Object.keys(links).filter(
    (k) => !CANONICAL_KEYS.some((c) => c.key === k) && k !== 'website'
  );

  return (
    <ExecutiveLayout activeSection="socials">
      <div className="space-y-8 max-w-5xl mx-auto pb-16">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#0075A2]/10 text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] tracking-tight">
                Social Media &amp; Link Directory
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Manage public social platforms (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">links</code>) and resource bookmarks (<code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">links-other</code>) stored in Firestore.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
              title="Reload from Firestore"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0075A2] hover:bg-[#005f84] text-white shadow-lg shadow-[#0075A2]/25 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 flex items-center gap-3 text-sm font-semibold animate-viewFadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-3 text-sm font-semibold animate-viewFadeIn">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SECTION 1: Social Media Platforms (links map) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#15162C] border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-black text-[#1C244C] dark:text-[#F6F6F6] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                Primary Social Media Platforms
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                These map directly to icons on the mobile homepage and desktop command cards.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#0075A2]/10 text-[#0075A2] dark:text-[#53afd0]">
              {Object.keys(links).length} Platforms Active
            </span>
          </div>

          {/* Canonical Platform Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CANONICAL_KEYS.map((plat) => {
              const currentUrl = links[plat.key] || '';
              const isConfigured = Boolean(currentUrl.trim());

              return (
                <div
                  key={plat.key}
                  className={`p-4 rounded-2xl border transition-all ${
                    isConfigured
                      ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                      : 'bg-slate-50/20 dark:bg-slate-900/20 border-dashed border-slate-300 dark:border-slate-800 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor={`plat-${plat.key}`}
                      className="text-xs font-bold uppercase tracking-wider text-[#1C244C] dark:text-slate-200"
                    >
                      {plat.label}
                    </label>
                    {isConfigured && (
                      <a
                        href={currentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-[#0075A2] dark:hover:text-[#53afd0] transition"
                        title="Open external link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id={`plat-${plat.key}`}
                      type="url"
                      value={currentUrl}
                      onChange={(e) => handleLinkChange(plat.key, e.target.value)}
                      placeholder={plat.placeholder}
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0075A2]"
                    />
                    {isConfigured && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(plat.key)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition"
                        title="Remove link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Platform Keys */}
          {customKeys.length > 0 && (
            <div className="pt-2 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Custom Social Channels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customKeys.map((key) => (
                  <div
                    key={key}
                    className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1C244C] dark:text-slate-200">
                        {key}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(key)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="url"
                      value={links[key] || ''}
                      onChange={(e) => handleLinkChange(key, e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Additional Social Link Bar */}
          <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#0075A2]" />
              Add Another Social Platform
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Platform Key (e.g. reddit, threads)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full sm:w-1/3 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
              <input
                type="url"
                placeholder="https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={handleAddCustomLink}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-[#1C244C] dark:bg-[#0075A2] text-white hover:opacity-90 transition"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: Other Links (links-other nested map indexed 0-x) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#15162C] border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-black text-[#1C244C] dark:text-[#F6F6F6] flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                Other Links &amp; Bookmarks (<code className="text-xs">links-other</code>)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Statically mapped integers from <code className="text-xs">0</code> to <code className="text-xs">x</code> containing <code className="text-xs">name</code>, <code className="text-xs">link</code>, and <code className="text-xs">description</code>. Displayed in the &quot;Other Links&quot; tab.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
              {otherLinks.length} Items
            </span>
          </div>

          {/* List of Other Links */}
          {otherLinks.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
              No additional links configured yet. Use the form below to add society matter files, spreadsheets, or partner sites.
            </div>
          ) : (
            <div className="space-y-4">
              {otherLinks.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Index [{index}]
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOtherLink(index)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Remove this link item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                        Title / Name:
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleOtherLinkChange(index, 'name', e.target.value)}
                        placeholder="e.g. CUSID Tournament Calendar"
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                        Destination URL:
                      </label>
                      <input
                        type="url"
                        value={item.link}
                        onChange={(e) => handleOtherLinkChange(index, 'link', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                      Description (shown on desktop expanded cards):
                    </label>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => handleOtherLinkChange(index, 'description', e.target.value)}
                      placeholder="Brief context regarding what this link provides..."
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Other Link Form */}
          <div className="p-5 rounded-2xl bg-cyan-50/50 dark:bg-slate-900/50 border border-cyan-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-[#1C244C] dark:text-[#53afd0] flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5" />
              Add New Other Link
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Link Title (e.g. CUSID Constitution)"
                value={newOtherName}
                onChange={(e) => setNewOtherName(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
              <input
                type="url"
                placeholder="Target URL (https://...)"
                value={newOtherUrl}
                onChange={(e) => setNewOtherUrl(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono"
              />
            </div>
            <input
              type="text"
              placeholder="Short Description (e.g. Official parliamentary rules & bylaws)"
              value={newOtherDesc}
              onChange={(e) => setNewOtherDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
            />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddOtherLink}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0075A2] hover:bg-[#005f84] text-white transition shadow-sm cursor-pointer"
              >
                Insert Link Item
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold bg-[#0075A2] hover:bg-[#005f84] text-white shadow-xl shadow-[#0075A2]/30 transition disabled:opacity-50 cursor-pointer hover:scale-[1.02]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Writing to Firestore...' : 'Save All Social & Other Links'}</span>
          </button>
        </div>
      </div>
    </ExecutiveLayout>
  );
};

export default ExecutiveSocials;
