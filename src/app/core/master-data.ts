// =============================================================
// HUSTLEHUB — Master Data & Constants
// Single source of truth for all app constants.
// When storing in Firestore, always use the `code` value (not `label`).
//
// HOW TO ADD A NEW CITY / ROLE / SUBTYPE:
//   Only edit the array (e.g. CITIES). The corresponding codes object
//   (e.g. CITY_CODES) is auto-derived — no need to touch it.
// =============================================================

// ─────────────────────────────────────────────────────────────
// HELPER — derives a { KEY: 'PREFIX.KEY' } codes object from any
// array of { code: 'PREFIX.KEY' } items.
// ─────────────────────────────────────────────────────────────
type CodesFromArray<T extends readonly { code: string }[]> = {
  [Item in T[number] as Item['code'] extends `${string}.${infer K}` ? K : never]: Item['code']
};

function deriveCodesFromArray<T extends readonly { code: string }[]>(items: T): CodesFromArray<T> {
  return Object.fromEntries(
    items.map(item => [item.code.split('.').pop()!, item.code])
  ) as CodesFromArray<T>;
}

// ─────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────
export const ROLES = [
  { label: 'Find Talent',    code: 'ROLE.DEMAND' },
  { label: 'Offer Services', code: 'ROLE.SUPPLY' }
] as const;

// ADMIN and UNASSIGNED are system-only roles (not shown in UI)
const _ROLE_CODES_DERIVED = deriveCodesFromArray(ROLES);
export const ROLE_CODES = {
  ..._ROLE_CODES_DERIVED,
  ADMIN:      'ROLE.ADMIN'      as const,
  UNASSIGNED: 'ROLE.UNASSIGNED' as const
};

export type UserRole = typeof ROLE_CODES[keyof typeof ROLE_CODES];

// ─────────────────────────────────────────────────────────────
// ROLE SUBTYPES
// To add a new subtype: add one entry here, SUBTYPE_CODES updates automatically.
// ─────────────────────────────────────────────────────────────
export const ROLE_SUBTYPES = [
  // Demand
  { label: '🏢 Business / Brand', code: 'ROLE_SUB.BUSINESS',     role: 'ROLE.DEMAND' as const },
  { label: '💍 Bride (Wedding)',   code: 'ROLE_SUB.BRIDE',        role: 'ROLE.DEMAND' as const },
  // Supply
  { label: '📸 Influencer',        code: 'ROLE_SUB.INFLUENCER',   role: 'ROLE.SUPPLY' as const },
  { label: '📷 Photographer',      code: 'ROLE_SUB.PHOTOGRAPHER', role: 'ROLE.SUPPLY' as const },
  { label: '💻 Freelancer',        code: 'ROLE_SUB.FREELANCER',   role: 'ROLE.SUPPLY' as const }
] as const;

export const SUBTYPE_CODES = deriveCodesFromArray(ROLE_SUBTYPES);
export type UserRoleSubtype = typeof SUBTYPE_CODES[keyof typeof SUBTYPE_CODES];

// ─────────────────────────────────────────────────────────────
// CITIES
// To add a new city: add one entry here, CITY_CODES updates automatically.
// ─────────────────────────────────────────────────────────────
export const CITIES = [
  { label: 'Pune',       code: 'CITY.PUNE'       },
  { label: 'Mumbai',     code: 'CITY.MUMBAI'     },
  { label: 'Delhi',      code: 'CITY.DELHI'      },
  { label: 'Bangalore',  code: 'CITY.BANGALORE'  }
] as const;

export const CITY_CODES = deriveCodesFromArray(CITIES);
export type UserCity = typeof CITY_CODES[keyof typeof CITY_CODES];

// ─────────────────────────────────────────────────────────────
// USER STATUS
// ─────────────────────────────────────────────────────────────
export const USER_STATUS_CODES = {
  ACTIVE:  'USER_STATUS.ACTIVE',
  BLOCKED: 'USER_STATUS.BLOCKED',
  DELETED: 'USER_STATUS.DELETED'
} as const;

export type UserStatus = typeof USER_STATUS_CODES[keyof typeof USER_STATUS_CODES];

// ─────────────────────────────────────────────────────────────
// POST STATUS
// ─────────────────────────────────────────────────────────────
export const POST_STATUS_CODES = {
  OPEN:        'POST_STATUS.OPEN',
  CLOSED:      'POST_STATUS.CLOSED',
  IN_PROGRESS: 'POST_STATUS.IN_PROGRESS',
  COMPLETED:   'POST_STATUS.COMPLETED'
} as const;

