// T049-T050: 时间解析器单元测试（补充边界情况）
import { describe, test, expect } from 'vitest'
import {
  parseTime,
  parseTimeToTimestamp,
  parseTimeWithError,
  isValidTime,
} from '../../../src/utils/time-parser'

describe('Time Parser - 现有功能测试', () => {
  test('解析 YYYY-MM-DD HH:MM 格式', () => {
    const date = parseTime('2025-11-28 16:43')
    expect(date).not.toBeNull()
    expect(date?.getFullYear()).toBe(2025)
    expect(date?.getMonth()).toBe(10) // 11 月，月份从 0 开始
    expect(date?.getDate()).toBe(28)
    expect(date?.getHours()).toBe(16)
    expect(date?.getMinutes()).toBe(43)
  })

  test('解析 ISO 8601 格式', () => {
    const date = parseTime('2025-11-28T16:43:00')
    expect(date).not.toBeNull()
    expect(date?.getFullYear()).toBe(2025)
    expect(date?.getMonth()).toBe(10)
    expect(date?.getDate()).toBe(28)
    expect(date?.getHours()).toBe(16)
    expect(date?.getMinutes()).toBe(43)
    expect(date?.getSeconds()).toBe(0)
  })

  test('解析 YYYY/MM/DD HH:MM 格式', () => {
    const date = parseTime('2025/11/28 16:43')
    expect(date).not.toBeNull()
    expect(date?.getFullYear()).toBe(2025)
    expect(date?.getMonth()).toBe(10)
    expect(date?.getDate()).toBe(28)
  })

  test('解析仅日期格式', () => {
    const date = parseTime('2025-11-28')
    expect(date).not.toBeNull()
    expect(date?.getFullYear()).toBe(2025)
    expect(date?.getMonth()).toBe(10)
    expect(date?.getDate()).toBe(28)
    expect(date?.getHours()).toBe(0)
    expect(date?.getMinutes()).toBe(0)
  })

  test('解析为时间戳', () => {
    const timestamp = parseTimeToTimestamp('2025-11-28 16:43:00')
    expect(timestamp).not.toBeNull()
    expect(typeof timestamp).toBe('number')
    expect(timestamp).toBeGreaterThan(0)
  })

  test('解析无效时间返回 null', () => {
    expect(parseTime('invalid')).toBeNull()
    expect(parseTime('2025-13-01 12:00')).toBeNull() // 无效月份
    expect(parseTime('2025-11-32 12:00')).toBeNull() // 无效日期
    expect(parseTime('')).toBeNull()
  })

  test('验证时间有效性', () => {
    expect(isValidTime('2025-11-28 16:43')).toBe(true)
    expect(isValidTime('2025-11-28T16:43:00')).toBe(true)
    expect(isValidTime('invalid')).toBe(false)
    expect(isValidTime('')).toBe(false)
  })

  test('解析带错误信息', () => {
    const result1 = parseTimeWithError('2025-11-28 16:43')
    expect(result1.date).not.toBeNull()
    expect(result1.error).toBeNull()

    const result2 = parseTimeWithError('invalid')
    expect(result2.date).toBeNull()
    expect(result2.error).not.toBeNull()
    expect(result2.error).toContain('无法解析时间格式')
  })
})

