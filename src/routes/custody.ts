import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as custodyController from "../controllers/custodyController";
import { validateSyncPayload } from "../validators/custodyValidators";

export const custodyRouter = Router();

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
custodyRouter.post("/sync", validateSyncPayload, asyncHandler(custodyController.sync));
