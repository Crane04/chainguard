import { Schema, model, Document, Types } from "mongoose";

export interface IEvidence extends Document {
  _id: Types.ObjectId;
  fileName: string;
  r2Key: string;
  mimeType: string;
  sizeBytes: number;
  originalHash: string; // SHA-256 computed at the moment of intake — never changes
  createdAt: Date;
}

const EvidenceSchema = new Schema<IEvidence>({
  fileName: { type: String, required: true },
  r2Key: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  originalHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, immutable: true }
});

// Evidence records are never updated or deleted through the app —
// intake is a one-way door. No pre-save hooks needed since we never mutate.

export const Evidence = model<IEvidence>("Evidence", EvidenceSchema);