// T049: 补充边界情况测试（0、负数、超大值）
describe('Time Parser - T049 边界情况测试', () => {
  describe('极端日期值', () => {
    test('年份：最小有效年份（1970）', () => {
      const date = parseTime('1970-01-01 00:00')
      expect(date).not.toBeNull()
      expect(date?.getFullYear()).toBe(1970)
    })

    test('年份：非常早的年份（1900）', () => {
      const date = parseTime('1900-01-01 12:00')
      expect(date).not.toBeNull()
      expect(date?.getFullYear()).toBe(1900)
    })

    test('年份：未来年份（2100）', () => {
      const date = parseTime('2100-12-31 23:59')
      expect(date).not.toBeNull()
      expect(date?.getFullYear()).toBe(2100)
    })

    test('月份：01（一月）', () => {
      const date = parseTime('2025-01-15 12:00')
      expect(date).not.toBeNull()
      expect(date?.getMonth()).toBe(0)
    })

    test('月份：12（十二月）', () => {
      const date = parseTime('2025-12-15 12:00')
      expect(date).not.toBeNull()
      expect(date?.getMonth()).toBe(11)
    })

    test('月份：00（无效）', () => {
      const date = parseTime('2025-00-15 12:00')
      expect(date).toBeNull()
    })

    test('月份：13（无效）', () => {
      const date = parseTime('2025-13-15 12:00')
      expect(date).toBeNull()
    })

    test('日期：01（月初）', () => {
      const date = parseTime('2025-05-01 12:00')
      expect(date).not.toBeNull()
      expect(date?.getDate()).toBe(1)
    })

    test('日期：31（月末，31天的月份）', () => {
      const date = parseTime('2025-01-31 12:00')
      expect(date).not.toBeNull()
      expect(date?.getDate()).toBe(31)
    })

    test('日期：30（30天的月份）', () => {
      const date = parseTime('2025-04-30 12:00')
      expect(date).not.toBeNull()
      expect(date?.getDate()).toBe(30)
    })

    test('日期：31（30天的月份 - 无效）', () => {
      const date = parseTime('2025-04-31 12:00')
      expect(date).toBeNull()
    })

    test('日期：00（无效）', () => {
      const date = parseTime('2025-05-00 12:00')
      expect(date).toBeNull()
    })

    test('日期：32（无效）', () => {
      const date = parseTime('2025-05-32 12:00')
      expect(date).toBeNull()
    })
  })

  describe('闰年测试', () => {
    test('闰年 2 月 29 日（2024）', () => {
      const date = parseTime('2024-02-29 12:00')
      expect(date).not.toBeNull()
      expect(date?.getDate()).toBe(29)
      expect(date?.getMonth()).toBe(1)
    })

    test('非闰年 2 月 29 日（2025）', () => {
      const date = parseTime('2025-02-29 12:00')
      expect(date).toBeNull()
    })

    test('闰年 2 月 28 日（2024）', () => {
      const date = parseTime('2024-02-28 12:00')
      expect(date).not.toBeNull()
      expect(date?.getDate()).toBe(28)
    })

    test('非闰年 2 月 28 日（2025）', () => {
      const date = parseTime('2025-02-28 12:00')
      expect(date).not.toBeNull()
      expect(date?.getDate()).toBe(28)
    })

    test('世纪闰年（2000）', () => {
      const date = parseTime('2000-02-29 12:00')
      expect(date).not.toBeNull()
      expect(date?.getDate()).toBe(29)
    })

    test('世纪非闰年（1900）', () => {
      const date = parseTime('1900-02-29 12:00')
      expect(date).toBeNull()
    })
  })

  describe('时间边界值', () => {
    test('时：00（午夜）', () => {
      const date = parseTime('2025-11-28 00:00')
      expect(date).not.toBeNull()
      expect(date?.getHours()).toBe(0)
    })

    test('时：23（最晚）', () => {
      const date = parseTime('2025-11-28 23:59')
      expect(date).not.toBeNull()
      expect(date?.getHours()).toBe(23)
    })

    test('时：24（无效）', () => {
      const date = parseTime('2025-11-28 24:00')
      expect(date).toBeNull()
    })

    test('时：负数（无效）', () => {
      const date = parseTime('2025-11-28 -1:00')
      expect(date).toBeNull()
    })

    test('分：00', () => {
      const date = parseTime('2025-11-28 12:00')
      expect(date).not.toBeNull()
      expect(date?.getMinutes()).toBe(0)
    })

    test('分：59', () => {
      const date = parseTime('2025-11-28 12:59')
      expect(date).not.toBeNull()
      expect(date?.getMinutes()).toBe(59)
    })

    test('分：60（无效）', () => {
      const date = parseTime('2025-11-28 12:60')
      expect(date).toBeNull()
    })

    test('秒：00', () => {
      const date = parseTime('2025-11-28 12:30:00')
      expect(date).not.toBeNull()
      expect(date?.getSeconds()).toBe(0)
    })

    test('秒：59', () => {
      const date = parseTime('2025-11-28 12:30:59')
      expect(date).not.toBeNull()
      expect(date?.getSeconds()).toBe(59)
    })

    test('秒：60（无效）', () => {
      const date = parseTime('2025-11-28 12:30:60')
      expect(date).toBeNull()
    })
  })

  describe('特殊输入测试', () => {
    test('空字符串', () => {
      expect(parseTime('')).toBeNull()
    })

    test('仅空格', () => {
      expect(parseTime('   ')).toBeNull()
    })

    test('null（类型错误）', () => {
      expect(parseTime(null as any)).toBeNull()
    })

    test('undefined（类型错误）', () => {
      expect(parseTime(undefined as any)).toBeNull()
    })

    test('数字（类型错误）', () => {
      expect(parseTime(123456 as any)).toBeNull()
    })

    test('对象（类型错误）', () => {
      expect(parseTime({} as any)).toBeNull()
    })
  })

  describe('时间戳边界测试', () => {
    test('parseTimeToTimestamp: Unix纪元时间（1970-01-01）', () => {
      const timestamp = parseTimeToTimestamp('1970-01-01 00:00:00')
      expect(timestamp).not.toBeNull()
      // 注意：由于使用本地时区，实际时间戳会根据时区偏移
      // 例如 UTC+8，1970-01-01 00:00:00 的时间戳是 -28800 (负8小时)
      // 我们只验证返回了数字而不是null
      expect(typeof timestamp).toBe('number')
    })

    test('parseTimeToTimestamp: 无效时间返回null', () => {
      expect(parseTimeToTimestamp('invalid')).toBeNull()
      expect(parseTimeToTimestamp('')).toBeNull()
    })

    test('parseTimeToTimestamp: 未来时间', () => {
      const timestamp = parseTimeToTimestamp('2100-12-31 23:59:59')
      expect(timestamp).not.toBeNull()
      expect(timestamp).toBeGreaterThan(Date.now() / 1000)
    })
  })
})

