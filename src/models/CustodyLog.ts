import { Schema, model, Document, Types } from "mongoose";

export type CustodyAction = "INTAKE" | "VIEW" | "EXPORT" | "TRANSFER" | "VERIFY";

export interface ICustodyLog extends Document {
  _id: Types.ObjectId;
  evidenceId: Types.ObjectId;
  actor: string;
  action: CustodyAction;
  resultingHash: string;
  offline: boolean; // true if this entry was queued on a disconnected device and synced later
  notes?: string;
  createdAt: Date;
}

const CustodyLogSchema = new Schema<ICustodyLog>({
  evidenceId: { type: Schema.Types.ObjectId, ref: "Evidence", required: true, index: true },
  actor: { type: String, required: true },
  action: {
    type: String,
    enum: ["INTAKE", "VIEW", "EXPORT", "TRANSFER", "VERIFY"],
    required: true
  },
  resultingHash: { type: String, required: true },
  offline: { type: Boolean, default: false },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now, immutable: true }
});

// Append-only, same rule as HashChain.

export const CustodyLog = model<ICustodyLog>("CustodyLog", CustodyLogSchema);
