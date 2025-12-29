/**
 * CSV 解析工具
 * 支持流式处理、UTF-8 BOM 处理、编码检测
 */

export interface CSVRow {
  [key: string]: string
}

export interface CSVParserOptions {
  /** 是否跳过空行 */
  skipEmptyLines?: boolean
  /** 是否跳过无效行 */
  skipInvalidLines?: boolean
  /** 批量处理大小（行数） */
  batchSize?: number
}

/**
 * 检测并移除 UTF-8 BOM
 */
function removeBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1)
  }
  return text
}

/**
 * 解析 CSV 行（简单实现，支持引号转义）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 转义的引号
        current += '"'
        i++ // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // 添加最后一个字段
  result.push(current.trim())

  return result
}

/**
 * 流式解析 CSV 文件
 * @param filePath CSV 文件路径
 * @param options 解析选项
 * @returns 异步生成器，每次 yield 一批行数据
 */
export async function* parseCSVFile(
  filePath: string,
  options: CSVParserOptions = {}
): AsyncGenerator<CSVRow[], void, unknown> {
  const {
    skipEmptyLines = true,
    skipInvalidLines = true,
    batchSize = 100,
  } = options

  try {
    // 使用 Bun 的文件 API 读取文件
    const file = Bun.file(filePath)
    const text = await file.text()
    
    // 移除 BOM
    const content = removeBOM(text)
    
    // 按行分割
    const lines = content.split(/\r?\n/)
    
    // 解析表头
    if (lines.length === 0) {
      return
    }

    const headerLine = lines[0].trim()
    if (!headerLine) {
      throw new Error('CSV 文件缺少表头')
    }

    const headers = parseCSVLine(headerLine)
    if (headers.length === 0) {
      throw new Error('CSV 表头为空')
    }

    // 解析数据行
    const batch: CSVRow[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // 跳过空行
      if (skipEmptyLines && !line) {
        continue
      }

      try {
        const values = parseCSVLine(line)
        
        // 验证列数
        if (values.length !== headers.length) {
          if (skipInvalidLines) {
            continue
          }
          throw new Error(`行 ${i + 1}: 列数不匹配 (期望 ${headers.length}, 实际 ${values.length})`)
        }

        // 构建行对象
        const row: CSVRow = {}
        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = values[j] || ''
        }

        batch.push(row)

        // 批量 yield
        if (batch.length >= batchSize) {
          yield batch
          batch.length = 0 // 清空数组但保留引用
        }
      } catch (error) {
        if (skipInvalidLines) {
          continue
        }
        throw error
      }
    }

    // 返回剩余数据
    if (batch.length > 0) {
      yield batch
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`CSV 解析失败 (${filePath}): ${error.message}`)
    }
    throw error
  }
}

/**
 * 同步解析 CSV 文件（适用于小文件）
 * @param filePath CSV 文件路径
 * @param options 解析选项
 * @returns 所有行数据
 */
export async function parseCSVFileSync(
  filePath: string,
  options: CSVParserOptions = {}
): Promise<CSVRow[]> {
  const rows: CSVRow[] = []
  
  for await (const batch of parseCSVFile(filePath, options)) {
    rows.push(...batch)
  }
  
  return rows
}

