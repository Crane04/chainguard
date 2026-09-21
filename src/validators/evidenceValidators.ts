import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { ApiResponse } from "../utils/ApiResponse";

export function validateObjectId(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!Types.ObjectId.isValid(req.params[paramName])) {
      return ApiResponse.error(res, 400, "Invalid id");
    }
    next();
  };
}

export function validateIntake(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return ApiResponse.error(res, 400, "No file provided");
  }
  if (!req.body.actor) {
    return ApiResponse.error(res, 400, "actor is required");
  }
  next();
}

export function validateVerifyBody(req: Request, res: Response, next: NextFunction) {
  if (!req.body.actor) {
    return ApiResponse.error(res, 400, "actor is required");
  }
  next();
}
