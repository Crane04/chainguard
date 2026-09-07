import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { CustodyLog, CustodyAction } from "../models/CustodyLog";

export const custodyRouter = Router();

interface QueuedEntry {
  evidenceId: string;
  actor: string;
  action: CustodyAction;
  resultingHash: string;
  occurredAt: string; // ISO timestamp captured on-device while offline
  notes?: string;
}

/**
 * @openapi
 * /custody/sync:
 *   post:
 *     summary: Sync a batch of custody entries queued while offline
 *     description: >
 *       Accepts custody log entries that were recorded locally on a device with no network
 *       connection (e.g. hashes computed and queued in the field), and inserts them with
 *       offline set to true. Each entry keeps its original on-device timestamp.
 *     tags: [Custody]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     evidenceId:
 *                       type: string
 *                     actor:
 *                       type: string
 *                     action:
 *                       type: string
 *                     resultingHash:
 *                       type: string
 *                     occurredAt:
 *                       type: string
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Entries synced
 *       400:
 *         description: Invalid payload
 */
custodyRouter.post("/sync", async (req: Request, res: Response) => {
  const { entries } = req.body as { entries: QueuedEntry[] };

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "entries must be a non-empty array" });
  }

  const invalid = entries.find((e) => !Types.ObjectId.isValid(e.evidenceId));
  if (invalid) {
    return res.status(400).json({ error: `Invalid evidenceId: ${invalid.evidenceId}` });
  }

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

  return res.status(201).json({ synced: inserted.length, entries: inserted });
});
