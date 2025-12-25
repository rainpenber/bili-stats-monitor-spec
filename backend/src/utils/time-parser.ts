/**
 * 时间格式解析工具
 * 支持多种时间格式解析，返回时间戳
 */

/**
 * 支持的时间格式
 */
const TIME_FORMATS = [
  // YYYY-MM-DD HH:MM (主要格式)
  /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/,
  // YYYY-MM-DDTHH:MM:SS (ISO 8601)
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/,
  // YYYY/MM/DD HH:MM (备用格式)
  /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/,
  // YYYY-MM-DD (仅日期，时间默认为 00:00:00)
  /^(\d{4})-(\d{2})-(\d{2})$/,
]

/**
 * 解析时间字符串为 Date 对象
 * @param timeStr 时间字符串
 * @returns Date 对象，如果解析失败返回 null
 */
export function parseTime(timeStr: string): Date | null {
  if (!timeStr || typeof timeStr !== 'string') {
    return null
  }

  const trimmed = timeStr.trim()
  if (!trimmed) {
    return null
  }

  // 尝试每种格式
  for (const format of TIME_FORMATS) {
    const match = trimmed.match(format)
    if (match) {
      try {
        const year = parseInt(match[1], 10)
        const month = parseInt(match[2], 10) - 1 // 月份从 0 开始
        const day = parseInt(match[3], 10)
        const hour = match[4] ? parseInt(match[4], 10) : 0
        const minute = match[5] ? parseInt(match[5], 10) : 0
        const second = match[6] ? parseInt(match[6], 10) : 0

        // 验证日期有效性（在创建 Date 对象之前）
        // 检查月份范围
        if (month < 0 || month > 11) {
          continue
        }
        // 检查日期范围（考虑月份实际天数）
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        // 检查闰年
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
        let maxDay = daysInMonth[month]
        if (month === 1 && isLeapYear) {
          // 2 月闰年有 29 天
          maxDay = 29
        }
        if (day < 1 || day > maxDay) {
          continue
        }
        // 检查时间范围
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
          continue
        }

        // 创建 Date 对象
        const date = new Date(year, month, day, hour, minute, second)
        
        // 检查日期是否有效（Date 对象可能会自动调整无效日期，如 2025-02-29 会变成 2025-03-01）
        // 如果日期被调整，说明原始日期无效
        if (
          date.getFullYear() === year &&
          date.getMonth() === month &&
          date.getDate() === day &&
          date.getHours() === hour &&
          date.getMinutes() === minute &&
          date.getSeconds() === second
        ) {
          return date
        }
        
        // 如果日期被调整，说明原始日期无效，继续尝试下一个格式
        continue
      } catch (error) {
        // 继续尝试下一个格式
        continue
      }
    }
  }

  // 所有格式都失败，返回 null
  // 不使用 Date 构造函数作为 fallback，因为它会自动调整无效日期
  return null
}

/**
 * 解析时间字符串为 Unix 时间戳（秒）
 * @param timeStr 时间字符串
 * @returns Unix 时间戳（秒），如果解析失败返回 null
 */
export function parseTimeToTimestamp(timeStr: string): number | null {
  const date = parseTime(timeStr)
  if (!date) {
    return null
  }
  return Math.floor(date.getTime() / 1000)
}

/**
 * 解析时间字符串为 Date 对象（带错误信息）
 * @param timeStr 时间字符串
 * @returns 解析结果对象
 */
export function parseTimeWithError(timeStr: string): {
  date: Date | null
  error: string | null
} {
  const date = parseTime(timeStr)
  if (date) {
    return { date, error: null }
  }
  return {
    date: null,
    error: `无法解析时间格式: "${timeStr}"。支持格式: YYYY-MM-DD HH:MM, YYYY-MM-DDTHH:MM:SS, YYYY/MM/DD HH:MM`,
  }
}

/**
 * 验证时间字符串是否有效
 * @param timeStr 时间字符串
 * @returns 是否有效
 */
export function isValidTime(timeStr: string): boolean {
  return parseTime(timeStr) !== null
}

