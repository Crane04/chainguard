import { Router } from "express";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";
import * as evidenceController from "../controllers/evidenceController";
import { validateObjectId, validateIntake, validateVerifyBody } from "../validators/evidenceValidators";

export const evidenceRouter = Router();

/**
 * @openapi
 * /evidence:
 *   post:
 *     summary: Intake a new piece of evidence
 *     description: >
 *       Uploads a file to Cloudflare R2, computes its SHA-256 hash, creates the
 *       genesis entry in its hash chain, and records the first custody log entry (INTAKE).
 *     tags: [Evidence]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               actor:
 *                 type: string
 *                 description: Name/ID of the person submitting the evidence
 *     responses:
 *       201:
 *         description: Evidence recorded
 *       400:
 *         description: Missing file or actor
 */
evidenceRouter.post("/", upload.single("file"), validateIntake, asyncHandler(evidenceController.intake));

/**
 * @openapi
 * /evidence:
 *   get:
 *     summary: List all evidence items
 *     tags: [Evidence]
 *     responses:
 *       200:
 *         description: List of evidence items
 */
evidenceRouter.get("/", asyncHandler(evidenceController.list));

/**
 * @openapi
 * /evidence/{id}:
 *   get:
 *     summary: Get a single evidence item plus its current recorded hash
 *     tags: [Evidence]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Evidence item with latest chain hash
 *       404:
 *         description: Not found
 */
evidenceRouter.get("/:id", validateObjectId("id"), asyncHandler(evidenceController.getOne));

/**
 * @openapi
 * /evidence/{id}/verify:
 *   post:
 *     summary: Re-hash the stored file and compare it against the recorded chain
 *     description: >
 *       Downloads the file currently stored in R2 for this evidence item, re-computes its
 *       SHA-256 hash, and compares it to the most recent hash recorded in the chain.
 *       Logs a VERIFY custody entry either way. This is the core tamper-detection check.
 *     tags: [Evidence]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actor:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification result
 *       404:
 *         description: Not found
 */
evidenceRouter.post(
  "/:id/verify",
  validateObjectId("id"),
  validateVerifyBody,
  asyncHandler(evidenceController.verify)
);

/**
 * @openapi
 * /evidence/{id}/custody:
 *   get:
 *     summary: Get the full custody trail for one evidence item
 *     tags: [Evidence]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ordered list of custody log entries
 */
evidenceRouter.get("/:id/custody", validateObjectId("id"), asyncHandler(evidenceController.getCustody));

/**
 * @openapi
 * /evidence/{id}/metadata:
 *   get:
 *     summary: Get the extracted EXIF/origin metadata for one evidence item
 *     description: >
 *       Returns whatever EXIF metadata (camera make/model, capture timestamp, GPS,
 *       editing software) was found in the file at intake, plus heuristic flags for
 *       suspicious absences. These are observations, not a verdict on authenticity.
 *     tags: [Evidence]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Extracted metadata record
 *       404:
 *         description: Not found
 */
evidenceRouter.get("/:id/metadata", validateObjectId("id"), asyncHandler(evidenceController.getMetadata));

/**
 * @openapi
 * /evidence/{id}/report:
 *   get:
 *     summary: Get a plain-language report for one evidence item
 *     description: >
 *       Returns a non-technical summary of the item's integrity status and custody history,
 *       intended for a judge or panel member with no technical background.
 *     tags: [Evidence]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plain-language report
 */
evidenceRouter.get("/:id/report", validateObjectId("id"), asyncHandler(evidenceController.getReport));
