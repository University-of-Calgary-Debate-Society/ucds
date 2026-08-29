import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Building2, MapPin, Check, Globe } from 'lucide-react';
import { getOrganizations, type OrganizationDoc } from '@/services/userService';

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

  return (
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

        {/* Search & Country Filter Controls */}
        <div className="p-4 border-b border-[rgba(28,36,76,0.08)] dark:border-[rgba(83,175,208,0.15)] flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search club name, abbreviation, university, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input pl-9"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="form-input py-1.5 text-sm font-semibold cursor-pointer"
            >
              <option value="all">All Countries / Regions</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Organizations List Body */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[380px] flex flex-col gap-2.5">
          {loading ? (
            <div className="py-10 text-center text-sm font-semibold text-slate-500">
              Loading organizations directory...
            </div>
          ) : filteredOrganizations.length > 0 ? (
            filteredOrganizations.map((org) => {
              const isSelected = selectedOrg === org.name;

              return (
                <div
                  key={org.id}
                  className={`org-item-card ${isSelected ? 'border-[#0075A2] dark:border-[#53afd0] bg-[rgba(0,117,162,0.08)] dark:bg-[rgba(83,175,208,0.15)]' : ''}`}
                  onClick={() => {
                    onSelect(org.name);
                    onClose();
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-title font-bold text-sm text-[#1C244C] dark:text-[#F6F6F6]">
                      {org.name}
                    </span>
                    {org['name-affiliated'] && (
                      <span className="text-xs font-semibold text-[#0075A2] dark:text-[#53afd0]">
                        {org['name-affiliated']}
                      </span>
                    )}
                    {org.location && (
                      <div className="flex items-center gap-1 text-[0.75rem] text-slate-500 dark:text-slate-400 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {[org.location.city, org.location.province, org.location.country]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#0075A2] dark:bg-[#53afd0] text-white dark:text-[#15162C] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-sm font-medium text-slate-500 flex flex-col items-center gap-3">
              <span>No registered debate organizations match your search.</span>
              <div className="w-full max-w-sm flex items-center gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Enter custom institution/club name"
                  value={customOrg}
                  onChange={(e) => setCustomOrg(e.target.value)}
                  className="form-input text-xs py-2"
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
                  className="btn-bulk-toggle text-xs py-2 px-3 whitespace-nowrap"
                >
                  Use Custom
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
    </div>
  );
};
