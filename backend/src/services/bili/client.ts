import { loadEnv } from '../../config/env'
import { wbiService } from './wbi'

const env = loadEnv()

/**
 * B站 API 客户端
 */
export class BiliClient {
  private readonly baseUrl = 'https://api.bilibili.com'
  private readonly passportUrl = 'https://passport.bilibili.com'
  private readonly userAgent: string

  constructor(userAgent?: string) {
    this.userAgent = userAgent || env.BILI_USER_AGENT
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<{ code: number; message: string; data: T; ttl?: number }> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': this.userAgent,
        'Referer': 'https://www.bilibili.com/',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const json = await response.json()
    return json
  }

  /**
   * 获取导航栏用户信息（用于获取 WBI keys）
   */
  async getNav(cookie?: string): Promise<any> {
    const headers: Record<string, string> = {}
    if (cookie) {
      headers['Cookie'] = cookie
    }

    const response = await this.request(this.baseUrl + '/x/web-interface/nav', {
      headers,
    })

    // 提取 WBI keys
    const keys = wbiService.extractKeysFromNav(response)
    if (keys) {
      wbiService.refreshKeys(keys.imgKey, keys.subKey)
    }

    return response
  }

  /**
   * 验证Cookie有效性
   * @param cookie 完整的Cookie字符串（必须包含SESSDATA）
   * @returns { valid, uid, nickname } - valid表示是否有效，uid和nickname仅在有效时返回
   */
  async validateCookie(cookie: string): Promise<{
    valid: boolean
    uid?: string
    nickname?: string
  }> {
    try {
      const response = await this.getNav(cookie)

      // code=0 且 isLogin=true 表示Cookie有效
      if (response.code === 0 && response.data?.isLogin) {
        return {
          valid: true,
          uid: String(response.data.mid),
          nickname: response.data.uname,
        }
      }

      return { valid: false }
    } catch (error) {
      console.error('Failed to validate cookie:', error)
      return { valid: false }
    }
  }

  /**
   * 生成二维码登录
   * @returns { qrcodeKey, qrUrl, expireAt }
   */
  async generateQrCode(): Promise<{
    qrcodeKey: string
    qrUrl: string
    expireAt: number
  }> {
    const response = await this.request<{
      url: string
      qrcode_key: string
    }>(this.passportUrl + '/x/passport-login/web/qrcode/generate')

    if (response.code !== 0) {
      throw new Error(`Failed to generate QR code: ${response.message}`)
    }

    // 二维码有效期通常为 180 秒
    const expireAt = Date.now() + 180 * 1000

    return {
      qrcodeKey: response.data.qrcode_key,
      qrUrl: response.data.url,
      expireAt,
    }
  }

  /**
   * 轮询二维码登录状态
   * @param qrcodeKey 二维码 key
   * @returns { code, message, cookie? }
   * - code: 0=成功, 86101=未扫码, 86090=已扫待确认, 86038=过期
   */
  async pollQrCodeStatus(qrcodeKey: string): Promise<{
    code: number
    message: string
    cookie?: string
  }> {
    const response = await this.request<{
      code: number
      message: string
      url?: string
    }>(this.passportUrl + `/x/passport-login/web/qrcode/poll?qrcode_key=${qrcodeKey}`)

    // ⚠️ 关键修复：B站 API 的外层 code 总是 0，真正的状态码在 data.code 里
    if (response.code !== 0) {
      throw new Error(`API error: ${response.message}`)
    }

    // 获取真正的状态码（在 data 里）
    const dataCode = response.data?.code ?? 0
    const dataMessage = response.data?.message || '未知状态'

    // 成功时从 URL 提取 Cookie
    let cookie: string | undefined
    if (dataCode === 0 && response.data?.url) {
      // URL 格式：https://passport.bilibili.com/xxx?SESSDATA=xxx&bili_jct=xxx
      const urlObj = new URL(response.data.url)
      const sessdata = urlObj.searchParams.get('SESSDATA')
      const biliJct = urlObj.searchParams.get('bili_jct')

      if (sessdata && biliJct) {
        cookie = `SESSDATA=${sessdata}; bili_jct=${biliJct}`
      }
    }

    return {
      code: dataCode,
      message: dataMessage,
      cookie,
    }
  }

