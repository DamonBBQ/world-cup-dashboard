# 三档中心保护层 — 外部参考规则接入

## 变更概述

将「三档中心保护层」作为外部参考规则接入小额多票拆单系统，替换固定的 `getGoalOptions()` / `getHighGoalOptions()` / `getLowGoalOptions()` 硬编码逻辑。

## 关键设计原则

- **状态明确**：`ruleStatus` = `external_reference`，前端文案不得声称"本系统已验证"
- **启发式使用**：仅影响区间选择，不作为盈利保证，不触发自动加仓
- **本地复盘**：通过 localStorage 积累真实复盘数据，达到阈值后允许升级状态

## 新增文件

### `data/model_rules/goal_center_protection_external.json`
外部参考规则元数据，含外部大样本数据（30%/40%测试命中率）和本地验证状态结构。

## 核心类型（ticketSplitEngine.ts）

```typescript
// 三档保护层
export interface GoalCenterProtection {
  matchId: string;
  matchName: string;
  expectedGoals: number;      // 估算期望进球
  center: number;
  mainRange: string[];        // 主区间
  lowProtect: string[];       // 低位保护
  highProtect: string[];      // 高位保护
  wideCover: string[];        // 宽覆盖
  confidenceSource: 'rating_heuristic' | 'odds' | 'xg' | 'external_reference';
  ruleStatus: 'external_reference' | 'candidate' | 'local_validated';
  reason: string;
}

// 本地复盘记录
export interface LocalGoalReview {
  matchId: string;
  actualTotalGoals: number | null;
  hitCenter: boolean;
  hitProtection: boolean;
  hitAnyLayer: boolean;
  reviewTime: string;
  // ...其他字段
}
```

## 核心函数

### `buildGoalCenterProtection(match)` — 动态计算保护层

根据 `homeRating` 和 `awayRating` 估算 `expectedGoals`，再按档位选择区间：

| expectedGoals | mainRange | lowProtect | highProtect | wideCover |
|---|---|---|---|---|
| ≤ 2.1 | 0/1/2球 | 0/1球 | 2/3球 | 0/1/2球 |
| 2.1~2.6 | 1/2球 | 0/1球 | 3/4球 | 0/1/2球 |
| 2.6~3.1 | 2/3球 | 1/2球 | 3/4球 | 1/2/3球 |
| > 3.1 | 3/4球 | 1/2球 | 4/5球 | 2/3/4球 |

估算逻辑：
- `base = 1.8 + (avgRating - 65) / 22 * 1.4`（基础期望）
- `homeBonus = homeRating > awayRating ? 0.15 : 0`（主场加成）
- `diffPenalty = diff > 20 ? -0.25 : diff > 12 ? -0.15 : 0`（实力悬殊修正）

### `generateSplitTickets()` 更新

- 每场比赛预计算 `goalCenterProtections`（`pool.map(buildGoalCenterProtection)`）
- 主线覆盖票：使用 `mainRange`
- 防冷保护票 variant 0：使用 `highProtect`（防极端高比分）
- 防冷保护票 variant 1：conservative→`lowProtect`，moderate→`mainRange`，aggressive→`highProtect`
- `SanitizedResult` 新增 `goalCenterProtections` 字段
- `rebuildSanitizedResultFromTickets` 返回空 `goalCenterProtections: []`

### 本地复盘存储

- `getLocalGoalReviews()`：从 localStorage 读取
- `saveLocalGoalReview(review)`：保存或更新复盘记录
- `getLocalValidationStatus()`：返回验证状态

## 前端展示（SplitTicketBuilder.tsx）

### 新增组件
- `GoalCenterProtectionPanel`：主容器，含标题、说明、四区卡片
- `GoalProtectionCard`：单场比赛保护层卡片，含区间标签、复盘输入
- `LayerBadge`：区间标签（绿/蓝/琥珀/灰四色）
- `LocalValidationProgress`：三段进度条（30场→100场→300场）

### 验证状态阈值
- 0 场：尚无复盘数据
- 1~29 场：初步观察
- 30~99 场：初步观察（显示场数）
- 100~299 场：本地可参考（显示命中率）
- 300+ 场：本地已验证（允许升级 ruleStatus）

### 前端强制文案
> "⚠️ 外部参考说明：'三档中心保护层'参考外部大样本结论（30%测试筛后2750场命中80.91%，40%测试筛后2482场命中83.48%）。本系统目前没有原始样本复现，该规则作为候选启发式使用，并通过后续本地复盘逐步验证。"

## 验收结果

| 验收标准 | 状态 |
|---|---|
| getGoalOptions 不再固定返回 1球/2球 | ✅ 已替换为 per-match mainRange |
| 每场比赛都有 GoalCenterProtection | ✅ `pool.map(buildGoalCenterProtection)` |
| 前端不宣称本系统已完成大样本验证 | ✅ 强制外部参考说明文案 |
| 前端必须显示"外部参考规则"标签 | ✅ 紫色 badge 标签 |
| 票组生成能体现 mainRange/lowProtect/highProtect | ✅ 三类票分别使用 |
| 单点3球不能作为主线票 | ✅ 仅在 aggressive cold variant 1 出现（防守场景） |
| 能记录本地复盘结果 | ✅ localStorage + saveLocalGoalReview |
| npm run build 通过 | ✅ 773.44 kB JS，245ms |
