import { randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
import { loggingService } from "../../../observability/runtime.js";
import { activationDeliveryReadiness } from "./ActivationDeliveryReadiness.js";
import type {
  ActivationDeliveryAttempt,
  ActivationDeliveryProvider,
  ActivationRecord,
  ActivationMode,
  ProvisionedUser
} from "../../models/hrImportModels.js";

export type ActivationDeliveryStatus = "delivered" | "queued" | "not_configured" | "failed";
export type ActivationDeliveryChannel = "email" | "sms" | "webhook" | "log" | "disabled";

export interface ActivationDeliveryOutcome {
  attemptId?: string;
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
  correlationId?: string | null;
}

export interface ActivationDeliveryAttemptStore {
  recordActivationDeliveryAttempt(attempt: ActivationDeliveryAttempt): ActivationDeliveryAttempt;
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
  return `${base}${separator}activationToken=${encodeURIComponent(token)}`;
}

function composeMessage(mode: ActivationMode): string {
  if (mode === "temporary_password") {
    return "Temporary password issued. User must reset password on first login.";
  }
  return "Activation link issued. User must set a password before first login.";
}

export class ActivationDeliveryService {
  constructor(private readonly attemptStore?: ActivationDeliveryAttemptStore) {}

  async deliver(input: ActivationDeliveryInput): Promise<ActivationDeliveryOutcome> {
    const channel = normalizeMode(env.activationDeliveryMode);
    const createdAt = new Date();
    if (channel === "disabled") {
      return this.record(input, {
        status: "not_configured",
        channel,
        provider: "local_preview",
        destination: null,
        message: "Activation delivery is disabled by configuration."
      }, createdAt);
    }

    if (!input.oneTimeSecret) {
      return this.record(input, {
        status: "failed",
        channel,
        provider: this.providerFor(channel),
        destination: null,
        message: "Activation delivery requires a one-time activation secret."
      }, createdAt, "Missing one-time activation secret.");
    }

    const destination = input.user.workEmail ?? input.user.username;
    const url =
      input.activationRecord.activationMode === "activation_link"
        ? activationUrl(input.oneTimeSecret)
        : undefined;
    const temporaryPassword =
      input.activationRecord.activationMode === "temporary_password" ? input.oneTimeSecret : undefined;

    if (channel === "email") {
      return this.deliverEmail(input, destination, url, temporaryPassword, createdAt);
    }

    if (channel === "webhook" || channel === "sms") {
      if (!env.activationDeliveryWebhookUrl) {
        return this.record(input, {
          status: "not_configured",
          channel,
          provider: "webhook",
          destination: maskDestination(destination),
          message: "Activation delivery webhook is not configured."
        }, createdAt);
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
        return this.record(input, {
          status: response.ok ? "queued" : "failed",
          channel,
          provider: "webhook",
          destination: maskDestination(destination),
          message: response.ok
            ? "Activation delivery handed off to configured webhook."
            : `Activation delivery webhook returned ${response.status}.`
        }, createdAt, response.ok ? undefined : `HTTP ${response.status}`);
      } catch (error) {
        return this.record(input, {
          status: "failed",
          channel,
          provider: "webhook",
          destination: maskDestination(destination),
          message: error instanceof Error ? error.message : "Activation delivery failed."
        }, createdAt, error instanceof Error ? error.message : "Activation delivery failed.");
      }
    }

    const outcome = this.record(input, {
      status: "delivered",
      channel: "log",
      provider: "local_preview",
      destination: maskDestination(destination),
      message: "Activation delivery captured by local log transport."
    }, createdAt);

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

  private async deliverEmail(
    input: ActivationDeliveryInput,
    destination: string,
    url: string | undefined,
    temporaryPassword: string | undefined,
    createdAt: Date
  ): Promise<ActivationDeliveryOutcome> {
    const readiness = activationDeliveryReadiness(env);
    if (env.appEnv === "production" && !readiness.ready) {
      return this.record(input, {
        status: "not_configured",
        channel: "email",
        provider: "sendgrid",
        destination: maskDestination(destination),
        message: `Activation email delivery is not production-ready: ${readiness.warnings.join(" ")}`
      }, createdAt);
    }

    if (!input.user.workEmail) {
      return this.record(input, {
        status: "failed",
        channel: "email",
        provider: this.providerFor("email"),
        destination: null,
        message: "Activation email delivery requires a workEmail destination."
      }, createdAt, "Missing workEmail.");
    }

    if (env.activationEmailProvider !== "sendgrid") {
      return this.record(input, {
        status: "not_configured",
        channel: "email",
        provider: "sendgrid",
        destination: maskDestination(destination),
        message: `Unsupported activation email provider: ${env.activationEmailProvider}.`
      }, createdAt);
    }

    if (!env.sendGridApiKey || !env.activationSenderEmail) {
      return this.record(input, {
        status: "not_configured",
        channel: "email",
        provider: "sendgrid",
        destination: maskDestination(destination),
        message: "SendGrid activation email delivery is not configured."
      }, createdAt);
    }

    try {
      const bodyText =
        input.activationRecord.activationMode === "temporary_password"
          ? `Your temporary password is: ${temporaryPassword}\n\nYou must reset it on first login.`
          : `Activate your onboarding account: ${url}\n\nThis link expires at ${input.activationRecord.expiresAt?.toISOString() ?? "the configured expiry time"}.`;
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.sendGridApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: input.user.workEmail }] }],
          from: { email: env.activationSenderEmail },
          subject: "Activate your onboarding account",
          content: [{ type: "text/plain", value: bodyText }]
        })
      });
      return this.record(input, {
        status: response.ok ? "queued" : "failed",
        channel: "email",
        provider: "sendgrid",
        destination: maskDestination(destination),
        message: response.ok ? "Activation email queued with SendGrid." : `SendGrid returned ${response.status}.`
      }, createdAt, response.ok ? undefined : `HTTP ${response.status}`);
    } catch (error) {
      return this.record(input, {
        status: "failed",
        channel: "email",
        provider: "sendgrid",
        destination: maskDestination(destination),
        message: error instanceof Error ? error.message : "Activation email delivery failed."
      }, createdAt, error instanceof Error ? error.message : "Activation email delivery failed.");
    }
  }

  private providerFor(channel: ActivationDeliveryChannel): ActivationDeliveryProvider {
    if (channel === "email") return "sendgrid";
    if (channel === "webhook" || channel === "sms") return "webhook";
    return "local_preview";
  }

  private record(
    input: ActivationDeliveryInput,
    outcome: ActivationDeliveryOutcome & { provider: ActivationDeliveryProvider },
    createdAt: Date,
    errorMessage?: string
  ): ActivationDeliveryOutcome {
    const attempt: ActivationDeliveryAttempt = {
      id: randomUUID(),
      tenantId: input.user.tenantId,
      userId: input.user.id,
      activationRecordId: input.activationRecord.id,
      destination: outcome.destination ?? null,
      provider: outcome.provider,
      channel: outcome.channel === "sms" ? "webhook" : outcome.channel,
      status: outcome.status,
      message: outcome.message,
      errorMessage: errorMessage ?? null,
      correlationId: input.correlationId ?? null,
      sentAt: ["delivered", "queued"].includes(outcome.status) ? new Date() : null,
      failedAt: outcome.status === "failed" ? new Date() : null,
      createdAt
    };
    this.attemptStore?.recordActivationDeliveryAttempt(attempt);
    const result: ActivationDeliveryOutcome = {
      attemptId: attempt.id,
      status: outcome.status,
      channel: outcome.channel,
      destination: outcome.destination ?? null,
      message: outcome.message
    };
    const logPayload = {
      tenantId: input.user.tenantId,
      userId: input.user.id,
      attemptId: attempt.id,
      provider: attempt.provider,
      channel: attempt.channel,
      status: attempt.status,
      destination: attempt.destination,
      correlationId: attempt.correlationId
    };
    if (outcome.status === "failed") {
      loggingService.warn("activation.delivery.failed", logPayload);
    } else if (outcome.status === "not_configured") {
      loggingService.warn("activation.delivery.not_configured", logPayload);
    } else {
      loggingService.info("activation.delivery.sent", logPayload);
    }
    return result;
  }
}
