import assert from "node:assert/strict";
import test from "node:test";
import { activationDeliveryReadiness } from "../src/core/services/hr/ActivationDeliveryReadiness.js";

test("activation delivery readiness allows local demo mode with warning", () => {
  const result = activationDeliveryReadiness({
    appEnv: "local",
    activationDeliveryMode: "log",
    activationEmailProvider: "sendgrid",
    activationBaseUrl: "http://localhost:5173",
    activationSenderEmail: "no-reply@localhost",
    sendGridApiKey: "",
    sendGridSenderVerified: false
  });

  assert.equal(result.ready, true);
  assert.ok(result.warnings.some((warning) => warning.includes("local/demo mode")));
});

test("activation delivery readiness blocks incomplete production SendGrid setup", () => {
  const result = activationDeliveryReadiness({
    appEnv: "production",
    activationDeliveryMode: "log",
    activationEmailProvider: "sendgrid",
    activationBaseUrl: "http://localhost:5173",
    activationSenderEmail: "no-reply@localhost",
    sendGridApiKey: "",
    sendGridSenderVerified: false
  });

  assert.equal(result.ready, false);
  assert.ok(result.warnings.some((warning) => warning.includes("email mode")));
  assert.ok(result.warnings.some((warning) => warning.includes("SENDGRID_API_KEY")));
  assert.ok(result.warnings.some((warning) => warning.includes("verified non-local sender")));
  assert.ok(result.warnings.some((warning) => warning.includes("SENDGRID_SENDER_VERIFIED")));
  assert.ok(result.warnings.some((warning) => warning.includes("public HTTPS")));
});

test("activation delivery readiness passes complete production SendGrid setup", () => {
  const result = activationDeliveryReadiness({
    appEnv: "production",
    activationDeliveryMode: "email",
    activationEmailProvider: "sendgrid",
    activationBaseUrl: "https://onboarding.example.com/activate",
    activationSenderEmail: "no-reply@example.com",
    sendGridApiKey: "sendgrid-secret",
    sendGridSenderVerified: true
  });

  assert.equal(result.ready, true);
  assert.deepEqual(result.warnings, []);
});
