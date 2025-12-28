# Clarification Session Report

**Feature**: 前端导航结构重组 (006-navigation-restructure)  
**Date**: 2025-12-28  
**Questions Asked**: 9 (all answered)  
**Status**: ✅ All Critical Ambiguities Resolved

---

## Summary

所有关键技术决策点已通过澄清会话解决。规格现在包含明确的数据模型变更、状态管理策略、UI/UX细节和数据抓取逻辑。

---

## Answered Questions

### 1. Tasks表数据模型扩展 ✅
**Q**: Tasks表缺少author_uid字段，无法按发布者筛选任务，如何解决？  
**A**: 添加数据库迁移，给tasks表增加author_uid字段（对视频task和博主task都适用）

**Impact**: P0 - 阻塞核心功能"我的账号"页面按作者筛选任务

---

### 2. 全局默认账号持久化 ✅
**Q**: 全局默认账号未持久化到数据库，如何实现？  
**A**: 在settings表中存储default_account_id

**Impact**: P0 - 阻塞数据抓取逻辑的正确实现

---

### 3. 账号字段语义澄清 ✅
**Q**: tasks表中account_id字段的语义是什么？与新增的bili_account_id有何区别？  
**A**: account_id原意为"创建者"，易混淆；新增bili_account_id字段表示"查询用账号"，保留account_id避免破坏现有系统

**Impact**: P0 - 避免字段语义混淆，确保向后兼容

---

### 4. localStorage Fallback逻辑 ✅
**Q**: localStorage存储选中账号ID后，如果账号被解绑如何处理？  
**A**: 实现fallback逻辑：检查ID是否存在 → 否则选第一个可用账号 → 否则显示空状态

**Impact**: P1 - 防止运行时错误，提升用户体验

---

### 5. Zustand State缓存策略 ✅
**Q**: Zustand state中是否缓存selectedAccount对象？  
**A**: 方案A：只存ID，每次从API获取（实时性好）

**Impact**: P1 - 确定前端架构设计

---

### 6. 系统设置菜单自动展开 ✅
**Q**: 系统设置菜单在刷新页面后，如果当前路由是子菜单是否自动展开？  
**A**: 自动展开（提升UX）

**Impact**: P2 - UX细节优化

---

### 7. 数据仪表板UI设计 ✅
**Q**: 数据仪表板是否需要显示变化趋势和小图表？  
**A**: 暂不需要变化趋势，卡片同行多列左对齐，固定大小

**Impact**: P2 - UI实现范围界定

---

### 8. 粉丝图表数据范围 ✅
**Q**: 粉丝图表默认展示多长时间的数据？  
**A**: 加载全部数据，横轴时间缩放到最近30天（与现有实现保持一致）

**Impact**: P2 - 性能与一致性平衡

---

### 9. Author任务的author_uid值 ✅
**Q**: 对于type='author'的博主监控任务，author_uid字段应该存储什么值？  
**A**: 存储博主自己的UID（与target_id相同），便于统一查询

**Impact**: P1 - 数据模型一致性，简化查询逻辑

---

## Coverage Summary

| Category | Status | Details |
|----------|--------|---------|
| **Functional Scope & Behavior** | ✅ Resolved | User goals, success criteria, out-of-scope明确 |
| **Domain & Data Model** | ✅ Resolved | Tasks表扩展(author_uid, bili_account_id)、Settings表(default_account_id)已澄清 |
| **Interaction & UX Flow** | ✅ Resolved | 关键用户旅程、空状态、菜单自动展开、fallback逻辑已明确 |
| **Non-Functional Quality** | ✅ Clear | 8个可量化性能指标(SC-001至SC-008) |
| **Integration & Dependencies** | ✅ Clear | B站API依赖、后端数据模型变更、前端组件需求已列出 |
| **Edge Cases & Failure Handling** | ✅ Clear | localStorage fallback、账号解绑、Cookie过期等已覆盖 |
| **Constraints & Tradeoffs** | ✅ Clear | 浏览器兼容性、账号数量限制(≤10)、实时性vs缓存策略已说明 |
| **Terminology & Consistency** | ✅ Resolved | "account_id" vs "bili_account_id"、"author_uid"语义已统一 |
| **Completion Signals** | ✅ Clear | 验收标准可测试，Definition of Done明确 |
| **Placeholders / TODOs** | ✅ Clear | 无遗留待决事项 |

---

## Updated Sections

以下规格章节已根据澄清结果更新：

1. **Clarifications** (新增) - Session 2025-12-28记录所有9个Q&A
2. **FR-003** - 增加系统设置菜单自动展开逻辑
3. **FR-010** - 明确数据仪表板UI布局(同行多列，左对齐，固定大小)
4. **FR-011** - 明确粉丝图表数据加载策略(全部数据+横轴缩放30天)
5. **FR-015** - 增加localStorage fallback逻辑
6. **FR-032至FR-036** - 重写数据抓取逻辑，明确三级优先级(bili_account_id → author_uid → default)
7. **Key Entities** - 明确Tasks表新字段语义、Zustand state设计、Settings表结构
8. **Dependencies** - 详细列出数据模型变更(author_uid, bili_account_id字段定义)
9. **Assumptions** - 更新为"需要数据模型扩展"而非"API已稳定"

---

## Risk Assessment

### High-Impact Resolved Issues
✅ Tasks表缺失字段 - 已解决(添加author_uid和bili_account_id)  
✅ 全局默认账号未持久化 - 已解决(settings表存储)  
✅ 字段语义混淆 - 已解决(明确account_id vs bili_account_id)

### Medium-Impact Resolved Issues
✅ 前端状态管理策略 - 已明确(Zustand存ID，API获取详情)  
✅ 数据查询逻辑 - 已明确(统一WHERE author_uid查询)  
✅ UI/UX细节 - 已明确(菜单展开、仪表板布局、图表范围)

### Remaining Risks
⚠️ **数据库迁移风险** (低): 需要安全迁移现有tasks表，可能影响运行中的任务  
**缓解措施**: 在plan.md中设计迁移策略，包括备份、测试、回滚计划

⚠️ **粉丝数据聚合性能** (低): author_metrics按task_id存储，需要聚合  
**缓解措施**: 在API层实现高效聚合查询，或考虑后续重构数据模型

---

## Recommendation

✅ **规格已就绪，可以进入技术规划阶段**

所有关键决策点已解决，术语一致，验收标准明确。建议执行：

```bash
/speckit.plan
```

下一步将生成详细的技术实现计划，包括：
- Phase 0: 研究数据库迁移策略和API设计模式
- Phase 1: 数据模型变更、API合约、前端组件设计
- Phase 2: 任务分解和实施路径

---

**Updated Spec Path**: `D:\coding\bili-stats-monitor-spec\specs\006-navigation-restructure\spec.md`  
**Next Command**: `/speckit.plan`

