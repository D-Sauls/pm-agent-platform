import type { TenantBranding } from "./types";

const brandPresets: Record<string, TenantBranding> = {
  "tenant-acme": {
    appName: "Acme Learning Hub",
    logoText: "AC",
    primaryColor: "#0f4c5c",
    accentColor: "#e36414",
    welcomeMessage: "Stay current on onboarding, policy updates, and mandatory training."
  },
  "tenant-beta": {
    appName: "Beta Knowledge Cloud",
    logoText: "BI",
    primaryColor: "#1b4332",
    accentColor: "#f4a261",
    welcomeMessage: "Complete required learning and access the latest knowledge in one place."
  }
};

export function resolveTenantBranding(tenantId: string, organizationName?: string): TenantBranding {
  return (
    brandPresets[tenantId] ?? {
      appName: organizationName ? `${organizationName} Learning` : "Learning & Compliance",
      logoText: organizationName?.slice(0, 2).toUpperCase() ?? "LC",
      primaryColor: "#1d3557",
      accentColor: "#457b9d",
      welcomeMessage: "Access courses, policies, progress, and assistant support in one secure workspace."
    }
  );
}
