import type { NextFunction, Request, Response } from "express";
import type { AdminRole } from "../models/AdminUser.js";

export function requireAdminRole(allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.adminUser?.role;
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: "Insufficient admin permissions" });
      return;
    }
    next();
  };
}
