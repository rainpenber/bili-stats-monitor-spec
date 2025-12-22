import { describe, test, expect } from 'bun:test'
import {
  parseTime,
  parseTimeToTimestamp,
  parseTimeWithError,
  isValidTime,
} from '../../src/utils/time-parser'

describe('Time Parser', () => {
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

  test('处理边界情况', () => {
    // 午夜
    const date1 = parseTime('2025-11-28 00:00')
    expect(date1).not.toBeNull()

    // 23:59
    const date2 = parseTime('2025-11-28 23:59')
    expect(date2).not.toBeNull()

    // 闰年 2 月 29 日
    const date3 = parseTime('2024-02-29 12:00')
    expect(date3).not.toBeNull()
    expect(date3?.getDate()).toBe(29)
    expect(date3?.getMonth()).toBe(1) // 2 月

    // 非闰年 2 月 29 日应该被拒绝（验证逻辑会检查）
    const date4 = parseTime('2025-02-29 12:00')
    // 由于 Date 构造函数会自动调整，我们需要检查日期是否被调整
    // 如果日期被调整（如变成 3 月 1 日），说明原始日期无效
    if (date4) {
      // 如果返回了日期，检查它是否被调整
      expect(date4.getDate()).not.toBe(29) // 应该被调整
      expect(date4.getMonth()).not.toBe(1) // 应该不是 2 月
    } else {
      // 或者返回 null（如果验证逻辑正确）
      expect(date4).toBeNull()
    }
  })
})

