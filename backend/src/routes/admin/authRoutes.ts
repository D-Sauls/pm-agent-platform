import { Router } from "express";
import { z } from "zod";
import { adminAuthService } from "../../context/platformContext.js";
import { requireAdminAuth } from "../../middleware/AdminAuthMiddleware.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const adminAuthRoutes = Router();

adminAuthRoutes.get("/mode", (_req, res) => {
  res.json({ mode: adminAuthService.getMode() });
});

adminAuthRoutes.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Invalid login payload",
      requestId: req.requestId,
      details: parsed.error.flatten()
    });
  }

  try {
    const session = await adminAuthService.login(parsed.data.email, parsed.data.password);
    res.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    res.status(401).json({ code: "UNAUTHORIZED", message, requestId: req.requestId });
  }
});

adminAuthRoutes.get("/me", requireAdminAuth, (req, res) => {
  res.json({ user: req.adminUser });
});
