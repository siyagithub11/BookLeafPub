import { User, IUser, UserRole } from "../models/User.model";

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).lean() as Promise<IUser | null>;
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).select("+password");
  }

  async findById_plain(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).lean() as Promise<IUser | null>;
  }

  async findByAuthorId(authorId: string): Promise<IUser | null> {
    return User.findOne({ authorId }).lean() as Promise<IUser | null>;
  }

  async findAllByRole(role: UserRole): Promise<IUser[]> {
    return User.find({ role }).lean() as Promise<IUser[]>;
  }

  async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await User.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }
}

export const userRepository = new UserRepository();