export type PostStatus = typeof POST_STATUS_CODES[keyof typeof POST_STATUS_CODES];

// ─────────────────────────────────────────────────────────────
// APPLICATION STATUS
// ─────────────────────────────────────────────────────────────
export const APPLICATION_STATUS_CODES = {
  PENDING:   'APPLICATION_STATUS.PENDING',
  ACCEPTED:  'APPLICATION_STATUS.ACCEPTED',
  REJECTED:  'APPLICATION_STATUS.REJECTED',
  WITHDRAWN: 'APPLICATION_STATUS.WITHDRAWN'
} as const;

export type ApplicationStatus = typeof APPLICATION_STATUS_CODES[keyof typeof APPLICATION_STATUS_CODES];

/** Maps an application status code → human label */
export function getLabelForApplicationStatus(code: string | undefined, fallback = '—'): string {
  const map: Record<string, string> = {
    [APPLICATION_STATUS_CODES.PENDING]:   'Pending',
    [APPLICATION_STATUS_CODES.ACCEPTED]:  'Accepted',
    [APPLICATION_STATUS_CODES.REJECTED]:  'Rejected',
    [APPLICATION_STATUS_CODES.WITHDRAWN]: 'Withdrawn'
  };
  return code ? (map[code] ?? code) : fallback;
}

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────
export const APP_ROUTES = {
  SPLASH:             '/splash',
  LOGIN:              '/login',
  SIGNUP:             '/signup',
  ONBOARDING:         '/tabs/onboarding',
  HOME:               '/tabs/home',
  POST:               '/tabs/post',
  PROFILE:            '/tabs/profile',
  CHAT:               '/tabs/chat',
  APPLICATIONS:       '/tabs/applications',
  POST_DETAIL:        '/tabs/post-detail',
  APPLICATION_DETAIL: '/tabs/application-detail'
} as const;

// ─────────────────────────────────────────────────────────────
// APP IDENTITY
// ─────────────────────────────────────────────────────────────
export const APP_CONTEXT = 'HUSTLEHUB';

// ─────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────
/** Default page size for all Firestore list queries */
export const PAGE_SIZE = 5;

// ─────────────────────────────────────────────────────────────
// LABEL LOOKUP HELPERS

// Use these in templates instead of displaying raw code values.
// ─────────────────────────────────────────────────────────────

/** Maps a city code → human label. e.g. 'CITY.MUMBAI' → 'Mumbai' */
export function getLabelForCity(code: string | undefined, fallback = 'Remote'): string {
  if (!code) return fallback;
  return CITIES.find(c => c.code === code)?.label ?? code;
}

/** Maps a role code → human label. e.g. 'ROLE.DEMAND' → 'Find Talent' */
export function getLabelForRole(code: string | undefined, fallback = '—'): string {
  if (!code) return fallback;
  const systemLabels: Record<string, string> = {
    [ROLE_CODES.ADMIN]:      'Admin',
    [ROLE_CODES.UNASSIGNED]: 'Unassigned'
  };
  return systemLabels[code] ?? ROLES.find(r => r.code === code)?.label ?? code;
}

/** Maps a subtype code → human label. e.g. 'ROLE_SUB.INFLUENCER' → '📸 Influencer' */
export function getLabelForSubtype(code: string | undefined, fallback = '—'): string {
  if (!code) return fallback;
  return ROLE_SUBTYPES.find(s => s.code === code)?.label ?? code;
}

/** Maps a user status code → human label. e.g. 'USER_STATUS.ACTIVE' → 'Active' */
export function getLabelForUserStatus(code: string | undefined, fallback = '—'): string {
  const map: Record<string, string> = {
    [USER_STATUS_CODES.ACTIVE]:  'Active',
    [USER_STATUS_CODES.BLOCKED]: 'Blocked',
    [USER_STATUS_CODES.DELETED]: 'Deleted'
  };
  return code ? (map[code] ?? code) : fallback;
}

/** Maps a post status code → human label. e.g. 'POST_STATUS.OPEN' → 'Open' */
export function getLabelForPostStatus(code: string | undefined, fallback = '—'): string {
  const map: Record<string, string> = {
    [POST_STATUS_CODES.OPEN]:        'Open',
    [POST_STATUS_CODES.CLOSED]:      'Closed',
    [POST_STATUS_CODES.IN_PROGRESS]: 'In Progress',
    [POST_STATUS_CODES.COMPLETED]:   'Completed'
  };
  return code ? (map[code] ?? code) : fallback;
}

