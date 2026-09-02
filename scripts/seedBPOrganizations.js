import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initTimeSync } from './timeSync.js';

await initTimeSync();

const { initializeApp, cert, getApps } = await import('firebase-admin/app');
const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('service-account.json not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const app = getApps().length === 0 ? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
}) : getApps()[0];

const db = getFirestore(app);
console.log(`[Seed Organizations] Connected to Firestore project: ${serviceAccount.project_id}`);

const contentFilePath = 'C:\\Users\\busin\\.gemini\\antigravity-ide\\brain\\10431dac-94b4-434d-891a-144d4fc82c02\\.system_generated\\steps\\1729\\content.md';
const content = fs.readFileSync(contentFilePath, 'utf8');

const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
const matches = [];
let m;

while ((m = h1Regex.exec(content)) !== null) {
  const rawText = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (rawText) {
    matches.push({
      startIndex: m.index,
      rawTitle: rawText,
    });
  }
}

function decodeHtml(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function sanitizeOrgId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function sanitizeExecRoleKey(role, existingKeys = []) {
  let base = role
    .toLowerCase()
    .replace(/\bof\b/g, '')
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  if (!base) base = 'executive';

  if (!existingKeys.includes(base)) {
    return base;
  }

  let counter = 1;
  let candidate = `${base}-${counter}`;
  while (existingKeys.includes(candidate)) {
    counter++;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

function sanitizeLinkKey(key) {
  const clean = key
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return clean || 'link';
}

function cleanDocData(raw) {
  const cleaned = {};
  Object.entries(raw).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) {
      if (v.length > 0) cleaned[k] = v;
      return;
    }
    if (typeof v === 'object' && !(v instanceof Date) && !('_nanoseconds' in v)) {
      const nested = cleanDocData(v);
      if (Object.keys(nested).length > 0) {
        cleaned[k] = nested;
      }
      return;
    }
    cleaned[k] = v;
  });
  return cleaned;
}

const parsedOrgs = [];

