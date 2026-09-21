import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { ApiResponse } from "../utils/ApiResponse";
import { CustodyAction } from "../models/CustodyLog";

const VALID_ACTIONS: CustodyAction[] = ["INTAKE", "VIEW", "EXPORT", "TRANSFER", "VERIFY"];

interface QueuedEntry {
  evidenceId: string;
  actor: string;
  action: CustodyAction;
  resultingHash: string;
  occurredAt: string;
  notes?: string;
}

export function validateSyncPayload(req: Request, res: Response, next: NextFunction) {
  const { entries } = req.body as { entries: QueuedEntry[] };

  if (!Array.isArray(entries) || entries.length === 0) {
    return ApiResponse.error(res, 400, "entries must be a non-empty array");
  }

  for (const entry of entries) {
    if (!Types.ObjectId.isValid(entry.evidenceId)) {
      return ApiResponse.error(res, 400, `Invalid evidenceId: ${entry.evidenceId}`);
    }
    if (!entry.actor || !entry.resultingHash || !entry.occurredAt) {
      return ApiResponse.error(res, 400, "Each entry requires actor, resultingHash, and occurredAt");
    }
    if (!VALID_ACTIONS.includes(entry.action)) {
      return ApiResponse.error(res, 400, `Invalid action: ${entry.action}`);
    }
  }

  next();
}
