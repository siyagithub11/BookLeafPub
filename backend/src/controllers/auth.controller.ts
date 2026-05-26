import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler, successResponse } from "../utils/helpers";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login(email, password);

  authService.setCookieToken(res, token);

  return successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorId: user.authorId,
    },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  authService.clearCookieToken(res);
  return successResponse(res, { message: "Logged out successfully" });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.id);
  return successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorId: user.authorId,
      phone: user.phone,
      city: user.city,
      joinedDate: user.joinedDate,
    },
  });
});