export interface RateLimitPolicy {
  name: string;
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  consume(key: string, policy: RateLimitPolicy): RateLimitDecision {
    const now = Date.now();
    const scopedKey = `${policy.name}:${key}`;
    const current = this.buckets.get(scopedKey);
    if (!current || current.resetAt <= now) {
      const resetAt = now + policy.windowMs;
      this.buckets.set(scopedKey, { count: 1, resetAt });
      return {
        allowed: true,
        limit: policy.maxRequests,
        remaining: Math.max(0, policy.maxRequests - 1),
        retryAfterSeconds: Math.ceil(policy.windowMs / 1000)
      };
    }

    current.count += 1;
    const allowed = current.count <= policy.maxRequests;
    return {
      allowed,
      limit: policy.maxRequests,
      remaining: Math.max(0, policy.maxRequests - current.count),
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }
}