// T050: 测试各种中文时间格式（扩展功能）
describe('Time Parser - T050 中文时间格式支持（如需实现）', () => {
  // 注意：当前 time-parser.ts 不支持中文格式
  // 这些测试用于验证当前行为，如果未来需要支持中文格式，
  // 需要修改 time-parser.ts 的实现

  test('中文格式：年月日（当前不支持）', () => {
    const date = parseTime('2025年11月28日')
    expect(date).toBeNull() // 当前实现不支持
  })

  test('中文格式：年月日 时分（当前不支持）', () => {
    const date = parseTime('2025年11月28日 16时43分')
    expect(date).toBeNull() // 当前实现不支持
  })

  test('中文格式：昨天/今天/明天（当前不支持）', () => {
    expect(parseTime('昨天')).toBeNull()
    expect(parseTime('今天')).toBeNull()
    expect(parseTime('明天')).toBeNull()
  })

  test('相对时间：1小时后（当前不支持）', () => {
    expect(parseTime('1小时后')).toBeNull()
    expect(parseTime('2天后')).toBeNull()
    expect(parseTime('30分钟后')).toBeNull()
  })

  // 如果未来需要支持中文格式，可以参考以下测试用例：
  // test('中文格式：5分钟', () => {
  //   const interval = parseChineseTimeInterval('5分钟')
  //   expect(interval).toBe(5)
  // })
  
  // test('中文格式：2小时', () => {
  //   const interval = parseChineseTimeInterval('2小时')
  //   expect(interval).toBe(120) // 120分钟
  // })
  
  // test('中文格式：1天', () => {
  //   const interval = parseChineseTimeInterval('1天')
  //   expect(interval).toBe(1440) // 1440分钟
  // })
})

describe('Time Parser - parseTimeWithError 详细测试', () => {
  test('有效时间应返回 date 且 error 为 null', () => {
    const result = parseTimeWithError('2025-11-28 16:43')
    expect(result.date).not.toBeNull()
    expect(result.error).toBeNull()
    expect(result.date?.getFullYear()).toBe(2025)
  })

  test('无效时间应返回 null 且包含错误信息', () => {
    const result = parseTimeWithError('invalid-date')
    expect(result.date).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error).toContain('无法解析时间格式')
    expect(result.error).toContain('YYYY-MM-DD HH:MM')
  })

  test('空字符串应返回 null 且包含错误信息', () => {
    const result = parseTimeWithError('')
    expect(result.date).toBeNull()
    expect(result.error).not.toBeNull()
  })

  test('格式几乎正确但有微小错误的输入', () => {
    const result = parseTimeWithError('2025/13/01 12:00') // 月份13无效
    expect(result.date).toBeNull()
    expect(result.error).not.toBeNull()
  })
})

describe('Time Parser - isValidTime 详细测试', () => {
  test('各种有效格式应返回 true', () => {
    expect(isValidTime('2025-11-28 16:43')).toBe(true)
    expect(isValidTime('2025-11-28T16:43:00')).toBe(true)
    expect(isValidTime('2025/11/28 16:43')).toBe(true)
    expect(isValidTime('2025-11-28')).toBe(true)
    expect(isValidTime('2025-11-28 00:00:00')).toBe(true)
    expect(isValidTime('2024-02-29 12:00')).toBe(true) // 闰年
  })

  test('各种无效格式应返回 false', () => {
    expect(isValidTime('invalid')).toBe(false)
    expect(isValidTime('')).toBe(false)
    expect(isValidTime('2025-13-01')).toBe(false) // 无效月份
    expect(isValidTime('2025-02-30')).toBe(false) // 2月30日不存在
    expect(isValidTime('2025-11-32')).toBe(false) // 无效日期
    expect(isValidTime('2025-11-28 25:00')).toBe(false) // 无效小时
    expect(isValidTime('2025-11-28 12:60')).toBe(false) // 无效分钟
  })

  test('边界情况', () => {
    expect(isValidTime('2025-11-28 00:00')).toBe(true) // 午夜
    expect(isValidTime('2025-11-28 23:59')).toBe(true) // 最晚时间
    expect(isValidTime('2025-01-01')).toBe(true) // 年初
    expect(isValidTime('2025-12-31')).toBe(true) // 年末
  })
})