  /**
   * 轮询二维码状态（简化版，返回标准化状态）
   * @param qrcodeKey 二维码 key
   * @returns { status, cookie? }
   * - status: 'pending'=未扫码, 'scanned'=已扫待确认, 'confirmed'=成功, 'expired'=过期
   */
  async pollQrcode(qrcodeKey: string): Promise<{
    status: 'pending' | 'scanned' | 'confirmed' | 'expired'
    cookie?: string
  }> {
    const result = await this.pollQrCodeStatus(qrcodeKey)

    // 映射B站状态码到标准化状态
    const statusMap: Record<number, 'pending' | 'scanned' | 'confirmed' | 'expired'> = {
      86101: 'pending',
      86090: 'scanned',
      0: 'confirmed',
      86038: 'expired',
    }

    return {
      status: statusMap[result.code] || 'expired',
      cookie: result.cookie,
    }
  }

  /**
   * 获取视频信息
   * @param bvid 视频 BV 号
   * @returns { bvid, title, cid, pubdate, owner: { mid, name } }
   */
  async getVideoView(bvid: string): Promise<{
    bvid: string
    title: string
    cid: number
    pubdate: number
    owner: {
      mid: number
      name: string
    }
  }> {
    const response = await this.request<{
      bvid: string
      title: string
      cid: number
      pubdate: number
      owner: {
        mid: number
        name: string
      }
    }>(this.baseUrl + `/x/web-interface/view?bvid=${bvid}`)

    if (response.code !== 0) {
      throw new Error(`Failed to get video info: ${response.message}`)
    }

    return {
      bvid: response.data.bvid,
      title: response.data.title,
      cid: response.data.cid,
      pubdate: response.data.pubdate,
      owner: {
        mid: response.data.owner.mid,
        name: response.data.owner.name,
      },
    }
  }

  /**
   * 获取在线人数
   * @param bvid 视频 BV 号
   * @param cid 视频 CID
   * @returns { total }
   */
  async getOnlineTotal(bvid: string, cid: number): Promise<{ total: number }> {
    const response = await this.request<{
      total: string // B站返回的是字符串
    }>(this.baseUrl + `/x/player/online/total?bvid=${bvid}&cid=${cid}`)

    if (response.code !== 0) {
      throw new Error(`Failed to get online total: ${response.message}`)
    }

    return {
      total: parseInt(response.data.total, 10),
    }
  }

  /**
   * 获取用户基本信息（昵称、头像等）
   * @param mid 用户 UID
   * @param cookie 登录 Cookie（可选）
   * @returns { nickname, avatar }
   */
  async getUserInfo(mid: number, cookie?: string): Promise<{ nickname: string; avatar: string }> {
    const params: Record<string, string | number> = {
      mid,
      photo: 1, // 获取头像
    }

    // 获取 WBI keys（如果还没有）
    const keys = wbiService.getKeys()
    if (!keys) {
      // 尝试从 nav 接口获取
      await this.getNav(cookie)
    }

    // 签名参数
    const signedParams = wbiService.signParams(params)

    // 构建查询字符串
    const queryString = Object.entries(signedParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&')

    const headers: Record<string, string> = {}
    if (cookie) {
      headers['Cookie'] = cookie
    }

    const response = await this.request<{
      card: {
        name: string
        face: string
      }
    }>(this.baseUrl + `/x/web-interface/card?${queryString}`, {
      headers,
    })

    if (response.code !== 0) {
      throw new Error(`Failed to get user info: ${response.message}`)
    }

    return {
      nickname: response.data.card.name || '',
      avatar: response.data.card.face || '',
    }
  }

  /**
   * 获取用户统计信息（粉丝数等）
   * @param mid 用户 UID
   * @param cookie 登录 Cookie（可选，但建议提供以获取更准确的数据）
   * @returns { follower }
   */
  async getUserStat(mid: number, cookie?: string): Promise<{ follower: number }> {
    // 需要 WBI 签名
    const params: Record<string, string | number> = {
      vmid: mid,
    }

    // 获取 WBI keys（如果还没有）
    const keys = wbiService.getKeys()
    if (!keys) {
      // 尝试从 nav 接口获取
      await this.getNav(cookie)
    }

    // 签名参数
    const signedParams = wbiService.signParams(params)

    // 构建查询字符串
    const queryString = Object.entries(signedParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&')

    const headers: Record<string, string> = {}
    if (cookie) {
      headers['Cookie'] = cookie
    }

    const response = await this.request<{
      follower: number
    }>(this.baseUrl + `/x/relation/stat?${queryString}`, {
      headers,
    })

    if (response.code !== 0) {
      throw new Error(`Failed to get user stat: ${response.message}`)
    }

    return {
      follower: response.data.follower,
    }
  }
}

// 导出单例
export const biliClient = new BiliClient()

