import { createHash } from 'crypto'
import { mkdir, writeFile, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * 媒体类型
 */
export type MediaType = 'cover' | 'avatar'

/**
 * 媒体缓存服务
 */
export class MediaService {
  private cacheDir: string
  private expirationDays: number

  constructor(cacheDir: string = './media', expirationDays: number = 7) {
    this.cacheDir = cacheDir
    this.expirationDays = expirationDays
  }

  /**
   * 缓存视频封面
   */
  async cacheCover(bvid: string, url: string): Promise<string> {
    return this.cacheMedia('cover', bvid, url)
  }

  /**
   * 缓存用户头像
   */
  async cacheAvatar(uid: string, url: string): Promise<string> {
    return this.cacheMedia('avatar', uid, url)
  }

  /**
   * 获取本地路径
   */
  getLocalPath(type: MediaType, id: string): string {
    const hash = this.hashId(id)
    return join(this.cacheDir, type, `${hash}.jpg`)
  }

  /**
   * 缓存媒体文件
   */
  private async cacheMedia(type: MediaType, id: string, url: string): Promise<string> {
    const localPath = this.getLocalPath(type, id)

    try {
      // 检查是否已缓存且未过期
      if (existsSync(localPath)) {
        const stats = await stat(localPath)
        const age = Date.now() - stats.mtimeMs
        const maxAge = this.expirationDays * 24 * 60 * 60 * 1000

        if (age < maxAge) {
          // 缓存未过期，直接返回
          return localPath
        }
      }

      // 确保目录存在
      await this.ensureDirectory(type)

      // 下载文件
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()

      // 保存文件
      await writeFile(localPath, Buffer.from(buffer))

      return localPath
    } catch (err) {
      console.error(`Failed to cache ${type} for ${id}:`, err)
      // 返回占位图路径
      return this.getPlaceholderPath(type)
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectory(type: MediaType): Promise<void> {
    const dir = join(this.cacheDir, type)
    await mkdir(dir, { recursive: true })
  }

  /**
   * 获取占位图路径
   */
  private getPlaceholderPath(type: MediaType): string {
    return join(this.cacheDir, 'placeholders', `${type}.jpg`)
  }

  /**
   * 生成 ID 哈希（用于文件名）
   */
  private hashId(id: string): string {
    return createHash('md5').update(id).digest('hex')
  }

  /**
   * 清理过期缓存
   * 
   * 注意：这个方法需要定期调用（例如通过定时任务）
   */
  async cleanupExpiredCache(): Promise<number> {
    let cleaned = 0
    const types: MediaType[] = ['cover', 'avatar']

    for (const type of types) {
      const dir = join(this.cacheDir, type)

      if (!existsSync(dir)) {
        continue
      }

      try {
        const fs = await import('fs/promises')
        const files = await fs.readdir(dir)

        for (const file of files) {
          const filePath = join(dir, file)
          const stats = await stat(filePath)
          const age = Date.now() - stats.mtimeMs
          const maxAge = this.expirationDays * 24 * 60 * 60 * 1000

          if (age >= maxAge) {
            await fs.unlink(filePath)
            cleaned++
          }
        }
      } catch (err) {
        console.error(`Failed to clean ${type} cache:`, err)
      }
    }

    console.log(`Cleaned ${cleaned} expired media files`)
    return cleaned
  }
}

