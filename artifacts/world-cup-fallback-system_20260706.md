# 世界杯数据兜底系统 — 完成报告

## 目标
解决 ESPN/football-data/API-FOOTBALL 均无数据时，首页仍能显示世界杯赛程。

## 完成的 6 项任务

### 1. ✅ 创建本地淘汰赛兜底数据源
- 文件：`api/_world-cup-2026-fallback.ts`（新增）
- 内容：
  - 16 场 Round of 16（含加时赛/点球标记）
  - 8 场 Quarter-final（未开始）
  - 2 场 Semi-final（未开始）
  - 1 场 Final（未开始）
- `FallbackMatch` 接口支持：`homeScoreExtra`、`awayScoreExtra`、`penaltyHome`、`penaltyAway`
- `computeSurvivorsFromFallback()`：按时间排序，已结束比赛计算胜败者，未开始保留双方

### 2. ✅ 修复 MatchBoard/ESPN 跨天日期问题
- **根因**：北京时间 2026-07-06 03:00 = UTC 2026-07-05 19:00，ESPN 按 UTC 索引
- **方案**：新增 `beijingDateToUtcRange()`，将北京时间日期 → [前一天UTC, 当天UTC] 两个日期
- 所有数据源函数改为并行查询 2 个 UTC 日期后合并

### 3. ✅ 更新 `api/live-scores.ts` — 571行（原1073行，精简48%）
- `fetchFromEspnWorldCup(utcDates[], beijingTargetDate)`：并行查 2 天 + 北京时间过滤
- `fetchFromFootballData(utcDates[], beijingTargetDate)`：并行查 2 天 + UTC→北京时间转换
- `fetchFromApiFootball(utcDates[], beijingTargetDate)`：并行查 2 天 + UTC→北京时间转换
- `fetchFromStaticKnockout(beijingDate)`：最终兜底（已是北京时间）
- providerOrder：`espn-worldcup → football-data → api-football → static-knockout`

### 4. ✅ 更新 `api/world-cup-survivors.ts`
- ESPN 无数据时自动降级到 `computeSurvivorsFromLocalFallback()`
- `source: 'static-knockout'` 标签区分数据来源

### 5. ✅ 修复 `TEAM_ALIAS_MAP` 重复键
- `'Saudi Arabia'` 在 `PlayerImpact.tsx` 中出现两次 → 删除重复项

### 6. ✅ TypeScript 零错误 + 构建优化
- `tsc --noEmit`：0 errors
- JS bundle：**736kB → 314kB**（-57%）

## 关键算法

### beijingDateToUtcRange(beijingDate)
```
北京时间 2026-07-06 00:00 ~ 23:59
  = UTC 2026-07-05 16:00 ~ 2026-07-06 15:59
查询 UTC: [2026-07-05, 2026-07-06]
```

### providerOrder（默认）
```
1. espn-worldcup     — 免费，最新赛果
2. football-data     — 有 API Key 时
3. api-football      — 有 API Key 时
4. static-knockout   — 最终兜底（永不失败）
```

## 待探索
- 小组赛数据未包含（需要 48 场小组赛结果）
- dev server 偶尔因端口冲突退出（需配置 fuser 脚本）
- chunk >500kB 警告已随 bundle 缩小自动缓解

## Dev Server
- 状态：运行中（http://localhost:5173/）
- 重启命令：`fuser -k 5173/tcp && npm run dev`
