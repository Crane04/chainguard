import { Request } from "express";
import { Types } from "mongoose";
import { validateObjectId, validateIntake, validateVerifyBody } from "../../src/validators/evidenceValidators";
import { mockResponse } from "../helpers/mockExpress";

describe("validateObjectId", () => {
  it("calls next() for a well-formed ObjectId", () => {
    const req = { params: { id: new Types.ObjectId().toString() } } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateObjectId("id")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responds 400 for a malformed id and does not call next()", () => {
    const req = { params: { id: "not-an-object-id" } } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateObjectId("id")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid id" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("validateIntake", () => {
  it("calls next() when a file and actor are both present", () => {
    const req = { file: { originalname: "a.png" }, body: { actor: "tester" } } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateIntake(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("responds 400 when no file is provided", () => {
    const req = { file: undefined, body: { actor: "tester" } } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateIntake(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "No file provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 400 when actor is missing", () => {
    const req = { file: { originalname: "a.png" }, body: {} } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateIntake(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "actor is required" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("validateVerifyBody", () => {
  it("calls next() when actor is present", () => {
    const req = { body: { actor: "tester" } } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateVerifyBody(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("responds 400 when actor is missing", () => {
    const req = { body: {} } as unknown as Request;
    const res = mockResponse();
    const next = jest.fn();

    validateVerifyBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "actor is required" });
    expect(next).not.toHaveBeenCalled();
  });
});
