import { Response } from "express";

export const ApiResponse = {
  success(res: Response, statusCode: number, data: Record<string, unknown>) {
    return res.status(statusCode).json(data);
  },
  error(res: Response, statusCode: number, message: string) {
    return res.status(statusCode).json({ error: message });
  }
};
