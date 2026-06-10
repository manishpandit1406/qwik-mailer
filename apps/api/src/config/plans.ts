export type PlanType = "free" | "standard" | "pro" | "business" | "custom";

export interface PlanLimits {
  emailsPerMonth: number;
  emailsPerDay?: number;
  speedPerSecond: number;
  maxTeamMembers: number;
  maxProjects: number;
  maxContacts: number;
  maxCustomDomains: number;
  validationsPerMonth: number;
  testingInboxPerDay: number;
  features: {
    webhooks: boolean;
    scheduling: boolean;
    prioritySupport: boolean;
  };
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    emailsPerMonth: 3000,
    emailsPerDay: 100,
    speedPerSecond: 1,
    maxTeamMembers: 1, // User only
    maxProjects: 1,
    maxContacts: 250,
    maxCustomDomains: 1,
    validationsPerMonth: 100,
    testingInboxPerDay: 100,
    features: {
      webhooks: false,
      scheduling: false,
      prioritySupport: false,
    },
  },
  standard: {
    emailsPerMonth: 5000,
    speedPerSecond: 3,
    maxTeamMembers: 3,
    maxProjects: 2,
    maxContacts: 2000,
    maxCustomDomains: 5,
    validationsPerMonth: 2500,
    testingInboxPerDay: 100,
    features: {
      webhooks: true,
      scheduling: false,
      prioritySupport: false,
    },
  },
  pro: {
    emailsPerMonth: 50000,
    speedPerSecond: 5,
    maxTeamMembers: 5,
    maxProjects: 5,
    maxContacts: 20000,
    maxCustomDomains: 999999, // Unlimited
    validationsPerMonth: 25000,
    testingInboxPerDay: 100,
    features: {
      webhooks: true,
      scheduling: true,
      prioritySupport: true,
    },
  },
  business: {
    emailsPerMonth: 250000,
    speedPerSecond: 20, // Higher limit
    maxTeamMembers: 999999,
    maxProjects: 999999,
    maxContacts: 99999999,
    maxCustomDomains: 999999,
    validationsPerMonth: 100000,
    testingInboxPerDay: 1000,
    features: {
      webhooks: true,
      scheduling: true,
      prioritySupport: true,
    },
  },
  custom: {
    emailsPerMonth: 99999999,
    speedPerSecond: 100,
    maxTeamMembers: 999999,
    maxProjects: 999999,
    maxContacts: 99999999,
    maxCustomDomains: 999999,
    validationsPerMonth: 99999999,
    testingInboxPerDay: 999999,
    features: {
      webhooks: true,
      scheduling: true,
      prioritySupport: true,
    },
  },
};

export const ADD_ON_PRICES = {
  standard: { pricePer1k: 40 },
  pro: { pricePer1k: 35 },
  business: { pricePer1k: 30 },
};
