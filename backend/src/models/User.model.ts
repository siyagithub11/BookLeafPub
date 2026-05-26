
import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "author" | "admin";

export interface IUser extends Document {
  authorId: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  city?: string;
  joinedDate: Date;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSafeObject(): Record<string, unknown>;
}

const userSchema = new Schema<IUser>(
  {
    authorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    joinedDate: { type: Date, default: Date.now },
    role: { type: String, enum: ["author", "admin"], default: "author", index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

// Mongoose v8: pre hooks are async-friendly without calling next()
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password as string);
};

userSchema.methods.toSafeObject = function (): Record<string, unknown> {
  const obj = this.toObject() as Record<string, unknown>;
  delete obj.password;
  return obj;
};

export const User = mongoose.model<IUser>("User", userSchema);