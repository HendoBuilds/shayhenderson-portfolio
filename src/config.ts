/**
 * Site-wide configuration
 * Centralized constants for personal information and site settings
 */

export const SITE_CONFIG = {
  name: "Shay Henderson",
  title: "Shay Henderson | Software and Infrastructure Engineer",
  description: "Software & Infrastructure Engineer with 6+ years building scalable web, mobile, and cloud solutions. Specializing in development, QA, DevOps, and support.",
  url: "https://shayhenderson.dev",
  email: "contact@shayhenderson.dev",

  social: {
    github: {
      username: "HendoBuilds",
      url: "https://github.com/HendoBuilds"
    },
    linkedin: {
      username: "shay-henderson",
      url: "https://www.linkedin.com/in/shay-henderson/"
    }
  },

  location: {
    city: "Scotland",
    country: "UK"
  }
} as const;
