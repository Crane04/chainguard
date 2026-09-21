import { Request, Response } from "express";
import { Evidence } from "../models/Evidence";
import { HashChain } from "../models/HashChain";
import { CustodyLog } from "../models/CustodyLog";
import { Metadata } from "../models/Metadata";
import { sha256 } from "../services/hashing";
import { uploadToR2, downloadFromR2 } from "../services/r2";
import { extractMetadata, describeMetadataFlags } from "../services/metadata";
import { ApiResponse } from "../utils/ApiResponse";

export async function intake(req: Request, res: Response) {
  const file = req.file as Express.Multer.File;
  const { actor } = req.body;

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

  return ApiResponse.success(res, 201, { evidence, metadata });
}

export async function list(_req: Request, res: Response) {
  const items = await Evidence.find().sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, { evidence: items });
}

export async function getOne(req: Request, res: Response) {
  const { id } = req.params;

  const evidence = await Evidence.findById(id);
  if (!evidence) {
    return ApiResponse.error(res, 404, "Evidence not found");
  }

  const latestChainEntry = await HashChain.findOne({ evidenceId: id }).sort({ createdAt: -1 });

  return ApiResponse.success(res, 200, { evidence, currentHash: latestChainEntry?.hash ?? null });
}

export async function verify(req: Request, res: Response) {
  const { id } = req.params;
  const { actor } = req.body;

  const evidence = await Evidence.findById(id);
  if (!evidence) {
    return ApiResponse.error(res, 404, "Evidence not found");
  }

  const latestChainEntry = await HashChain.findOne({ evidenceId: id }).sort({ createdAt: -1 });
  if (!latestChainEntry) {
    return ApiResponse.error(res, 500, "No chain entry found for this evidence — data integrity issue");
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

  return ApiResponse.success(res, 200, {
    status: isUnaltered ? "UNALTERED" : "ALTERED",
    recordedHash: latestChainEntry.hash,
    computedHash: currentHash,
    message: isUnaltered
      ? `This file has not been altered since it was recorded.`
      : `This file does not match its recorded hash. Do not rely on it.`
  });
}

export async function getCustody(req: Request, res: Response) {
  const { id } = req.params;

  const trail = await CustodyLog.find({ evidenceId: id }).sort({ createdAt: 1 });
  return ApiResponse.success(res, 200, { custodyTrail: trail });
}

export async function getMetadata(req: Request, res: Response) {
  const { id } = req.params;

  const metadata = await Metadata.findOne({ evidenceId: id });
  if (!metadata) {
    return ApiResponse.error(res, 404, "No metadata found for this evidence item");
  }

  return ApiResponse.success(res, 200, { metadata });
}

export async function getReport(req: Request, res: Response) {
  const { id } = req.params;

  const evidence = await Evidence.findById(id);
  if (!evidence) {
    return ApiResponse.error(res, 404, "Evidence not found");
  }

  const latestVerify = await CustodyLog.findOne({ evidenceId: id, action: "VERIFY" }).sort({
    createdAt: -1
  });

  const trail = await CustodyLog.find({ evidenceId: id }).sort({ createdAt: 1 });
  const metadata = await Metadata.findOne({ evidenceId: id });

  const isUnaltered = latestVerify ? latestVerify.resultingHash === evidence.originalHash : true;

  return ApiResponse.success(res, 200, {
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
}