for (let i = 0; i < matches.length; i++) {
  const current = matches[i];
  const nextStart = i + 1 < matches.length ? matches[i + 1].startIndex : content.length;
  const sectionHtml = content.slice(current.startIndex, nextStart);
  const sectionText = decodeHtml(sectionHtml.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

  // Check if events section explicitly contains BP Debate
  const eventsMatch = sectionText.match(/Events this School Competes in([\s\S]*?)(?:Team Information|Are scholarships|Web-Social|Contact Info|$)/i);
  const eventsText = eventsMatch ? eventsMatch[1] : '';
  const isBpInEvents = /BP Debate|\(BP\)|British Parliamentary/i.test(eventsText);
  const isBpInTitle = /BP Debate/i.test(current.rawTitle);

  if (!isBpInEvents && !isBpInTitle) {
    continue;
  }

  // Clean raw title
  let cleanInstitution = decodeHtml(current.rawTitle)
    .replace(/\s*\((?:BP|APDA|Speech|Worlds|NPDA|IPDA|CEDA|NDT)[^)]*\)/gi, '')
    .trim();

  // Filter out non-US if any
  if (cleanInstitution.includes('British Columbia')) {
    continue; // User specified "These are all located in the US."
  }

  // Abbreviation if any in parentheses e.g. Hobart and William Smith Colleges (HWS)
  let abbrev = undefined;
  const abbrevMatch = cleanInstitution.match(/\(([A-Z0-9]+)\)$/);
  if (abbrevMatch) {
    abbrev = abbrevMatch[1];
    cleanInstitution = cleanInstitution.replace(/\s*\([A-Z0-9]+\)$/, '').trim();
  }

  // Organization Name
  let orgName = `${cleanInstitution} Debate Society`;
  if (/Debate|Forensic|Union|Society/i.test(cleanInstitution)) {
    orgName = cleanInstitution;
  }

  // Type of School
  const typeMatch = sectionText.match(/Type of School:\s*([^<\n\r]+?)(?:Region where|$)/i);
  const typeStr = typeMatch ? typeMatch[1].trim().toLowerCase() : '';
  const types = ['club'];
  if (typeStr.includes('college') || typeStr.includes('2 year')) {
    types.push('college');
  } else {
    types.push('university');
  }

  // Region & City/State
  const regionMatch = sectionText.match(/Region where this school is located:\s*([^<\n\r]+?)(?:Events this School|$)/i);
  const regionStr = regionMatch ? regionMatch[1].trim() : '';
  let city = undefined;
  let province = undefined;
  const country = 'United States';

  const cityStateMatch = regionStr.match(/\(([^,)]+)(?:,\s*([^)]+))?\)/);
  if (cityStateMatch) {
    city = cityStateMatch[1].trim();
    if (cityStateMatch[2]) {
      province = cityStateMatch[2].trim();
    }
  }

  // Links
  const links = {};
  const linkRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let lm;
  while ((lm = linkRegex.exec(sectionHtml)) !== null) {
    const url = lm[1].trim();
    if (url.includes('nwforensics.org') || url.includes('mailto:')) continue;

    if (url.includes('facebook.com')) {
      links.facebook = url;
    } else if (url.includes('instagram.com')) {
      links.instagram = url;
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      links.x = url;
    } else if (url.includes('youtube.com')) {
      links.youtube = url;
    } else if (url.includes('linktr.ee')) {
      links.linktree = url;
    } else if (!links.website) {
      links.website = url;
    } else {
      const linkLabel = sanitizeLinkKey(lm[2].replace(/<[^>]+>/g, '').trim() || 'link');
      if (!links[linkLabel]) {
        links[linkLabel] = url;
      }
    }
  }

  // Contact Info & Executives
  const contactMatch = sectionText.match(/Contact Info\s*([\s\S]*?)(?:This information was last confirmed|$)/i);
  const contactText = contactMatch ? contactMatch[1].trim() : '';

  let email = undefined;
  const emailMatch = sectionHtml.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    email = emailMatch[1].trim();
  } else {
    const rawEmailMatch = contactText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (rawEmailMatch) {
      email = rawEmailMatch[1].trim();
    }
  }

  const executives = {};
  if (contactText) {
    const cleanedContact = contactText
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const rolePatterns = [
      /(.+?)\s+(Director of (?:Speech and )?Debate|Director of Forensics|Head Coach|Coach|Faculty Advisor|Advisor|President|Co-President)/i,
      /(.+?)\s+(Director|Coach|Advisor)/i,
    ];

    let foundExec = false;
    for (const rp of rolePatterns) {
      const rm = cleanedContact.match(rp);
      if (rm) {
        let rawName = rm[1].trim().replace(/^(?:Dr\.|Prof\.|Professor)\s+/i, '');
        const rawRole = rm[2].trim();
        const roleKey = sanitizeExecRoleKey(rawRole, Object.keys(executives));
        const nameParts = rawName.split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        executives[roleKey] = {
          'name-first': firstName || undefined,
          'name-last': lastName || undefined,
          email: email || undefined,
        };
        foundExec = true;
        break;
      }
    }

    if (!foundExec && cleanedContact.length > 2 && cleanedContact.length < 50) {
      const nameParts = cleanedContact.split(/\s+/);
      executives['contact-person'] = {
        'name-first': nameParts[0] || undefined,
        'name-last': nameParts.slice(1).join(' ') || undefined,
        email: email || undefined,
      };
    }
  }

  // Formats
  const formats = ['bp'];
  if (/APDA/i.test(eventsText) || /APDA/i.test(current.rawTitle)) formats.push('apda');
  if (/Worlds/i.test(eventsText) || /Worlds/i.test(current.rawTitle)) formats.push('worlds');
  if (/CNDF/i.test(eventsText)) formats.push('cndf');
  if (/CP/i.test(eventsText)) formats.push('cp');
  if (/Australs/i.test(eventsText)) formats.push('australs');

  const docId = sanitizeOrgId(orgName);

  const orgDoc = {
    id: docId,
    name: orgName,
    'name-affiliated': cleanInstitution,
    'name-abbreviation': abbrev,
    location: {
      country,
      city: city || undefined,
      province: province || undefined,
    },
    formats,
    isOnline: false,
    email: email || undefined,
    type: types,
    links: Object.keys(links).length > 0 ? links : undefined,
    executives: Object.keys(executives).length > 0 ? executives : undefined,
    'time-created': FieldValue.serverTimestamp(),
    'time-updated': FieldValue.serverTimestamp(),
  };

  parsedOrgs.push(orgDoc);
}

console.log(`\nStarting batch write of ${parsedOrgs.length} US BP organizations to Firestore collection 'Organizations'...`);

let written = 0;
const batchLimit = 400;
let batch = db.batch();

for (const org of parsedOrgs) {
  const { id, ...data } = org;
  const cleaned = cleanDocData(data);
  const docRef = db.collection('Organizations').doc(id);
  batch.set(docRef, cleaned, { merge: true });
  written++;
}

await batch.commit();
console.log(`\n✅ Successfully seeded ${written} US BP Debate organizations into Firestore!`);
process.exit(0);
