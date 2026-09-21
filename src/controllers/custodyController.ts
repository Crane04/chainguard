import { Request, Response } from "express";
import { CustodyLog, CustodyAction } from "../models/CustodyLog";
import { ApiResponse } from "../utils/ApiResponse";

interface QueuedEntry {
  evidenceId: string;
  actor: string;
  action: CustodyAction;
  resultingHash: string;
  occurredAt: string; // ISO timestamp captured on-device while offline
  notes?: string;
}

export async function sync(req: Request, res: Response) {
  const { entries } = req.body as { entries: QueuedEntry[] };

  const docs = entries.map((e) => ({
    evidenceId: e.evidenceId,
    actor: e.actor,
    action: e.action,
    resultingHash: e.resultingHash,
    offline: true,
    notes: e.notes,
    createdAt: new Date(e.occurredAt) // preserve the time it actually happened in the field
  }));

  const inserted = await CustodyLog.insertMany(docs);

  return ApiResponse.success(res, 201, { synced: inserted.length, entries: inserted });
}
