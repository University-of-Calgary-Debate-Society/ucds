import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Building2, MapPin, Check } from 'lucide-react';
import { getOrganizations, type OrganizationDoc } from '@/services/userService';
import { getCountryFlag } from '@/utils/countries';

interface OrganizationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (orgName: string) => void;
  selectedOrg?: string;
}

export const OrganizationPickerModal: React.FC<OrganizationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedOrg = '',
}) => {
  const [organizations, setOrganizations] = useState<OrganizationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [customOrg, setCustomOrg] = useState('');

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getOrganizations()
      .then((orgs) => {
        setOrganizations(orgs);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load organizations:', err);
        setLoading(false);
      });
  }, [isOpen]);

  // Extract unique countries
  const countries = useMemo(() => {
    const set = new Set<string>();
    organizations.forEach((org) => {
      if (org.location?.country) {
        set.add(org.location.country);
      }
    });
    return Array.from(set).sort();
  }, [organizations]);

  // Filter organizations by search and country
  const filteredOrganizations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return organizations.filter((org) => {
      // Exclude UCDS itself from the external pickable organizations list
      const isUcds =
        org.id === 'university-of-calgary-debate-society' ||
        (org.name && org.name.toLowerCase().trim() === 'university of calgary debate society');
      if (isUcds) return false;

      // Country Filter
      if (selectedCountry !== 'all') {
        const country = (org.location?.country || '').toLowerCase();
        if (selectedCountry === 'usa') {
          if (!country.includes('united states') && !country.includes('usa') && !country.includes('us')) {
            return false;
          }
        } else if (country.toLowerCase() !== selectedCountry.toLowerCase()) {
          return false;
        }
      }

      if (!q) return true;

      // Active search fields: name, aliases, abbreviation, affiliated institution, location
      const name = (org.name || '').toLowerCase();
      const abbrev = (org['name-abbreviation'] || org['name-abbreviated'] || '').toLowerCase();
      const affiliated = (org['name-affiliated'] || '').toLowerCase();
      const aliases = (org['name-aliases'] || []).join(' ').toLowerCase();
      const city = (org.location?.city || '').toLowerCase();
      const province = (org.location?.province || '').toLowerCase();
      const country = (org.location?.country || '').toLowerCase();

      return (
        name.includes(q) ||
        abbrev.includes(q) ||
        affiliated.includes(q) ||
        aliases.includes(q) ||
        city.includes(q) ||
        province.includes(q) ||
        country.includes(q)
      );
    });
  }, [organizations, searchQuery, selectedCountry]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-org-overlay" onClick={onClose}>
      <div className="modal-org-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="p-5 border-b border-[rgba(28,36,76,0.1)] dark:border-[rgba(83,175,208,0.2)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#0075A2] dark:text-[#53afd0]" />
            <h3 className="font-title font-bold text-lg text-[#1C244C] dark:text-[#F6F6F6]">
              Select Affiliated Organization
            </h3>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Country Filter Toolbar */}
        <div className="p-4 border-b border-[rgba(28,36,76,0.06)] dark:border-[rgba(83,175,208,0.1)] space-y-3 bg-[rgba(28,36,76,0.02)] dark:bg-[rgba(21,22,44,0.3)]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, country, province, or institution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.2)] bg-white dark:bg-[#15162C] text-[#101426] dark:text-[#F6F6F6] focus:outline-none focus:ring-2 focus:ring-[#0075A2]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCountry('all')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCountry === 'all'
                  ? 'bg-[#0075A2] text-white'
                  : 'bg-[rgba(28,36,76,0.06)] dark:bg-[rgba(83,175,208,0.1)] text-slate-700 dark:text-slate-300 hover:bg-[rgba(28,36,76,0.12)]'
              }`}
            >
              All Regions
            </button>
            <button
              type="button"
              onClick={() => setSelectedCountry('canada')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCountry === 'canada'
                  ? 'bg-[#0075A2] text-white'
                  : 'bg-[rgba(28,36,76,0.06)] dark:bg-[rgba(83,175,208,0.1)] text-slate-700 dark:text-slate-300 hover:bg-[rgba(28,36,76,0.12)]'
              }`}
            >
              Canada 🇨🇦
            </button>
            <button
              type="button"
              onClick={() => setSelectedCountry('usa')}
              className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all whitespace-nowrap ${
                selectedCountry === 'usa'
                  ? 'bg-[#0075A2] text-white'
                  : 'bg-[rgba(28,36,76,0.06)] dark:bg-[rgba(83,175,208,0.1)] text-slate-700 dark:text-slate-300 hover:bg-[rgba(28,36,76,0.12)]'
              }`}
            >
              United States 🇺🇸
            </button>
            {countries
              .filter((c) => !['canada', 'united states', 'usa', 'us'].includes(c.toLowerCase()))
              .map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => setSelectedCountry(country.toLowerCase())}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all whitespace-nowrap ${
                    selectedCountry === country.toLowerCase()
                      ? 'bg-[#0075A2] text-white'
                      : 'bg-[rgba(28,36,76,0.06)] dark:bg-[rgba(83,175,208,0.1)] text-slate-700 dark:text-slate-300 hover:bg-[rgba(28,36,76,0.12)]'
                  }`}
                >
                  {getCountryFlag(country)} {country}
                </button>
              ))}
          </div>
        </div>

        {/* Organizations List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh]">
          {/* Option: Independent / Unaffiliated */}
          <div
            onClick={() => {
              onSelect('Independent');
              onClose();
            }}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              selectedOrg.toLowerCase() === 'independent' || !selectedOrg
                ? 'bg-[#0075A2]/10 border-[#0075A2] dark:bg-[#53afd0]/20 dark:border-[#53afd0]'
                : 'border-[rgba(28,36,76,0.08)] dark:border-[rgba(83,175,208,0.12)] hover:border-[#0075A2] dark:hover:border-[#53afd0] bg-white dark:bg-[#15162C]'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#101426] dark:text-[#F6F6F6]">
                  Independent
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold">
                  Unaffiliated
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Not affiliated with any specific debate club or university team.
              </p>
            </div>

            {(selectedOrg.toLowerCase() === 'independent' || !selectedOrg) && (
              <div className="w-6 h-6 rounded-full bg-[#0075A2] text-white flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-sm">
              Loading organizations directory...
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-500">
                No organizations found matching "{searchQuery}".
              </p>
              <p className="text-xs text-slate-400">
                You can specify a custom institution name below.
              </p>
            </div>
          ) : (
            filteredOrganizations.map((org) => {
              const isSelected = selectedOrg === org.name;
              return (
                <div
                  key={org.id}
                  onClick={() => {
                    onSelect(org.name);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#0075A2]/10 border-[#0075A2] dark:bg-[#53afd0]/20 dark:border-[#53afd0]'
                      : 'border-[rgba(28,36,76,0.08)] dark:border-[rgba(83,175,208,0.12)] hover:border-[#0075A2] dark:hover:border-[#53afd0] bg-white dark:bg-[#15162C]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#101426] dark:text-[#F6F6F6]">
                        {org.name}
                      </span>
                      {org['name-abbreviation'] && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-[rgba(28,36,76,0.06)] dark:bg-[rgba(83,175,208,0.15)] text-[#0075A2] dark:text-[#53afd0] font-black">
                          {org['name-abbreviation']}
                        </span>
                      )}
                    </div>
                    {org['name-affiliated'] && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{org['name-affiliated']}</span>
                      </p>
                    )}
                    {org.location?.country && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {org.location.city ? `${org.location.city}, ` : ''}
                          {org.location.country}
                        </span>
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#0075A2] text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Custom Organization Manual Entry Option */}
          {(!loading || filteredOrganizations.length === 0) && (
            <div className="pt-4 border-t border-[rgba(28,36,76,0.08)] dark:border-[rgba(83,175,208,0.15)] space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                Not listed? Enter your institution / organization manually:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Harvard Debate Union"
                  value={customOrg}
                  onChange={(e) => setCustomOrg(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.2)] bg-white dark:bg-[#15162C] text-[#101426] dark:text-[#F6F6F6] focus:outline-none focus:ring-2 focus:ring-[#0075A2]"
                />
                <button
                  type="button"
                  disabled={!customOrg.trim()}
                  onClick={() => {
                    if (customOrg.trim()) {
                      onSelect(customOrg.trim());
                      onClose();
                    }
                  }}
                  className="px-4 py-2 text-sm bg-[#0075A2] text-white rounded-xl font-bold hover:bg-[#006085] transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[rgba(28,36,76,0.03)] dark:bg-[rgba(21,22,44,0.5)] border-t border-[rgba(28,36,76,0.08)] dark:border-[rgba(83,175,208,0.15)] flex justify-end">
          <button
            type="button"
            className="btn-form-back text-sm py-2 px-4"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
