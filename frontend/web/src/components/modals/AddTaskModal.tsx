import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useUISelection } from '@/store/uiSelection'
import TagInput from '@/components/ui/TagInput'
import { DatePicker } from '@/components/ui/DatePicker'
import { useSelectVideos } from '@/store/selectVideos'
import { fetchDefaultAccount } from '@/lib/api'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { http } from '@/lib/http'
import { videoTaskSchema, authorTaskSchema, type VideoTaskFormData, type AuthorTaskFormData } from '@/lib/validations/taskSchema'

export default function AddTaskModal() {
  const { addTaskOpen, setAddTaskOpen, type } = useUISelection()
  const selectVideos = useSelectVideos()

  // 任务类型（独立于表单状态）
  const [taskType, setTaskType] = useState<'video' | 'author'>(type)

  // 根据任务类型选择 schema 和默认值
  const videoForm = useForm<VideoTaskFormData>({
    // @ts-expect-error - zod 类型推断问题，tags 字段即使有 default 仍可能被推断为可选
    resolver: zodResolver(videoTaskSchema),
    defaultValues: {
      title: '',
      bv: '',
      videoUrl: '',
      tags: [],
      strategyMode: 'smart',
      fixedSchedule: undefined,
      deadline: undefined,
      includeVideos: false,
      autoFutureVideos: false,
    },
    mode: 'onChange',
  })

  const authorForm = useForm<AuthorTaskFormData>({
    // @ts-expect-error - zod 类型推断问题，tags 字段即使有 default 仍可能被推断为可选
    resolver: zodResolver(authorTaskSchema),
    defaultValues: {
      nickname: '',
      uid: '',
      profileUrl: '',
      tags: [],
      strategyMode: 'smart',
      fixedSchedule: undefined,
      deadline: undefined,
      includeVideos: false,
      autoFutureVideos: false,
    },
    mode: 'onChange',
  })

  // 当前使用的表单（使用 any 类型解决联合类型问题）
  const currentForm = (taskType === 'video' ? videoForm : authorForm) as any

  // default account banner
  const [hasDefaultAcc, setHasDefaultAcc] = useState<boolean>(true)
  useEffect(() => {
    async function loadDefault() {
      try { const def = await fetchDefaultAccount(); setHasDefaultAcc(!!def.id) } catch {} 
    }
    if (addTaskOpen) loadDefault()
  }, [addTaskOpen])

  // 重置表单当 modal 打开或类型改变
  useEffect(() => {
    if (addTaskOpen) {
      setTaskType(type)
      if (taskType === 'video') {
        videoForm.reset({
          title: '',
          bv: '',
          videoUrl: '',
          tags: [],
          strategyMode: 'smart',
          fixedSchedule: undefined,
          deadline: undefined,
          includeVideos: false,
          autoFutureVideos: false,
        })
      } else {
        authorForm.reset({
          nickname: '',
          uid: '',
          profileUrl: '',
          tags: [],
          strategyMode: 'smart',
          fixedSchedule: undefined,
          deadline: undefined,
          includeVideos: false,
          autoFutureVideos: false,
        })
      }
    }
  }, [addTaskOpen, type, taskType])

  const onClose = () => {
    setAddTaskOpen(false)
    currentForm.reset()
  }

  async function doLookup() {
    try {
      const body: any = { type: taskType }
      if (taskType === 'video') {
        const bv = videoForm.getValues('bv')
        const videoUrl = videoForm.getValues('videoUrl')
        if (bv) body.bv = bv
        if (videoUrl) body.url = videoUrl
      } else {
        const uid = authorForm.getValues('uid')
        const profileUrl = authorForm.getValues('profileUrl')
        if (uid) body.uid = uid
        if (profileUrl) body.profile_url = profileUrl
      }
      const data = await http.post<any>('/api/v1/lookup', body)
      if (taskType === 'video') {
        videoForm.setValue('bv', data.bv || videoForm.getValues('bv'))
        videoForm.setValue('title', data.title || videoForm.getValues('title'))
      } else {
        authorForm.setValue('uid', data.uid || authorForm.getValues('uid'))
        authorForm.setValue('nickname', data.nickname || authorForm.getValues('nickname'))
      }
    } catch (e: any) {
      toast.error(e?.message || '查询异常（低保真）')
    }
  }

  async function createTask(payload: any) {
    return http.post('/api/v1/tasks', payload)
  }

  const onCreate = async (data: VideoTaskFormData | AuthorTaskFormData) => {
    try {
      if (taskType === 'author') {
        const formData = data as AuthorTaskFormData
        const strategy = formData.strategyMode === 'smart' 
          ? { mode: 'smart' } 
          : { mode: 'fixed', value: formData.fixedSchedule!.value, unit: formData.fixedSchedule!.unit }
        await createTask({ 
          type: 'author', 
          target_id: formData.uid || 'unknown', 
          nickname: formData.nickname, 
          tags: formData.tags, 
          strategy, 
          deadline: formData.deadline 
        })
        if (formData.includeVideos && (formData.uid || formData.profileUrl)) {
          const ensuredUid = formData.uid || (formData.profileUrl?.match(/space\.bilibili\.com\/(\d+)/) || [])[1] || ''
          if (ensuredUid) selectVideos.openForAuthor(ensuredUid)
        }
        if (formData.autoFutureVideos) {
          toast.info('已开启"实时监控今后发布的视频"（低保真占位：后台将每日检查并为新视频创建任务，频率=每天一次）')
        }
        toast.success('任务创建成功')
        onClose()
        return
      }
      const formData = data as VideoTaskFormData
      const strategy = formData.strategyMode === 'smart' 
        ? { mode: 'smart' } 
        : { mode: 'fixed', value: formData.fixedSchedule!.value, unit: formData.fixedSchedule!.unit }
      await createTask({ 
        type: 'video', 
        target_id: formData.bv || 'unknown', 
        title: formData.title, 
        tags: formData.tags, 
        strategy, 
        deadline: formData.deadline 
      })
      toast.success('任务创建成功')
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('创建失败（低保真）')
    }
  }

  return (
    <Modal open={addTaskOpen} onClose={onClose}>
      <ModalHeader title="新增监控任务（低保真）" />
      <ModalBody>
        <form onSubmit={currentForm.handleSubmit(onCreate)} className="space-y-6 text-sm">
          {!hasDefaultAcc && (
            <div className="border border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-md px-3 py-2">
              当前未设置全局默认账号：仅鉴权内容（如完播率）将暂停抓取，请前往 <Link to="/settings" className="underline font-medium">系统设置</Link> 设置默认账号。
            </div>
          )}

          {/* 类型选择 */}
          <div className="space-y-2">
            <div className="text-muted-foreground">任务类型</div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input className="form-radio" type="radio" name="taskType" checked={taskType==='video'} onChange={()=>setTaskType('video')} /> 视频
              </label>
              <label className="inline-flex items-center gap-2">
                <input className="form-radio" type="radio" name="taskType" checked={taskType==='author'} onChange={()=>setTaskType('author')} /> 博主
              </label>
            </div>
          </div>

          {/* 输入区 + 查询填充 */}
          {taskType === 'video' ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-muted-foreground">视频链接</div>
                <Input 
                  {...videoForm.register('videoUrl')} 
                  placeholder="https://www.bilibili.com/video/BV..." 
                />
                {videoForm.formState.errors.videoUrl && (
                  <span className="text-sm text-destructive">{videoForm.formState.errors.videoUrl.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">BV号</div>
                <Input 
                  {...videoForm.register('bv')} 
                  placeholder="BVxxxxxxxx" 
                />
                {videoForm.formState.errors.bv && (
                  <span className="text-sm text-destructive">{videoForm.formState.errors.bv.message}</span>
                )}
              </div>
              <Button type="button" variant="outline" onClick={doLookup}>从链接/ID获取</Button>
              <div className="space-y-1">
                <div className="text-muted-foreground">标题</div>
                <Input 
                  {...videoForm.register('title')} 
                  placeholder="可由查询自动填充" 
                />
                {videoForm.formState.errors.title && (
                  <span className="text-sm text-destructive">{videoForm.formState.errors.title.message}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-muted-foreground">博主空间链接</div>
                <Input 
                  {...authorForm.register('profileUrl')} 
                  placeholder="https://space.bilibili.com/UID" 
                />
                {authorForm.formState.errors.profileUrl && (
                  <span className="text-sm text-destructive">{authorForm.formState.errors.profileUrl.message}</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">UID</div>
                <Input 
                  {...authorForm.register('uid')} 
                  placeholder="数字/字符串均可" 
                />
                {authorForm.formState.errors.uid && (
                  <span className="text-sm text-destructive">{authorForm.formState.errors.uid.message}</span>
                )}
              </div>
              <Button type="button" variant="outline" onClick={doLookup}>从链接/ID获取</Button>
              <div className="space-y-1">
                <div className="text-muted-foreground">昵称</div>
                <Input 
                  {...authorForm.register('nickname')} 
                  placeholder="可由查询自动填充" 
                />
                {authorForm.formState.errors.nickname && (
                  <span className="text-sm text-destructive">{authorForm.formState.errors.nickname.message}</span>
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2">
                  <input 
                    className="form-checkbox" 
                    type="checkbox" 
                    {...authorForm.register('includeVideos')} 
                  />
                  同时监控该博主发布的视频（添加后选择具体视频）
                </label>
                <label className="inline-flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    {...authorForm.register('autoFutureVideos')} 
                  />
                  实时监控该博主今后发布的视频（后台每天检查并自动添加，默认频率每天一次）
                </label>
              </div>
            </div>
          )}

          {/* 标签 */}
          <div className="space-y-2">
            <div className="text-muted-foreground">标签</div>
            {taskType === 'video' ? (
              <Controller
                name="tags"
                control={videoForm.control}
                render={({ field }) => (
                  <>
                    <TagInput 
                      value={field.value} 
                      onChange={field.onChange} 
                      placeholder="输入以搜索已有标签，回车添加；上下键选择候选；悬停标签可删除" 
                    />
                    {videoForm.formState.errors.tags && (
                      <span className="text-sm text-destructive">{videoForm.formState.errors.tags.message}</span>
                    )}
                  </>
                )}
              />
            ) : (
              <Controller
                name="tags"
                control={authorForm.control}
                render={({ field }) => (
                  <>
                    <TagInput 
                      value={field.value} 
                      onChange={field.onChange} 
                      placeholder="输入以搜索已有标签，回车添加；上下键选择候选；悬停标签可删除" 
                    />
                    {authorForm.formState.errors.tags && (
                      <span className="text-sm text-destructive">{authorForm.formState.errors.tags.message}</span>
                    )}
                  </>
                )}
              />
            )}
          </div>

          {/* 定时策略 */}
          <div className="space-y-2">
            <div className="text-muted-foreground">定时策略</div>
            {taskType === 'video' ? (
              <>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input 
                      className="form-radio" 
                      type="radio" 
                      name="strategy" 
                      checked={videoForm.watch('strategyMode')==='fixed'} 
                      onChange={()=>videoForm.setValue('strategyMode', 'fixed')} 
                    /> 固定频率
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="strategy" 
                      checked={videoForm.watch('strategyMode')==='smart'} 
                      onChange={()=>videoForm.setValue('strategyMode', 'smart')} 
                    /> 智能频率（推荐）
                  </label>
                </div>
                {videoForm.watch('strategyMode') === 'fixed' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input 
                        className="w-24" 
                        type="number" 
                        min={1} 
                        value={videoForm.watch('fixedSchedule')?.value || 60} 
                        onChange={(e)=>videoForm.setValue('fixedSchedule', {
                          value: Number(e.target.value)||1,
                          unit: videoForm.watch('fixedSchedule')?.unit || 'minute'
                        })} 
                      />
                      <select 
                        className="h-10 px-3 rounded-md border border-input bg-background" 
                        value={videoForm.watch('fixedSchedule')?.unit || 'minute'} 
                        onChange={(e)=>videoForm.setValue('fixedSchedule', {
                          value: videoForm.watch('fixedSchedule')?.value || 60,
                          unit: e.target.value as 'minute' | 'hour' | 'day'
                        })}
                      >
                        <option value="minute">分钟</option>
                        <option value="hour">小时</option>
                        <option value="day">天</option>
                      </select>
                      <span className="text-muted-foreground text-sm">（固定频率不得小于1分钟）</span>
                    </div>
                    {videoForm.formState.errors.fixedSchedule && (
                      <span className="text-sm text-destructive">{videoForm.formState.errors.fixedSchedule.message}</span>
                    )}
                  </div>
                )}
                {videoForm.watch('strategyMode') === 'smart' && (
                  <div className="text-xs text-muted-foreground">前5天每10分钟、5~14天每2小时、14天后每4小时</div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input 
                      className="form-radio" 
                      type="radio" 
                      name="strategy" 
                      checked={authorForm.watch('strategyMode')==='fixed'} 
                      onChange={()=>authorForm.setValue('strategyMode', 'fixed')} 
                    /> 固定频率
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="strategy" 
                      checked={authorForm.watch('strategyMode')==='smart'} 
                      onChange={()=>authorForm.setValue('strategyMode', 'smart')} 
                    /> 智能频率（推荐）
                  </label>
                </div>
                {authorForm.watch('strategyMode') === 'fixed' && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input 
                        className="w-24" 
                        type="number" 
                        min={1} 
                        value={authorForm.watch('fixedSchedule')?.value || 60} 
                        onChange={(e)=>authorForm.setValue('fixedSchedule', {
                          value: Number(e.target.value)||1,
                          unit: authorForm.watch('fixedSchedule')?.unit || 'minute'
                        })} 
                      />
                      <select 
                        className="h-10 px-3 rounded-md border border-input bg-background" 
                        value={authorForm.watch('fixedSchedule')?.unit || 'minute'} 
                        onChange={(e)=>authorForm.setValue('fixedSchedule', {
                          value: authorForm.watch('fixedSchedule')?.value || 60,
                          unit: e.target.value as 'minute' | 'hour' | 'day'
                        })}
                      >
                        <option value="minute">分钟</option>
                        <option value="hour">小时</option>
                        <option value="day">天</option>
                      </select>
                      <span className="text-muted-foreground text-sm">（固定频率不得小于1分钟）</span>
                    </div>
                    {authorForm.formState.errors.fixedSchedule && (
                      <span className="text-sm text-destructive">{authorForm.formState.errors.fixedSchedule.message}</span>
                    )}
                  </div>
                )}
                {authorForm.watch('strategyMode') === 'smart' && (
                  <div className="text-xs text-muted-foreground">前5天每10分钟、5~14天每2小时、14天后每4小时</div>
                )}
              </>
            )}
          </div>

          {/* 截止时间 */}
          <div className="space-y-2">
            <div className="text-muted-foreground">截止时间</div>
            {taskType === 'video' ? (
              <Controller
                name="deadline"
                control={videoForm.control}
                render={({ field }) => (
                  <>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="选择截止日期和时间"
                      showTime={true}
                    />
                    {videoForm.formState.errors.deadline && (
                      <span className="text-sm text-destructive">{videoForm.formState.errors.deadline.message}</span>
                    )}
                  </>
                )}
              />
            ) : (
              <Controller
                name="deadline"
                control={authorForm.control}
                render={({ field }) => (
                  <>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="选择截止日期和时间"
                      showTime={true}
                    />
                    {authorForm.formState.errors.deadline && (
                      <span className="text-sm text-destructive">{authorForm.formState.errors.deadline.message}</span>
                    )}
                  </>
                )}
              />
            )}
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={!currentForm.formState.isValid}>创建</Button>
          </ModalFooter>
        </form>
      </ModalBody>
    </Modal>
  )
}
