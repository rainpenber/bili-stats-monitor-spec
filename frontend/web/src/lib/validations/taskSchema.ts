import { z } from 'zod'

// 标签约束：单个标签长度≤20；每个任务最多10个；允许中文与空格；大小写原样保存
const tagSchema = z.string()
  .min(1, '标签不能为空')
  .max(20, '标签长度不能超过20个字符')

// 固定频率：换算后≥1分钟；最大值≤系统设置上限（默认1天）
const fixedScheduleSchema = z.object({
  value: z.number()
    .int('必须是整数')
    .min(1, '频率值必须大于0'),
  unit: z.enum(['minute', 'hour', 'day'], {
    message: '单位必须是分钟、小时或天'
  })
}).refine(
  (data) => {
    // 换算为分钟
    const minutes = data.unit === 'minute' ? data.value
      : data.unit === 'hour' ? data.value * 60
      : data.value * 60 * 24
    return minutes >= 1 // 最小1分钟
  },
  { message: '换算后必须至少1分钟' }
).refine(
  (data) => {
    // 换算为分钟，最大值1天（1440分钟）
    const minutes = data.unit === 'minute' ? data.value
      : data.unit === 'hour' ? data.value * 60
      : data.value * 60 * 24
    return minutes <= 1440 // 最大1天
  },
  { message: '换算后不能超过1天（1440分钟）' }
)

// 视频任务 Schema
export const videoTaskSchema = z.object({
  title: z.string()
    .min(1, '标题不能为空')
    .max(200, '标题长度不能超过200个字符'),
  bv: z.string()
    .min(1, 'BV号不能为空')
    .max(50, 'BV号长度不能超过50个字符'),
  videoUrl: z.string()
    .optional()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: '视频链接格式不正确'
    }),
  tags: z.array(tagSchema)
    .max(10, '最多只能添加10个标签')
    .default([]),
  strategyMode: z.enum(['fixed', 'smart'], {
    message: '策略模式必须是固定频率或智能频率'
  }),
  fixedSchedule: fixedScheduleSchema.optional(),
  deadline: z.date({
    message: '截止时间格式不正确'
  }).optional(),
  includeVideos: z.boolean().default(false),
  autoFutureVideos: z.boolean().default(false),
}).refine(
  (data) => {
    // 如果选择固定频率，必须提供 fixedSchedule
    if (data.strategyMode === 'fixed') {
      return !!data.fixedSchedule
    }
    return true
  },
  { message: '选择固定频率时必须设置频率值', path: ['fixedSchedule'] }
)

// 博主任务 Schema
export const authorTaskSchema = z.object({
  nickname: z.string()
    .min(1, '昵称不能为空')
    .max(100, '昵称长度不能超过100个字符'),
  uid: z.string()
    .min(1, 'UID不能为空')
    .max(50, 'UID长度不能超过50个字符'),
  profileUrl: z.string()
    .optional()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: '空间链接格式不正确'
    }),
  tags: z.array(tagSchema)
    .max(10, '最多只能添加10个标签')
    .default([]),
  strategyMode: z.enum(['fixed', 'smart'], {
    message: '策略模式必须是固定频率或智能频率'
  }),
  fixedSchedule: fixedScheduleSchema.optional(),
  deadline: z.date({
    message: '截止时间格式不正确'
  }).optional(),
  includeVideos: z.boolean().default(false),
  autoFutureVideos: z.boolean().default(false),
}).refine(
  (data) => {
    // 如果选择固定频率，必须提供 fixedSchedule
    if (data.strategyMode === 'fixed') {
      return !!data.fixedSchedule
    }
    return true
  },
  { message: '选择固定频率时必须设置频率值', path: ['fixedSchedule'] }
)

// 导出类型
export type VideoTaskFormData = z.infer<typeof videoTaskSchema>
export type AuthorTaskFormData = z.infer<typeof authorTaskSchema>

