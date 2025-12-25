import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getNotificationChannels, saveNotificationChannels, testNotification, getNotificationRules, saveNotificationRule, deleteNotificationRule } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/AlertDialog'
import { toast } from "sonner"
import { notificationRuleSchema, type NotificationRuleFormData } from '@/lib/validations/notificationSchema'
import { 
  CHANNEL_TYPES, 
  CHANNEL_NAMES,
  emailChannelConfigSchema,
  wecomChannelConfigSchema,
  onebotChannelConfigSchema,
  webhookChannelConfigSchema,
  telegramChannelConfigSchema,
  dingtalkChannelConfigSchema,
  feishuChannelConfigSchema,
  barkChannelConfigSchema,
  pushdeerChannelConfigSchema,
  type ChannelType 
} from '@/lib/validations/channelSchemas'
import { EmailChannelConfig } from '@/components/notifications/EmailChannelConfig'
import { WecomChannelConfig } from '@/components/notifications/WecomChannelConfig'
import { OneBotChannelConfig } from '@/components/notifications/OneBotChannelConfig'
import { WebhookChannelConfig } from '@/components/notifications/WebhookChannelConfig'
import { TelegramChannelConfig } from '@/components/notifications/TelegramChannelConfig'
import { DingTalkChannelConfig } from '@/components/notifications/DingTalkChannelConfig'
import { FeishuChannelConfig } from '@/components/notifications/FeishuChannelConfig'
import { BarkChannelConfig } from '@/components/notifications/BarkChannelConfig'
import { PushDeerChannelConfig } from '@/components/notifications/PushDeerChannelConfig'

const CHANNELS = CHANNEL_TYPES

type ChannelKey = ChannelType

type ChannelsState = Record<string, any>

type Rule = {
  id?: string
  name: string
  enabled: boolean
  triggers: string[]
  channels: string[]
}

type TabKey = 'channels' | 'rules'

