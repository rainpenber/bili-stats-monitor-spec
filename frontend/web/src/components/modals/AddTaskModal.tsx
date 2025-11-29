import { useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUISelection } from '@/store/uiSelection'
import TagInput from '@/components/ui/TagInput'
import { useSelectVideos } from '@/store/selectVideos'

export default function AddTaskModal() {
  const { addTaskOpen, setAddTaskOpen, type } = useUISelection()
  const selectVideos = useSelectVideos()

  // local state
  const [taskType, setTaskType] = useState<'video' | 'author'>(type)
  const [title, setTitle] = useState('')
  const [bv, setBv] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [nickname, setNickname] = useState('')
  const [uid, setUid] = useState('')
  const [profileUrl, setProfileUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [strategyMode, setStrategyMode] = useState<'fixed' | 'smart'>('fixed')
  const [fixedValue, setFixedValue] = useState(60)
  const [fixedUnit, setFixedUnit] = useState<'minute' | 'hour' | 'day'>('minute')
  const [deadline, setDeadline] = useState('')

  // author specific options
  const [includeVideos, setIncludeVideos] = useState(false)
  const [autoFutureVideos, setAutoFutureVideos] = useState(false)

  useEffect(() => {
    if (addTaskOpen) {
      setTaskType(type)
      setTitle('')
      setBv('')
      setVideoUrl('')
      setNickname('')
      setUid('')
      setProfileUrl('')
      setTags([])
      setStrategyMode(type === 'video' ? 'smart' : 'fixed')
      setFixedValue(60)
      setFixedUnit('minute')
      setDeadline('')
      setIncludeVideos(false)
      setAutoFutureVideos(false)
    }
  }, [addTaskOpen, type])

  const onClose = () => setAddTaskOpen(false)

  async function doLookup() {
    try {
      const body: any = { type: taskType }
      if (taskType === 'video') {
        if (bv) body.bv = bv
        if (videoUrl) body.url = videoUrl
      } else {
        if (uid) body.uid = uid
        if (profileUrl) body.profile_url = profileUrl
      }
      const resp = await fetch('/api/v1/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await resp.json()
      if (json.code !== 0) { alert('查询失败（低保真）'); return }
      const data = json.data || {}
      if (taskType === 'video') {
        setBv(data.bv || bv)
        setTitle(data.title || title)
      } else {
        setUid(data.uid || uid)
        setNickname(data.nickname || nickname)
      }
    } catch (e) {
      console.error(e)
      alert('查询异常（低保真）')
    }
  }

  const onCreate = async () => {
    // 低保真：提示 + 根据勾选弹二次选择视频
    if (taskType === 'author') {
      alert(`已创建“博主监控”任务（低保真）：UID=${uid||'未填写'}`)
      if (includeVideos && uid) {
        selectVideos.openForAuthor(uid)
      }
      if (autoFutureVideos) {
        alert('已开启“实时监控今后发布的视频”（低保真占位：后台将每日检查并为新视频创建任务，频率=每天一次）')
      }
      onClose()
      return
    }
    // 视频
    alert(`已创建“视频监控”任务（低保真）：BV=${bv||'未填写'} 标题=${title||'—'}`)
    onClose()
  }

  return (
    <Modal open={addTaskOpen} onClose={onClose}>
      <ModalHeader title="新增监控任务（低保真）" />
      <ModalBody>
        <div className="space-y-6 text-sm">
          {/* 类型选择 */}
          <div className="space-y-2">
            <div className="text-gray-600">任务类型</div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="taskType" checked={taskType==='video'} onChange={()=>setTaskType('video')} /> 视频
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="taskType" checked={taskType==='author'} onChange={()=>setTaskType('author')} /> 博主
              </label>
            </div>
          </div>

          {/* 输入区 + 查询填充 */}
          {taskType === 'video' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 items-center">
                <div className="text-gray-600">视频链接</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={videoUrl} onChange={(e)=>setVideoUrl(e.target.value)} placeholder="https://www.bilibili.com/video/BV..." /></div>
                <div className="text-gray-600">BV号</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={bv} onChange={(e)=>setBv(e.target.value)} placeholder="BVxxxxxxxx" /></div>
              </div>
              <Button variant="outline" onClick={doLookup}>从链接/ID获取</Button>
              <div className="grid grid-cols-3 gap-3 items-center">
                <div className="text-gray-600">标题</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="可由查询自动填充" /></div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 items-center">
                <div className="text-gray-600">博主空间链接</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={profileUrl} onChange={(e)=>setProfileUrl(e.target.value)} placeholder="https://space.bilibili.com/UID" /></div>
                <div className="text-gray-600">UID</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={uid} onChange={(e)=>setUid(e.target.value)} placeholder="数字/字符串均可" /></div>
              </div>
              <Button variant="outline" onClick={doLookup}>从链接/ID获取</Button>
              <div className="grid grid-cols-3 gap-3 items-center">
                <div className="text-gray-600">昵称</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={nickname} onChange={(e)=>setNickname(e.target.value)} placeholder="可由查询自动填充" /></div>
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={includeVideos} onChange={(e)=>setIncludeVideos(e.target.checked)} />
                  同时监控该博主发布的视频（添加后选择具体视频）
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={autoFutureVideos} onChange={(e)=>setAutoFutureVideos(e.target.checked)} />
                  实时监控该博主今后发布的视频（后台每天检查并自动添加，默认频率每天一次）
                </label>
              </div>
            </div>
          )}

          {/* 标签 */}
          <div className="space-y-2">
            <div className="text-gray-600">标签</div>
            <TagInput value={tags} onChange={setTags} placeholder="输入以搜索已有标签，回车添加；悬停标签可删除；上下键选择候选" />
          </div>

          {/* 定时策略（视频默认智能、博主默认固定） */}
          <div className="space-y-2">
            <div className="text-gray-600">定时策略</div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="strategy" checked={strategyMode==='fixed'} onChange={()=>setStrategyMode('fixed')} /> 固定频率
              </label>
              <label className={`inline-flex items-center gap-2 ${taskType==='video' ? '' : 'text-gray-400'}` }>
                <input type="radio" name="strategy" disabled={taskType!=='video'} checked={strategyMode==='smart'} onChange={()=>taskType==='video' && setStrategyMode('smart')} /> 智能频率（仅视频）
              </label>
            </div>
            {strategyMode === 'fixed' && (
              <div className="flex items-center gap-2">
                <input className="h-9 w-24 px-3 border border-gray-300 rounded-md" type="number" min={1} value={fixedValue} onChange={(e)=>setFixedValue(Number(e.target.value)||1)} />
                <select className="h-9 px-3 border border-gray-300 rounded-md" value={fixedUnit} onChange={(e)=>setFixedUnit(e.target.value as any)}>
                  <option value="minute">分钟</option>
                  <option value="hour">小时</option>
                  <option value="day">天</option>
                </select>
                <span className="text-gray-500">（固定频率不得小于1分钟）</span>
              </div>
            )}
            {strategyMode === 'smart' && (
              <div className="text-xs text-gray-600">前5天每10分钟、5~14天每2小时、14天后每4小时</div>
            )}
          </div>

          {/* 截止时间 */}
          <div className="space-y-2">
            <div className="text-gray-600">截止时间</div>
            <input type="datetime-local" className="h-9 px-3 border border-gray-300 rounded-md" value={deadline} onChange={(e)=>setDeadline(e.target.value)} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={onCreate}>创建</Button>
      </ModalFooter>
    </Modal>
  )
}
