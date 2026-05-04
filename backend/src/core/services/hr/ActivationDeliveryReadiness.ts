import type { env } from "../../../config/env.js";

export interface ActivationDeliveryReadiness {
  ready: boolean;
  warnings: string[];
}

type ActivationReadinessEnv = Pick<
  typeof env,
  | "appEnv"
  | "activationDeliveryMode"
  | "activationEmailProvider"
  | "activationBaseUrl"
  | "activationSenderEmail"
  | "sendGridApiKey"
  | "sendGridSenderVerified"
>;

function isLocalUrl(value: string): boolean {
  return /localhost|127\.0\.0\.1|^http:\/\//i.test(value);
}

function isLocalEmail(value: string): boolean {
  return /@localhost$/i.test(value) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export function activationDeliveryReadiness(
  config: ActivationReadinessEnv
): ActivationDeliveryReadiness {
  const warnings: string[] = [];

  if (config.appEnv !== "production") {
    if (config.activationDeliveryMode !== "email") {
      warnings.push("Activation delivery is running in local/demo mode and will not send real activation email.");
    }
    return { ready: true, warnings };
  }

  if (config.activationDeliveryMode !== "email") {
    warnings.push("Production activation delivery must use email mode.");
  }
  if (config.activationEmailProvider !== "sendgrid") {
    warnings.push("Production activation email provider must be SendGrid for the current MVP provider path.");
  }
  if (!config.sendGridApiKey) {
    warnings.push("SENDGRID_API_KEY is required for production activation email delivery.");
  }
  if (!config.activationSenderEmail || isLocalEmail(config.activationSenderEmail)) {
    warnings.push("ACTIVATION_SENDER_EMAIL must be a verified non-local sender address.");
  }
  if (!config.sendGridSenderVerified) {
    warnings.push("SENDGRID_SENDER_VERIFIED=true is required after sender/domain verification is completed.");
  }
  if (!config.activationBaseUrl || isLocalUrl(config.activationBaseUrl)) {
    warnings.push("ACTIVATION_BASE_URL must be a public HTTPS onboarding URL in production.");
  }

  return { ready: warnings.length === 0, warnings };
}