export default function NotificationsPage() {
  const [tab, setTab] = useState<TabKey>('channels')

  // channels tab
  const [channels, setChannels] = useState<ChannelsState>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingChannel, setTestingChannel] = useState<string | null>(null)
  const [channelErrors, setChannelErrors] = useState<Record<string, Record<string, string>>>({})

  // rules tab
  const [rules, setRules] = useState<Rule[]>([])
  const [ruleTriggers, setRuleTriggers] = useState<string[]>([])
  const [ruleChannelKeys, setRuleChannelKeys] = useState<string[]>([])
  const [loadingRules, setLoadingRules] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)

  // 规则表单
  const ruleForm = useForm<NotificationRuleFormData>({
    resolver: zodResolver(notificationRuleSchema),
    defaultValues: {
      name: '',
      enabled: true,
      triggers: [],
      channels: [],
    },
    mode: 'onChange',
  })

  async function loadChannels() {
    setLoading(true)
    try {
      const data = await getNotificationChannels()
      setChannels(data || {})
    } catch (e: any) {
      toast.error(e?.message || '加载失败（低保真）')
    } finally {
      setLoading(false)
    }
  }

  async function loadRules() {
    setLoadingRules(true)
    try {
      const data = await getNotificationRules()
      setRules(data.items || [])
      setRuleTriggers(data.triggers || [])
      setRuleChannelKeys(data.channels || [])
    } catch (e: any) {
      toast.error(e?.message || '规则加载失败（低保真）')
    } finally {
      setLoadingRules(false)
    }
  }

  useEffect(() => { loadChannels() }, [])
  useEffect(() => { if (tab === 'rules') loadRules() }, [tab])

  // 当 editing 改变时，更新表单
  useEffect(() => {
    if (editing) {
      ruleForm.reset({
        name: editing.name,
        enabled: editing.enabled,
        triggers: editing.triggers,
        channels: editing.channels,
      })
    }
  }, [editing])

  function setField(k: ChannelKey, field: string, value: any) {
    setChannels(prev => {
      const newChannels = { ...prev, [k]: { ...(prev[k]||{}), [field]: value } }
      // 验证渠道配置
      validateChannelConfig(k, newChannels[k])
      return newChannels
    })
  }

  function validateChannelConfig(k: ChannelKey, config: any) {
    const errors: Record<string, string> = {}
    
    if (!config || !config.enabled) {
      setChannelErrors(prev => ({ ...prev, [k]: {} }))
      return
    }

    // 根据渠道类型选择对应的schema进行验证
    let schema: any = null
    
    switch (k) {
      case 'email':
        schema = emailChannelConfigSchema
        break
      case 'wecom':
        schema = wecomChannelConfigSchema
        break
      case 'onebot':
        schema = onebotChannelConfigSchema
        break
      case 'webhook':
        schema = webhookChannelConfigSchema
        break
      case 'telegram':
        schema = telegramChannelConfigSchema
        break
      case 'dingtalk':
        schema = dingtalkChannelConfigSchema
        break
      case 'feishu':
        schema = feishuChannelConfigSchema
        break
      case 'bark':
        schema = barkChannelConfigSchema
        break
      case 'pushdeer':
        schema = pushdeerChannelConfigSchema
        break
      // 所有渠道都已支持
      default:
        schema = null
    }

    if (schema) {
      const result = schema.safeParse(config)
      if (!result.success) {
        result.error.issues.forEach((err: any) => {
          if (err.path && err.path[0]) {
            errors[err.path[0] as string] = err.message
          }
        })
      }
    }

    setChannelErrors(prev => ({ ...prev, [k]: errors }))
  }

  async function onSaveChannels() {
    try {
      setSaving(true)
      await saveNotificationChannels(channels)
      toast.success('保存成功')
    } catch (e: any) {
      toast.error(e?.message || '保存失败（低保真）')
    } finally {
      setSaving(false)
    }
  }

  async function onTest(k: ChannelKey) {
    const config = channels[k]
    if (!config?.enabled) {
      toast.error('请先启用该渠道')
      return
    }
    if (!config?.target) {
      toast.error('请先填写目标地址')
      return
    }

    // 验证配置
    validateChannelConfig(k, config)
    if (channelErrors[k] && Object.keys(channelErrors[k]).length > 0) {
      toast.error('渠道配置有误，请检查后重试')
      return
    }

    setTestingChannel(k)
    try {
      await testNotification(k, { text: '测试消息' })
      toast.success(`测试消息已成功发送到 ${k}`)
    } catch (e: any) {
      toast.error(`测试发送失败：${e?.message || '未知错误'}`)
    } finally {
      setTestingChannel(null)
    }
  }

  // rules tab handlers
  const openCreate = () => {
    setEditing({ name: '', enabled: true, triggers: [], channels: [] })
    ruleForm.reset({
      name: '',
      enabled: true,
      triggers: [],
      channels: [],
    })
  }
  const openEdit = (r: Rule) => {
    setEditing({ ...r })
    ruleForm.reset({
      name: r.name,
      enabled: r.enabled,
      triggers: r.triggers,
      channels: r.channels,
    })
  }
  const closeEdit = () => {
    setEditing(null)
    ruleForm.reset()
  }
  const toggleRuleTrigger = (key: string) => {
    const current = ruleForm.getValues('triggers')
    const updated = current.includes(key) 
      ? current.filter(i => i !== key)
      : [...current, key]
    ruleForm.setValue('triggers', updated)
  }
  const toggleRuleChannel = (key: string) => {
    const current = ruleForm.getValues('channels')
    const updated = current.includes(key)
      ? current.filter(i => i !== key)
      : [...current, key]
    ruleForm.setValue('channels', updated)
  }
  const onSaveRule = async (data: NotificationRuleFormData) => {
    if (!editing) return
    try {
      await saveNotificationRule({
        ...editing,
        ...data,
      })
      toast.success('规则已保存')
      closeEdit()
      loadRules()
    } catch (e: any) {
      toast.error(e?.message || '保存失败')
    }
  }
  const onDeleteRule = async (id: string) => {
    try {
      await deleteNotificationRule(id)
      toast.success('已删除')
      loadRules()
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    }
  }

  return (
    <div className="container-page py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">通知设置（低保真）</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Button variant={tab==='channels' ? 'default' : 'outline'} size="sm" onClick={()=>setTab('channels')}>渠道</Button>
        <Button variant={tab==='rules' ? 'default' : 'outline'} size="sm" onClick={()=>setTab('rules')}>规则</Button>
      </div>

      {tab === 'channels' ? (
        <>
          <div className="flex items-center gap-2">
            <Button onClick={onSaveChannels} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
            <Button variant="ghost" onClick={loadChannels}>刷新</Button>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground py-10 text-center">加载中...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {CHANNELS.map(k => {
                const c = channels[k] || {}
                const channelName = CHANNEL_NAMES[k] || k
                
                return (
                  <section key={k} className="card p-4 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h2 className="font-medium text-lg">{channelName}</h2>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input 
                          type="checkbox" 
                          checked={!!c.enabled} 
                          onChange={e=>setField(k,'enabled',e.target.checked)} 
                        /> 
                        <span className="font-medium">启用</span>
                      </label>
                    </div>
                    
                    {c.enabled && (
                      <>
                        {/* 根据渠道类型渲染不同的配置表单 */}
                        {k === 'email' && (
                          <EmailChannelConfig
                            config={c}
                            errors={channelErrors[k] || {}}
                            onChange={(field, value) => setField(k, field, value)}
                          />
                        )}
                        {k === 'wecom' && (
                          <WecomChannelConfig
                            config={c}
                            errors={channelErrors[k] || {}}
                            onChange={(field, value) => setField(k, field, value)}
                          />
                        )}
                        {k === 'onebot' && (
                          <OneBotChannelConfig
                            config={c}
                            errors={channelErrors[k] || {}}
                            onChange={(field, value) => setField(k, field, value)}
                          />
                        )}
                        {k === 'webhook' && (
                          <WebhookChannelConfig
                            config={c}
                            errors={channelErrors[k] || {}}
                            onChange={(field, value) => setField(k, field, value)}
                          />
                        )}
                        {k === 'telegram' && (
                          <TelegramChannelConfig
                            config={c}
                            errors={channelErrors[k] || {}}
                            onChange={(field, value) => setField(k, field, value)}
                          />
                        )}
                        {k === 'dingtalk' && (
                          <DingTalkChannelConfig
                            config={c}
                            errors={channelErrors[k] || {}}
                            onChange={(field, value) => setField(k, field, value)}
                          />
                        )}
                        {k === 'feishu' && (
                          <FeishuChannelConfig
                            config={c}
                            errors={channelErrors[k] || {}}
                            onChange={(field, value) => setField(k, field, value)}
                          />
                        )}
                        {k === 'bark' && (
                          <BarkChannelConfig
                            config={c}
                            errors={channelErrors[k] || {}}
                            onChange={(field, value) => setField(k, field, value)}
                          />
                        )}
                        {k === 'pushdeer' && (
                          <PushDeerChannelConfig
                            config={c}
                            errors={channelErrors[k] || {}}
                            onChange={(field, value) => setField(k, field, value)}
                          />
                        )}
                        {/* 所有渠道都已支持专用配置组件 */}
                        {!['email', 'wecom', 'onebot', 'webhook', 'telegram', 'dingtalk', 'feishu', 'bark', 'pushdeer'].includes(k) && (
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div>
                              <div className="text-muted-foreground">目标</div>
                              <Input 
                                value={c.target||''} 
                                onChange={e=>setField(k,'target',e.target.value)} 
                                placeholder={k === 'webhook' ? 'https://example.com/webhook' : '目标地址'}
                                className={channelErrors[k]?.target ? 'border-destructive' : ''}
                              />
                              {channelErrors[k]?.target && (
                                <span className="text-xs text-destructive mt-1">{channelErrors[k].target}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-muted-foreground">Token（可选）</div>
                              <Input 
                                value={c.token||''} 
                                onChange={e=>setField(k,'token',e.target.value)} 
                                placeholder="如需要鉴权则填写"
                              />
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-xs text-yellow-800">
                              ⚠️ 此渠道暂不支持Web界面配置，请使用配置文件或API直接配置
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 border-t">
                          <Button 
                            variant="outline" 
                            onClick={()=>onTest(k)}
                            disabled={testingChannel === k || Object.keys(channelErrors[k] || {}).length > 0}
                          >
                            {testingChannel === k ? '测试中...' : '测试发送'}
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {!c.enabled && (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        勾选"启用"以配置此通知渠道
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Button onClick={openCreate}>新建规则</Button>
            <Button variant="ghost" onClick={loadRules}>刷新</Button>
          </div>
          {loadingRules ? (
            <div className="text-sm text-muted-foreground py-10 text-center">加载中...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {rules.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{r.name}</span>
                          <Badge variant={r.enabled ? 'default' : 'outline'}>
                            {r.enabled ? '启用' : '禁用'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          触发器：{r.triggers.join(', ') || '—'} · 渠道：{r.channels.join(', ') || '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="form-checkbox"
                            checked={!!r.enabled} 
                            onChange={async (e)=>{ 
                              try{ 
                                await saveNotificationRule({ ...r, enabled: e.target.checked })
                                toast.success('已更新')
                                loadRules() 
                              } catch(err:any){ 
                                toast.error(err?.message||'更新失败') 
                              } 
                            }} 
                          /> 
                          启用
                        </label>
                        <Button variant="outline" size="sm" onClick={()=>openEdit(r)}>编辑</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">删除</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确定删除规则？</AlertDialogTitle>
                              <AlertDialogDescription>
                                此操作不可撤销。这将永久删除通知规则 “{r.name}”。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={()=>onDeleteRule(r.id!)}>确定</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {rules.length === 0 && (
                <EmptyState
                  title="暂无通知规则"
                  description="创建通知规则以在特定事件发生时接收通知。"
                  action={
                    <Button onClick={openCreate}>新建规则</Button>
                  }
                />
              )}
            </div>
          )}

          {/* 编辑/新建 Modal */}
          <Modal open={!!editing} onClose={closeEdit}>
            <ModalHeader title={editing?.id ? '编辑规则' : '新建规则'} />
            <ModalBody>
              {editing && (
                <form onSubmit={ruleForm.handleSubmit(onSaveRule as any)} className="space-y-6 text-sm">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-1">
                        <div className="text-muted-foreground">名称 <span className="text-destructive">*</span></div>
                        <Input 
                          {...ruleForm.register('name')} 
                          placeholder="规则名称"
                        />
                        {ruleForm.formState.errors.name && (
                          <span className="text-xs text-destructive">{ruleForm.formState.errors.name.message}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">启用</div>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="form-checkbox"
                            {...ruleForm.register('enabled')} 
                          /> 
                          启用此规则
                        </label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <div className="text-muted-foreground">触发器 <span className="text-destructive">*</span></div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex flex-wrap gap-3">
                        {ruleTriggers.map(t => (
                          <label key={t} className="inline-flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="form-checkbox"
                              checked={ruleForm.watch('triggers').includes(t)} 
                              onChange={()=>toggleRuleTrigger(t)} 
                            /> 
                            {t}
                          </label>
                        ))}
                      </div>
                      {ruleForm.formState.errors.triggers && (
                        <span className="text-xs text-destructive mt-2 block">{ruleForm.formState.errors.triggers.message}</span>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <div className="text-muted-foreground">渠道 <span className="text-destructive">*</span></div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex flex-wrap gap-3">
                        {(ruleChannelKeys.length ? ruleChannelKeys : CHANNELS as unknown as string[]).map(c => (
                          <label key={c} className="inline-flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="form-checkbox"
                              checked={ruleForm.watch('channels').includes(c)} 
                              onChange={()=>toggleRuleChannel(c)} 
                            /> 
                            {c}
                          </label>
                        ))}
                      </div>
                      {ruleForm.formState.errors.channels && (
                        <span className="text-xs text-destructive mt-2 block">{ruleForm.formState.errors.channels.message}</span>
                      )}
                    </CardContent>
                  </Card>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={closeEdit}>取消</Button>
                      <Button type="submit" disabled={!ruleForm.formState.isValid}>保存</Button>
                    </div>
                </form>
              )}
            </ModalBody>
          </Modal>
        </>
      )}
    </div>
  )
}
