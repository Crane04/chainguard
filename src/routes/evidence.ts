import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { upload } from "../middleware/upload";
import { Evidence } from "../models/Evidence";
import { HashChain } from "../models/HashChain";
import { CustodyLog } from "../models/CustodyLog";
import { Metadata } from "../models/Metadata";
import { sha256 } from "../services/hashing";
import { uploadToR2, downloadFromR2 } from "../services/r2";
import { extractMetadata } from "../services/metadata";

export const evidenceRouter = Router();

const METADATA_FLAG_MESSAGES: Record<string, string> = {
  NO_EXIF_DATA:
    "This file carries no camera or origin metadata — it may have been downloaded, screenshotted, or stripped by another app before upload.",
  NO_CAPTURE_DEVICE_INFO: "The file has some embedded metadata, but no camera or device information.",
  EDITED_WITH_SOFTWARE: "This file's metadata shows it was opened or edited in image-editing software.",
  NO_GPS_DATA: "No location data is attached to this file."
};

function describeMetadataFlags(flags: string[]): string[] {
  return flags.map((flag) => METADATA_FLAG_MESSAGES[flag] ?? flag);
}

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
evidenceRouter.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { actor } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }
    if (!actor) {
      return res.status(400).json({ error: "actor is required" });
    }

    const hash = sha256(file.buffer);
    const r2Key = await uploadToR2(file.buffer, file.originalname, file.mimetype);

    const evidence = await Evidence.create({
      fileName: file.originalname,
      r2Key,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      originalHash: hash
    });

    // Genesis entry in the hash chain — previousHash is null because there's nothing before it.
    await HashChain.create({
      evidenceId: evidence._id,
      hash,
      previousHash: null
    });

    await CustodyLog.create({
      evidenceId: evidence._id,
      actor,
      action: "INTAKE",
      resultingHash: hash,
      offline: false
    });

    const extracted = await extractMetadata(file.buffer);
    const metadata = await Metadata.create({
      evidenceId: evidence._id,
      ...extracted
    });

    return res.status(201).json({ evidence, metadata });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to intake evidence" });
  }
});

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
evidenceRouter.get("/", async (_req: Request, res: Response) => {
  const items = await Evidence.find().sort({ createdAt: -1 });
  return res.json({ evidence: items });
});

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
evidenceRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const evidence = await Evidence.findById(id);
  if (!evidence) {
    return res.status(404).json({ error: "Evidence not found" });
  }

  const latestChainEntry = await HashChain.findOne({ evidenceId: id }).sort({ createdAt: -1 });

  return res.json({ evidence, currentHash: latestChainEntry?.hash ?? null });
});

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
evidenceRouter.post("/:id/verify", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { actor } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (!actor) {
    return res.status(400).json({ error: "actor is required" });
  }

  const evidence = await Evidence.findById(id);
  if (!evidence) {
    return res.status(404).json({ error: "Evidence not found" });
  }

  const latestChainEntry = await HashChain.findOne({ evidenceId: id }).sort({ createdAt: -1 });
  if (!latestChainEntry) {
    return res.status(500).json({ error: "No chain entry found for this evidence — data integrity issue" });
  }

  const currentFile = await downloadFromR2(evidence.r2Key);
  const currentHash = sha256(currentFile);

  const isUnaltered = currentHash === latestChainEntry.hash;

  await CustodyLog.create({
    evidenceId: id,
    actor,
    action: "VERIFY",
    resultingHash: currentHash,
    offline: false,
    notes: isUnaltered ? "Verification passed" : "Verification FAILED — hash mismatch"
  });

  return res.json({
    status: isUnaltered ? "UNALTERED" : "ALTERED",
    recordedHash: latestChainEntry.hash,
    computedHash: currentHash,
    message: isUnaltered
      ? `This file has not been altered since it was recorded.`
      : `This file does not match its recorded hash. Do not rely on it.`
  });
});

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
evidenceRouter.get("/:id/custody", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const trail = await CustodyLog.find({ evidenceId: id }).sort({ createdAt: 1 });
  return res.json({ custodyTrail: trail });
});

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
evidenceRouter.get("/:id/metadata", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const metadata = await Metadata.findOne({ evidenceId: id });
  if (!metadata) {
    return res.status(404).json({ error: "No metadata found for this evidence item" });
  }

  return res.json({ metadata });
});

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
evidenceRouter.get("/:id/report", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const evidence = await Evidence.findById(id);
  if (!evidence) {
    return res.status(404).json({ error: "Evidence not found" });
  }

  const latestVerify = await CustodyLog.findOne({ evidenceId: id, action: "VERIFY" }).sort({
    createdAt: -1
  });

  const trail = await CustodyLog.find({ evidenceId: id }).sort({ createdAt: 1 });
  const metadata = await Metadata.findOne({ evidenceId: id });

  const isUnaltered = latestVerify ? latestVerify.resultingHash === evidence.originalHash : true;

  return res.json({
    fileName: evidence.fileName,
    collectedAt: evidence.createdAt,
    summary: isUnaltered
      ? `This file has not been altered since it was collected on ${evidence.createdAt.toDateString()}.`
      : `This file has been altered since it was collected. Its authenticity cannot be confirmed.`,
    lastVerifiedAt: latestVerify?.createdAt ?? null,
    metadataSummary: {
      capturedOn: metadata?.make && metadata?.cameraModel ? `${metadata.make} ${metadata.cameraModel}` : null,
      capturedAt: metadata?.dateTimeOriginal ?? null,
      notes: metadata ? describeMetadataFlags(metadata.flags) : ["No metadata was recorded for this file."]
    },
    custodyEvents: trail.map((entry) => ({
      when: entry.createdAt,
      who: entry.actor,
      what: entry.action,
      offline: entry.offline
    }))
  });
});
