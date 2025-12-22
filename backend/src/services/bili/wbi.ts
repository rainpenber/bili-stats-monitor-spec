import { createHash } from 'crypto'

/**
 * WBI 签名服务
 * 用于为 B站 API 请求添加 w_rid 和 wts 签名参数
 */

// MIXIN_KEY_ENC_TAB 重排映射表
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52,
]

interface WbiKeys {
  imgKey: string
  subKey: string
  expiresAt: number // Unix timestamp (ms)
}

/**
 * 从 img_key 和 sub_key 生成 mixin_key
 */
function getMixinKey(orig: string): string {
  if (orig.length < 64) {
    throw new Error(`raw_wbi_key must be at least 64 characters, got ${orig.length}`)
  }
  
  // 遍历 MIXIN_KEY_ENC_TAB，取出对应位置的字符
  const mixinKey = MIXIN_KEY_ENC_TAB.map((index) => orig[index]).join('')
  
  // 截取前 32 位
  return mixinKey.slice(0, 32)
}

/**
 * URL 编码（大写字母，空格编码为 %20）
 */
function urlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/%20/g, '%20') // 确保空格是 %20
    .replace(/%[a-f]/g, (match) => match.toUpperCase()) // 小写转大写
}

/**
 * 过滤参数值中的特殊字符 "!'()*"
 */
function filterValue(value: string): string {
  return value.replace(/[!'()*]/g, '')
}

/**
 * 将参数对象转换为排序后的 URL query 字符串
 */
function paramsToQuery(params: Record<string, string | number>): string {
  // 1. 添加 wts 时间戳
  const paramsWithWts = {
    ...params,
    wts: Math.floor(Date.now() / 1000),
  }

  // 2. 按键名升序排序
  const sortedKeys = Object.keys(paramsWithWts).sort()

  // 3. 过滤特殊字符并编码
  const queryParts = sortedKeys.map((key) => {
    const value = String(paramsWithWts[key])
    const filtered = filterValue(value)
    const encoded = urlEncode(filtered)
    return `${key}=${encoded}`
  })

  return queryParts.join('&')
}

/**
 * 计算 MD5 哈希
 */
function md5(str: string): string {
  return createHash('md5').update(str).digest('hex')
}

/**
 * WBI 签名服务类
 */
export class WbiService {
  private keys: WbiKeys | null = null
  private readonly keyCacheDuration = 12 * 60 * 60 * 1000 // 12小时（毫秒）

  /**
   * 从 nav 接口响应中提取 img_key 和 sub_key
   * @param navResponse nav 接口的响应数据
   */
  extractKeysFromNav(navResponse: any): { imgKey: string; subKey: string } | null {
    try {
      const wbiImg = navResponse?.data?.wbi_img
      if (!wbiImg?.img_url || !wbiImg?.sub_url) {
        return null
      }

      // 从 URL 中提取文件名（去掉 .png 后缀）
      const imgKey = wbiImg.img_url.match(/\/([^/]+)\.png$/)?.[1]
      const subKey = wbiImg.sub_url.match(/\/([^/]+)\.png$/)?.[1]

      if (!imgKey || !subKey) {
        return null
      }

      return { imgKey, subKey }
    } catch (error) {
      return null
    }
  }

  /**
   * 刷新 keys（从 nav 接口获取）
   * 需要外部调用 nav 接口后调用此方法
   */
  refreshKeys(imgKey: string, subKey: string): void {
    this.keys = {
      imgKey,
      subKey,
      expiresAt: Date.now() + this.keyCacheDuration,
    }
  }

  /**
   * 检查 keys 是否过期
   */
  private isKeysExpired(): boolean {
    if (!this.keys) {
      return true
    }
    return Date.now() >= this.keys.expiresAt
  }

  /**
   * 获取有效的 keys（如果过期则返回 null）
   */
  getKeys(): { imgKey: string; subKey: string } | null {
    if (this.isKeysExpired()) {
      return null
    }
    return {
      imgKey: this.keys!.imgKey,
      subKey: this.keys!.subKey,
    }
  }

  /**
   * 为请求参数添加 WBI 签名
   * @param params 原始请求参数
   * @returns 添加了 w_rid 和 wts 的参数对象
   */
  signParams(params: Record<string, string | number>): Record<string, string | number> {
    const keys = this.getKeys()
    if (!keys) {
      throw new Error('WBI keys not available. Call refreshKeys() first.')
    }

    // 1. 生成 mixin_key
    const rawWbiKey = keys.imgKey + keys.subKey
    const mixinKey = getMixinKey(rawWbiKey)

    // 2. 添加 wts 并排序编码
    const query = paramsToQuery(params)

    // 3. 计算 w_rid（query + mixin_key 的 MD5）
    const wRid = md5(query + mixinKey)

    // 4. 提取 wts（从 paramsToQuery 中获取）
    const wts = Math.floor(Date.now() / 1000)

    // 5. 返回添加了签名的参数
    return {
      ...params,
      wts,
      w_rid: wRid,
    }
  }
}

// 导出单例
export const wbiService = new WbiService()

