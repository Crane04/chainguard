import { Schema, model, Document, Types } from "mongoose";

export interface IHashChain extends Document {
  _id: Types.ObjectId;
  evidenceId: Types.ObjectId;
  hash: string;
  previousHash: string | null;
  createdAt: Date;
}

const HashChainSchema = new Schema<IHashChain>({
  evidenceId: { type: Schema.Types.ObjectId, ref: "Evidence", required: true, index: true },
  hash: { type: String, required: true },
  previousHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, immutable: true }
});

// Append-only: no route in this codebase ever calls updateOne/deleteOne
// on this collection. Each new entry's previousHash must equal the hash
// of the most recent entry for the same evidenceId — that link is the chain.

export const HashChain = model<IHashChain>("HashChain", HashChainSchema);
