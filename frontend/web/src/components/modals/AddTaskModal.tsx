import { useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUISelection } from '@/store/uiSelection'
import TagInput from '@/components/ui/TagInput'

export default function AddTaskModal() {
  const { addTaskOpen, setAddTaskOpen, type } = useUISelection()

  // local state
  const [taskType, setTaskType] = useState<'video' | 'author'>(type)
  const [title, setTitle] = useState('')
  const [bv, setBv] = useState('')
  const [nickname, setNickname] = useState('')
  const [uid, setUid] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [strategyMode, setStrategyMode] = useState<'fixed' | 'smart'>('fixed')
  const [fixedValue, setFixedValue] = useState(60)
  const [fixedUnit, setFixedUnit] = useState<'minute' | 'hour' | 'day'>('minute')
  const [deadline, setDeadline] = useState('')
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    if (addTaskOpen) {
      setTaskType(type)
      setTitle('')
      setBv('')
      setNickname('')
      setUid('')
      setTags([])
      setStrategyMode('fixed')
      setFixedValue(60)
      setFixedUnit('minute')
      setDeadline('')
      setAccountId('')
    }
  }, [addTaskOpen, type])

  const onClose = () => setAddTaskOpen(false)
  const onCreate = () => {
    alert(`已创建（低保真演示）\n类型: ${taskType}\n标题/昵称: ${taskType==='video'?title:nickname}\nID: ${taskType==='video'?bv:uid}\n标签: ${tags.join(', ')}`)
    onClose()
  }

  return (
    <Modal open={addTaskOpen} onClose={onClose}>
      <ModalHeader title="新增监控任务（低保真）" />
      <ModalBody>
        <div className="space-y-6 text-sm">
          {/* 基本信息 */}
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

            {taskType === 'video' ? (
              <div className="grid grid-cols-3 gap-3 items-center mt-2">
                <div className="text-gray-600">标题</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={title} onChange={(e)=>setTitle(e.target.value)} /></div>
                <div className="text-gray-600">BV号</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={bv} onChange={(e)=>setBv(e.target.value)} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 items-center mt-2">
                <div className="text-gray-600">昵称</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={nickname} onChange={(e)=>setNickname(e.target.value)} /></div>
                <div className="text-gray-600">UID</div>
                <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={uid} onChange={(e)=>setUid(e.target.value)} /></div>
              </div>
            )}
          </div>

          {/* 标签 */}
          <div className="space-y-2">
            <div className="text-gray-600">标签</div>
            <TagInput value={tags} onChange={setTags} placeholder="输入以搜索已有标签，回车添加；悬停标签可删除" />
          </div>

          {/* 关联账号（占位） */}
          <div className="space-y-2">
            <div className="text-gray-600">关联账号（可选）</div>
            <select className="h-9 px-3 border border-gray-300 rounded-md w-full" value={accountId} onChange={(e)=>setAccountId(e.target.value)}>
              <option value="">不关联（仅公开数据）</option>
              <option value="a1">示例账号 a1</option>
              <option value="a2">示例账号 a2</option>
            </select>
          </div>

          {/* 定时策略 */}
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

