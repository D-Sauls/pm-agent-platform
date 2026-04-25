import { env } from "../../../config/env.js";
import type { ActivationRecord, ActivationMode, ProvisionedUser } from "../../models/hrImportModels.js";

export type ActivationDeliveryStatus = "delivered" | "queued" | "not_configured" | "failed";
export type ActivationDeliveryChannel = "email" | "sms" | "webhook" | "log" | "disabled";

export interface ActivationDeliveryOutcome {
  status: ActivationDeliveryStatus;
  channel: ActivationDeliveryChannel;
  destination?: string | null;
  message: string;
  preview?: {
    activationUrl?: string;
    temporaryPassword?: string;
  };
}

export interface ActivationDeliveryInput {
  user: ProvisionedUser;
  activationRecord: ActivationRecord;
  oneTimeSecret?: string;
}

function normalizeMode(value: string): ActivationDeliveryChannel {
  if (["email", "sms", "webhook", "log", "disabled"].includes(value)) {
    return value as ActivationDeliveryChannel;
  }
  return "log";
}

function maskDestination(value: string | null | undefined): string | null {
  if (!value) return null;
  const [name, domain] = value.split("@");
  if (!domain) return value.length <= 4 ? "****" : `${value.slice(0, 2)}****${value.slice(-2)}`;
  return `${name.slice(0, 2)}****@${domain}`;
}

function activationUrl(token: string): string {
  const base = env.activationBaseUrl.replace(/\/+$/, "");
  const separator = base.includes("?") ? "&" : "?";
  return `${base}/${separator}activationToken=${encodeURIComponent(token)}`;
}

function composeMessage(mode: ActivationMode): string {
  if (mode === "temporary_password") {
    return "Temporary password issued. User must reset password on first login.";
  }
  return "Activation link issued. User must set a password before first login.";
}

export class ActivationDeliveryService {
  async deliver(input: ActivationDeliveryInput): Promise<ActivationDeliveryOutcome> {
    const channel = normalizeMode(env.activationDeliveryMode);
    if (channel === "disabled") {
      return {
        status: "not_configured",
        channel,
        destination: null,
        message: "Activation delivery is disabled by configuration."
      };
    }

    if (!input.oneTimeSecret) {
      return {
        status: "failed",
        channel,
        destination: null,
        message: "Activation delivery requires a one-time activation secret."
      };
    }

    const destination = input.user.workEmail ?? input.user.username;
    const url =
      input.activationRecord.activationMode === "activation_link"
        ? activationUrl(input.oneTimeSecret)
        : undefined;
    const temporaryPassword =
      input.activationRecord.activationMode === "temporary_password" ? input.oneTimeSecret : undefined;

    if (channel === "webhook" || channel === "email" || channel === "sms") {
      if (!env.activationDeliveryWebhookUrl) {
        return {
          status: "not_configured",
          channel,
          destination: maskDestination(destination),
          message: "Activation delivery webhook is not configured."
        };
      }

      try {
        const response = await fetch(env.activationDeliveryWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel,
            tenantId: input.user.tenantId,
            userId: input.user.id,
            employeeCode: input.user.employeeCode,
            to: destination,
            activationMode: input.activationRecord.activationMode,
            activationUrl: url,
            temporaryPassword,
            expiresAt: input.activationRecord.expiresAt?.toISOString() ?? null,
            message: composeMessage(input.activationRecord.activationMode),
            from: channel === "sms" ? env.activationSenderSms : env.activationSenderEmail
          })
        });
        return {
          status: response.ok ? "queued" : "failed",
          channel,
          destination: maskDestination(destination),
          message: response.ok
            ? "Activation delivery handed off to configured webhook."
            : `Activation delivery webhook returned ${response.status}.`
        };
      } catch (error) {
        return {
          status: "failed",
          channel,
          destination: maskDestination(destination),
          message: error instanceof Error ? error.message : "Activation delivery failed."
        };
      }
    }

    const outcome: ActivationDeliveryOutcome = {
      status: "delivered",
      channel: "log",
      destination: maskDestination(destination),
      message: "Activation delivery captured by local log transport."
    };

    if (env.activationDeliveryPreview) {
      outcome.preview = {
        ...(url ? { activationUrl: url } : {}),
        ...(temporaryPassword ? { temporaryPassword } : {})
      };
    }

    console.info("[activation-delivery]", {
      tenantId: input.user.tenantId,
      userId: input.user.id,
      channel: outcome.channel,
      destination: outcome.destination,
      activationMode: input.activationRecord.activationMode,
      expiresAt: input.activationRecord.expiresAt?.toISOString() ?? null,
      previewAvailable: Boolean(outcome.preview)
    });

    return outcome;
  }
}
