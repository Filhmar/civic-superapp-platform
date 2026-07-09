/**
 * Tiny EN/FIL dictionary for STATIC platform labels only — all tenant-facing
 * CONTENT comes from the tenant config / backend. Locales offered per tenant
 * come from config.locales.
 */
export type Locale = "en" | "fil";

const en = {
  more: "More",
  guest: "Guest",
  resident: "Resident",
  browsingAsGuest: "Browsing as guest",
  signIn: "Sign in",
  signOut: "Sign out",
  digitalId: "Digital City ID",
  myReports: "My Reports",
  myApplications: "My Applications",
  language: "Language",
  theme: "Theme",
  themeSystem: "System",
  themeLight: "Light",
  themeDark: "Dark",
  helpFaq: "Help & FAQ",
  sendFeedback: "Send Feedback",
  editProfile: "Edit Profile",
  name: "Name",
  barangay: "Barangay",
  save: "Save",
  cancel: "Cancel",
  services: "Services",
  home: "Home",
  sos: "SOS",
} as const;

export type StringKey = keyof typeof en;

const fil: Record<StringKey, string> = {
  more: "Iba pa",
  guest: "Bisita",
  resident: "Residente",
  browsingAsGuest: "Nagba-browse bilang bisita",
  signIn: "Mag-sign in",
  signOut: "Mag-sign out",
  digitalId: "Digital City ID",
  myReports: "Aking mga Ulat",
  myApplications: "Aking mga Aplikasyon",
  language: "Wika",
  theme: "Tema",
  themeSystem: "Sistema",
  themeLight: "Maliwanag",
  themeDark: "Madilim",
  helpFaq: "Tulong at FAQ",
  sendFeedback: "Magpadala ng Puna",
  editProfile: "I-edit ang Profile",
  name: "Pangalan",
  barangay: "Barangay",
  save: "I-save",
  cancel: "Kanselahin",
  services: "Mga Serbisyo",
  home: "Home",
  sos: "SOS",
};

export const STRINGS: Record<Locale, Record<StringKey, string>> = { en, fil };
