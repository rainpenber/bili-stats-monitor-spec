import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useUISelection } from '@/store/uiSelection'
import TagInput from '@/components/ui/TagInput'
import { DatePicker } from '@/components/ui/DatePicker'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/AlertDialog'
import { videoTaskSchema, authorTaskSchema, type VideoTaskFormData, type AuthorTaskFormData } from '@/lib/validations/taskSchema'
import { toast } from 'sonner'

export default function TaskFormModal() {
  const { editingTask, setEditingTask, activeMeta } = useUISelection()
  const open = !!editingTask

  const isVideo = editingTask?.type === 'video'
  // 从 activeMeta 获取完整的任务数据（低保真阶段使用占位数据）
  const taskData = activeMeta as any

  // 根据任务类型选择 schema 和默认值
  const videoForm = useForm<VideoTaskFormData>({
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
  const currentForm = (isVideo ? videoForm : authorForm) as any

  useEffect(() => {
    // 当 modal 打开时，从 taskData 填充表单数据（低保真阶段使用占位数据）
    if (open && editingTask) {
      if (isVideo) {
        videoForm.reset({
          title: taskData?.title || '示例标题',
          bv: taskData?.bv || taskData?.id || 'BV1abc123XYZ',
          videoUrl: '',
          tags: taskData?.tags || [],
          strategyMode: taskData?.strategy?.mode === 'fixed' ? 'fixed' : 'smart',
          fixedSchedule: taskData?.strategy?.mode === 'fixed' 
            ? { value: taskData.strategy.value || 60, unit: taskData.strategy.unit || 'minute' }
            : undefined,
          deadline: taskData?.deadline ? new Date(taskData.deadline) : undefined,
          includeVideos: false,
          autoFutureVideos: false,
        })
      } else {
        authorForm.reset({
          nickname: taskData?.nickname || '示例博主',
          uid: taskData?.uid || taskData?.id || '123456',
          profileUrl: '',
          tags: taskData?.tags || [],
          strategyMode: taskData?.strategy?.mode === 'fixed' ? 'fixed' : 'smart',
          fixedSchedule: taskData?.strategy?.mode === 'fixed' 
            ? { value: taskData.strategy.value || 60, unit: taskData.strategy.unit || 'minute' }
            : undefined,
          deadline: taskData?.deadline ? new Date(taskData.deadline) : undefined,
          includeVideos: false,
          autoFutureVideos: false,
        })
      }
    }
  }, [open, editingTask, isVideo, taskData])

  const onClose = () => {
    setEditingTask(null)
    currentForm.reset()
  }

  const onSave = async (data: VideoTaskFormData | AuthorTaskFormData) => {
    try {
      if (isVideo) {
        const formData = data as VideoTaskFormData
        const strategy = formData.strategyMode === 'smart' 
          ? { mode: 'smart' } 
          : { mode: 'fixed', value: formData.fixedSchedule!.value, unit: formData.fixedSchedule!.unit }
        // TODO: 调用实际的更新 API
        // await updateTask(editingTask.id, { title: formData.title, bv: formData.bv, tags: formData.tags, strategy, deadline: formData.deadline })
        toast.success('任务已保存（低保真演示）')
      } else {
        const formData = data as AuthorTaskFormData
        const strategy = formData.strategyMode === 'smart' 
          ? { mode: 'smart' } 
          : { mode: 'fixed', value: formData.fixedSchedule!.value, unit: formData.fixedSchedule!.unit }
        // TODO: 调用实际的更新 API
        // await updateTask(editingTask.id, { nickname: formData.nickname, uid: formData.uid, tags: formData.tags, strategy, deadline: formData.deadline })
        toast.success('任务已保存（低保真演示）')
      }
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('保存失败（低保真）')
    }
  }

  const onDelete = async () => {
    try {
      // TODO: 调用实际的删除 API
      // await deleteTask(editingTask.id)
      toast.success('任务已删除（低保真演示）')
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('删除失败（低保真）')
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title={editingTask ? `编辑任务（${isVideo ? '视频' : '博主'}）` : '编辑任务'} />
      <ModalBody>
        <form onSubmit={currentForm.handleSubmit(onSave)} className="space-y-6 text-sm">
          {/* 基本信息可编辑 */}
          <div className="space-y-3">
            <div className="text-muted-foreground">任务类型</div>
            <div>{isVideo ? '视频' : '博主'}</div>
            {isVideo ? (
              <>
                <div className="space-y-1">
                  <div className="text-muted-foreground">标题</div>
                  <Input 
                    {...videoForm.register('title')} 
                  />
                  {videoForm.formState.errors.title && (
                    <span className="text-sm text-destructive">{videoForm.formState.errors.title.message}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">BV号</div>
                  <Input 
                    {...videoForm.register('bv')} 
                  />
                  {videoForm.formState.errors.bv && (
                    <span className="text-sm text-destructive">{videoForm.formState.errors.bv.message}</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="text-muted-foreground">昵称</div>
                  <Input 
                    {...authorForm.register('nickname')} 
                  />
                  {authorForm.formState.errors.nickname && (
                    <span className="text-sm text-destructive">{authorForm.formState.errors.nickname.message}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">UID</div>
                  <Input 
                    {...authorForm.register('uid')} 
                  />
                  {authorForm.formState.errors.uid && (
                    <span className="text-sm text-destructive">{authorForm.formState.errors.uid.message}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <div className="text-muted-foreground">标签</div>
            {isVideo ? (
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
            {isVideo ? (
              <>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      className="form-radio"
                      type="radio"
                      name="strategy"
                      checked={videoForm.watch('strategyMode') === 'fixed'}
                      onChange={() => videoForm.setValue('strategyMode', 'fixed')}
                    />
                    固定频率
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      className="form-radio"
                      type="radio"
                      name="strategy"
                      checked={videoForm.watch('strategyMode') === 'smart'}
                      onChange={() => videoForm.setValue('strategyMode', 'smart')}
                    />
                    智能频率
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
                        onChange={(e) => videoForm.setValue('fixedSchedule', {
                          value: Number(e.target.value) || 1,
                          unit: videoForm.watch('fixedSchedule')?.unit || 'minute'
                        })}
                      />
                      <select
                        className="h-10 px-3 rounded-md border border-input bg-background"
                        value={videoForm.watch('fixedSchedule')?.unit || 'minute'}
                        onChange={(e) => videoForm.setValue('fixedSchedule', {
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
                      checked={authorForm.watch('strategyMode') === 'fixed'}
                      onChange={() => authorForm.setValue('strategyMode', 'fixed')}
                    />
                    固定频率
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      className="form-radio"
                      type="radio"
                      name="strategy"
                      checked={authorForm.watch('strategyMode') === 'smart'}
                      onChange={() => authorForm.setValue('strategyMode', 'smart')}
                    />
                    智能频率
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
                        onChange={(e) => authorForm.setValue('fixedSchedule', {
                          value: Number(e.target.value) || 1,
                          unit: authorForm.watch('fixedSchedule')?.unit || 'minute'
                        })}
                      />
                      <select
                        className="h-10 px-3 rounded-md border border-input bg-background"
                        value={authorForm.watch('fixedSchedule')?.unit || 'minute'}
                        onChange={(e) => authorForm.setValue('fixedSchedule', {
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
            {isVideo ? (
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">删除任务</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定删除该任务？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作不可撤销。这将永久删除{isVideo ? '视频' : '博主'}任务 "{isVideo ? videoForm.watch('title') || videoForm.watch('bv') : authorForm.watch('nickname') || authorForm.watch('uid')}"。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>确定</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={!currentForm.formState.isValid}>保存</Button>
          </ModalFooter>
        </form>
      </ModalBody>
    </Modal>
  )
}
