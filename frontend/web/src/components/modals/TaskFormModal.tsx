import { useEffect, useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUISelection } from '@/store/uiSelection'
import TagInput from '@/components/ui/TagInput'

export default function TaskFormModal() {
  const { editingTask, setEditingTask } = useUISelection()
  const open = !!editingTask

  // low-fi local state (no data binding)
  const isVideo = editingTask?.type === 'video'
  const [strategyMode, setStrategyMode] = useState<'fixed' | 'smart'>('fixed')
  const [fixedValue, setFixedValue] = useState(60)
  const [fixedUnit, setFixedUnit] = useState<'minute' | 'hour' | 'day'>('minute')
  const [deadline, setDeadline] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // editable basics
  const [title, setTitle] = useState('')
  const [bv, setBv] = useState('')
  const [nickname, setNickname] = useState('')
  const [uid, setUid] = useState('')

  useEffect(() => {
    // reset on open change (low-fi)
    if (open) {
      setStrategyMode('fixed')
      setFixedValue(60)
      setFixedUnit('minute')
      setDeadline('')
      setTags([])
      setTitle('示例标题')
      setBv('BV1abc123XYZ')
      setNickname('示例博主')
      setUid('123456')
    }
  }, [open])

  const onClose = () => setEditingTask(null)
  const onSave = () => {
    alert('已保存（低保真演示，无实际提交）\n标题/昵称、BV/UID、标签、策略均仅为占位。')
    onClose()
  }
  const onDelete = () => {
    if (confirm('确认删除该任务？（低保真演示）')) onClose()
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title={editingTask ? `编辑任务（${isVideo ? '视频' : '博主'}）` : '编辑任务'} />
      <ModalBody>
        <div className="space-y-6 text-sm">
          {/* 基本信息可编辑 */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3 items-center">
              <div className="text-gray-600">任务类型</div>
              <div className="col-span-2">{isVideo ? '视频' : '博主'}</div>
              {isVideo ? (
                <>
                  <div className="text-gray-600">标题</div>
                  <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={title} onChange={(e)=>setTitle(e.target.value)} /></div>
                  <div className="text-gray-600">BV号</div>
                  <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={bv} onChange={(e)=>setBv(e.target.value)} /></div>
                </>
              ) : (
                <>
                  <div className="text-gray-600">昵称</div>
                  <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={nickname} onChange={(e)=>setNickname(e.target.value)} /></div>
                  <div className="text-gray-600">UID</div>
                  <div className="col-span-2"><input className="h-9 w-full px-3 border border-gray-300 rounded-md" value={uid} onChange={(e)=>setUid(e.target.value)} /></div>
                </>
              )}
            </div>
          </div>

          {/* 标签：可交互式输入（模糊搜索+回车添加+悬停删除） */}
          <div className="space-y-2">
            <div className="text-gray-600">标签</div>
            <TagInput value={tags} onChange={setTags} placeholder="输入以搜索已有标签，回车添加；悬停标签可删除" />
          </div>

          {/* 定时策略 */}
          <div className="space-y-2">
            <div className="text-gray-600">定时策略</div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-gray-800">
                <input
                  type="radio"
                  name="strategy"
                  checked={strategyMode === 'fixed'}
                  onChange={() => setStrategyMode('fixed')}
                />
                固定频率
              </label>
              <label className={`inline-flex items-center gap-2 ${isVideo ? 'text-gray-800' : 'text-gray-400'}`}>
                <input
                  type="radio"
                  name="strategy"
                  disabled={!isVideo}
                  checked={strategyMode === 'smart'}
                  onChange={() => isVideo && setStrategyMode('smart')}
                />
                智能频率（仅视频）
              </label>
            </div>
            {strategyMode === 'fixed' && (
              <div className="flex items-center gap-2">
                <input
                  className="h-9 w-24 px-3 border border-gray-300 rounded-md"
                  type="number"
                  min={1}
                  value={fixedValue}
                  onChange={(e) => setFixedValue(Number(e.target.value) || 1)}
                />
                <select
                  className="h-9 px-3 border border-gray-300 rounded-md"
                  value={fixedUnit}
                  onChange={(e) => setFixedUnit(e.target.value as any)}
                >
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
            <input
              type="datetime-local"
              className="h-9 px-3 border border-gray-300 rounded-md"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="destructive" onClick={onDelete}>删除任务</Button>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={onSave}>保存</Button>
      </ModalFooter>
    </Modal>
  )
}
