import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import type { DrizzleInstance } from '../db'

/**
 * JWT Payload
 */
export interface JWTPayload {
  userId: string
  username: string
  role: 'admin' | 'viewer'
}

/**
 * 认证服务
 */
export class AuthService {
  private jwtSecret: Uint8Array

  constructor(
    private db: DrizzleInstance,
    jwtSecret: string
  ) {
    this.jwtSecret = new TextEncoder().encode(jwtSecret)
  }

  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<{ token: string; user: any } | null> {
    // 查找用户
    const userList = await this.db.select().from(users).where(eq(users.username, username)).limit(1)

    if (userList.length === 0) {
      return null
    }

    const user = userList[0]

    // 验证密码
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return null
    }

    // 生成 JWT
    const token = await this.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    }
  }

  /**
   * 验证 JWT Token
   */
  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret)
      return payload as JWTPayload
    } catch (err) {
      return null
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    // 查找用户
    const userList = await this.db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (userList.length === 0) {
      return false
    }

    const user = userList[0]

    // 验证旧密码
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!isValid) {
      return false
    }

    // 生成新密码哈希
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await this.db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    return true
  }

  /**
   * 生成 JWT Token
   */
  private async generateToken(payload: JWTPayload): Promise<string> {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // 7 天过期
      .sign(this.jwtSecret)

    return token
  }

  /**
   * 获取用户信息
   */
  async getUserById(userId: string) {
    const userList = await this.db.select().from(users).where(eq(users.id, userId)).limit(1)

    if (userList.length === 0) {
      return null
    }

    const user = userList[0]

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}

