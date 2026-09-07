import { Schema, model, Document, Types } from "mongoose";

export interface IMetadata extends Document {
  _id: Types.ObjectId;
  evidenceId: Types.ObjectId;
  raw: Record<string, unknown> | null; // full exifr output, stored as-is
  make: string | null;
  cameraModel: string | null;
  software: string | null;
  dateTimeOriginal: Date | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  c2paPresent: boolean; // placeholder — C2PA/Content Credentials verification is not implemented yet
  flags: string[]; // heuristic observations, not verdicts
  createdAt: Date;
}

const MetadataSchema = new Schema<IMetadata>({
  evidenceId: { type: Schema.Types.ObjectId, ref: "Evidence", required: true, unique: true },
  raw: { type: Schema.Types.Mixed, default: null },
  make: { type: String, default: null },
  cameraModel: { type: String, default: null },
  software: { type: String, default: null },
  dateTimeOriginal: { type: Date, default: null },
  gpsLatitude: { type: Number, default: null },
  gpsLongitude: { type: Number, default: null },
  c2paPresent: { type: Boolean, default: false },
  flags: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now, immutable: true }
});

// Written once at intake from the immutable original file — never updated or deleted,
// same one-way-door rule as Evidence.

export const Metadata = model<IMetadata>("Metadata", MetadataSchema);
