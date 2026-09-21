import { Request } from "express";
import { Types } from "mongoose";
import { validateSyncPayload } from "../../src/validators/custodyValidators";
import { mockResponse } from "../helpers/mockExpress";

function buildValidEntry(overrides: Record<string, unknown> = {}) {
  return {
    evidenceId: new Types.ObjectId().toString(),
    actor: "field-agent",
    action: "VIEW",
    resultingHash: "abc123",
    occurredAt: "2026-01-01T00:00:00Z",
    ...overrides
  };
}

describe("validateSyncPayload", () => {
  it("calls next() for a valid payload", () => {
    const req = { body: { entries: [buildValidEntry()] } } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateSyncPayload(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responds 400 when entries is missing or empty", () => {
    const req = { body: { entries: [] } } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateSyncPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "entries must be a non-empty array" });
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 400 for an invalid evidenceId", () => {
    const req = {
      body: { entries: [buildValidEntry({ evidenceId: "bad-id" })] }
    } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateSyncPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid evidenceId: bad-id" });
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 400 when a required field is missing", () => {
    const entry = buildValidEntry();
    delete (entry as Record<string, unknown>).actor;
    const req = { body: { entries: [entry] } } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateSyncPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Each entry requires actor, resultingHash, and occurredAt"
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 400 for an action outside the valid enum", () => {
    const req = {
      body: { entries: [buildValidEntry({ action: "DESTROY" })] }
    } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateSyncPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid action: DESTROY" });
    expect(next).not.toHaveBeenCalled();
  });
});
