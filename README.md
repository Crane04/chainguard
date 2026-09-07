# Digital Evidence Integrity — Backend

ICSC 2026 Hackathon, Track H (Media, Information Integrity & Civic Trust).

A chain-of-custody API that proves two things about a piece of digital evidence:
1. It hasn't changed since it was collected.
2. Exactly who has handled it since, and what they did.

## Stack

- Node.js + Express + TypeScript
- MongoDB (Mongoose)
- Cloudflare R2 for file storage (S3-compatible API)
- Swagger (`swagger-jsdoc` + `swagger-ui-express`) for API docs

## Setup

```bash
npm install
cp .env.example .env
# fill in .env with your MongoDB URI and Cloudflare R2 credentials
npm run dev
```

Server runs on `http://localhost:4000` by default.
Swagger docs: `http://localhost:4000/api-docs`

## Environment variables

See `.env.example`. You need:
- `MONGODB_URI` — a running MongoDB instance (local or Atlas)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT` — from your Cloudflare dashboard (R2 > Manage API Tokens)

## How it works

**Intake (`POST /evidence`)**
File is uploaded to R2, hashed with SHA-256, and three things get written:
- an `Evidence` document (the file's metadata + its original hash)
- a genesis `HashChain` entry (`previousHash: null`)
- an `INTAKE` entry in the `CustodyLog`

**Verification (`POST /evidence/:id/verify`)**
Re-downloads the file from R2, re-hashes it, and compares the result to the most
recent hash on record. Returns `UNALTERED` or `ALTERED`, and logs a `VERIFY`
custody entry either way. This is the core tamper-detection check — and the
live "tamper a file, catch it" demo moment.

**Custody trail (`GET /evidence/:id/custody`)**
Full list of everyone who has touched a given piece of evidence, in order.

**Report (`GET /evidence/:id/report`)**
A plain-language summary, meant to be read by a judge or panel member with no
technical background — no raw hashes in the headline text.

**Offline sync (`POST /custody/sync`)**
Accepts a batch of custody entries that were recorded on a device with no
network connection, and inserts them tagged `offline: true`, preserving their
original on-device timestamp.

## Design notes

- `HashChain` and `CustodyLog` are append-only by convention: no route in this
  codebase ever calls `updateOne` or `deleteOne` on either collection.
- Files are held in memory (`multer.memoryStorage()`) just long enough to hash
  and upload — nothing touches local disk on the server.
- No blockchain. A hash chain (each entry references the previous entry's hash)
  is sufficient to make tampering detectable, which is what the brief asks for.

## API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/evidence` | Intake new evidence (multipart file + actor) |
| GET | `/evidence` | List all evidence |
| GET | `/evidence/:id` | Get one item + current hash |
| POST | `/evidence/:id/verify` | Re-hash and compare — tamper check |
| GET | `/evidence/:id/custody` | Full custody trail |
| GET | `/evidence/:id/report` | Plain-language report |
| POST | `/custody/sync` | Sync offline-queued custody entries |

Full request/response schemas are in Swagger at `/api-docs` once the server is running.
