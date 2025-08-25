import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ROLES } from '../db/schema/roles';

@Injectable()
export class AuthService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private db: NodePgDatabase<typeof import('../db/schema')>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await this.db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: ROLES.USER,
      })
      .returning();

    return {
      message: 'User registered successfully',
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        role: newUser[0].role,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    // Find user by email
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.password) {
      return null;
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    // Return user without password
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async generateToken(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...result } = user;
    return result;
  }

  async validateGoogleUser(profile: any) {
    const { email, given_name, family_name, picture, sub } = profile._json;

    // Check if user exists
    let user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // If user doesn't exist, create one
    if (!user) {
      const newUser = await this.db
        .insert(users)
        .values({
          email,
          googleId: sub,
          firstName: given_name,
          lastName: family_name,
          profilePicture: picture,
          role: ROLES.USER,
        })
        .returning();

      user = newUser[0];
    }
    // If user exists but doesn't have googleId, update it
    else if (!user.googleId) {
      await this.db
        .update(users)
        .set({
          googleId: sub,
          profilePicture: user.profilePicture || picture, // Use Google profile picture if user doesn't have an avatar
        })
        .where(eq(users.id, user.id));
    }

    // Generate JWT token
    return this.generateToken(user);
  }
}
