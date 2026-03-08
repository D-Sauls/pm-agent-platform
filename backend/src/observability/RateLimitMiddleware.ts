import type { NextFunction, Request, Response } from "express";
import { LoggingService } from "./LoggingService.js";
import type { RateLimitPolicy } from "./RateLimitService.js";
import { RateLimitService } from "./RateLimitService.js";

export function rateLimitMiddleware(
  rateLimitService: RateLimitService,
  logger: LoggingService,
  policyResolver: (req: Request) => RateLimitPolicy | null
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const policy = policyResolver(req);
    if (!policy) {
      next();
      return;
    }

    const key = [
      req.tenantId ?? req.params.tenantId ?? "unknown-tenant",
      req.userContext?.userId ?? req.authUser?.userId ?? "anonymous",
      req.ip
    ].join(":");
    const decision = rateLimitService.consume(key, policy);
    res.setHeader("x-ratelimit-limit", decision.limit.toString());
    res.setHeader("x-ratelimit-remaining", decision.remaining.toString());
    res.setHeader("x-ratelimit-policy", policy.name);

    if (decision.allowed) {
      next();
      return;
    }

    logger.warn("request.rate_limited", {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
      tenantId: req.tenantId ?? req.params.tenantId,
      policy: policy.name
    });

    res.setHeader("retry-after", decision.retryAfterSeconds.toString());
    res.status(429).json({
      code: "RATE_LIMITED",
      message: "Rate limit exceeded",
      requestId: req.requestId,
      details: {
        policy: policy.name,
        retryAfterSeconds: decision.retryAfterSeconds
      }
    });
  };
}
