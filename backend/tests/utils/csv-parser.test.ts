import { describe, test, expect } from 'bun:test'
import { parseCSVFile, parseCSVFileSync } from '../../src/utils/csv-parser'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('CSV Parser', () => {
  const testDir = tmpdir()

  test('解析简单的 CSV 文件', async () => {
    const testFile = join(testDir, 'test.csv')
    const content = `时间,粉丝数
2025-11-28 16:43,321753
2025-11-28 21:08,321763`

    await writeFile(testFile, content, 'utf-8')

    try {
      const rows = await parseCSVFileSync(testFile)
      expect(rows).toHaveLength(2)
      expect(rows[0]).toEqual({
        时间: '2025-11-28 16:43',
        粉丝数: '321753',
      })
      expect(rows[1]).toEqual({
        时间: '2025-11-28 21:08',
        粉丝数: '321763',
      })
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })

  test('处理 UTF-8 BOM', async () => {
    const testFile = join(testDir, 'test-bom.csv')
    const bom = '\uFEFF'
    const content = `${bom}时间,粉丝数
2025-11-28 16:43,321753`

    await writeFile(testFile, content, 'utf-8')

    try {
      const rows = await parseCSVFileSync(testFile)
      expect(rows).toHaveLength(1)
      expect(rows[0].时间).toBe('2025-11-28 16:43')
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })

  test('跳过空行', async () => {
    const testFile = join(testDir, 'test-empty.csv')
    const content = `时间,粉丝数
2025-11-28 16:43,321753

2025-11-28 21:08,321763`

    await writeFile(testFile, content, 'utf-8')

    try {
      const rows = await parseCSVFileSync(testFile, { skipEmptyLines: true })
      expect(rows).toHaveLength(2)
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })

  test('流式处理大批量数据', async () => {
    const testFile = join(testDir, 'test-large.csv')
    const header = '时间,粉丝数\n'
    const rows = Array.from({ length: 500 }, (_, i) => `2025-11-28 16:${String(i).padStart(2, '0')},${321753 + i}\n`).join('')
    const content = header + rows

    await writeFile(testFile, content, 'utf-8')

    try {
      let totalRows = 0
      for await (const batch of parseCSVFile(testFile, { batchSize: 100 })) {
        totalRows += batch.length
        expect(batch.length).toBeLessThanOrEqual(100)
      }
      expect(totalRows).toBe(500)
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })

  test('处理引号转义', async () => {
    const testFile = join(testDir, 'test-quotes.csv')
    const content = `名称,描述
测试,"包含""引号""的文本"
正常,普通文本`

    await writeFile(testFile, content, 'utf-8')

    try {
      const rows = await parseCSVFileSync(testFile)
      expect(rows).toHaveLength(2)
      expect(rows[0].描述).toBe('包含"引号"的文本')
    } finally {
      await unlink(testFile).catch(() => {})
    }
  })
})

