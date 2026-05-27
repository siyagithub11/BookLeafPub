
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { Response } from "express";
import { env } from "../config/env";
import { userRepository } from "../repositories/user.repository";
import { IUser } from "../models/User.model";
import { UnauthorizedError } from "../errors/AppError";
import { logger } from "../config/logger";

interface LoginResult {
  user: Record<string, unknown>;
  token: string;
}

export class AuthService {
 async login(email: string, password: string): Promise<LoginResult> {
  console.log("=== LOGIN DEBUG ===");
  console.log("Email received:", email);
  console.log("Password received:", password);

  const user = await userRepository.findByEmailWithPassword(email);
  console.log("User found:", user ? "YES" : "NO");

  if (!user) throw new UnauthorizedError("Invalid email or password");

  console.log("Password in DB:", user.password ? user.password.substring(0, 15) + "..." : "UNDEFINED");

  const passwordMatch = await user.comparePassword(password);
  console.log("Password match:", passwordMatch);
  console.log("=================");

  if (!passwordMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = this.signToken(user);
  return { user: user.toSafeObject(), token };
}
  async getMe(userId: string): Promise<IUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError("User not found");
    return user;
  }

  signToken(user: IUser): string {
    const id = (user._id as Types.ObjectId).toString();
    return jwt.sign(
      { id, email: user.email, role: user.role, name: user.name },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );
  }
setCookieToken(res: Response, token: string): void {
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

clearCookieToken(res: Response): void {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
  });
}
}

export const authService = new AuthService();