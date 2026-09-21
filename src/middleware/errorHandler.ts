import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../utils/ApiResponse";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  ApiResponse.error(res, 500, "Internal server error");
}
