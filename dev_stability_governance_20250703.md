# 开发环境稳定性治理

## 目标
解决 dev server 频繁挂掉、端口占用、页面白屏等问题，提升开发体验。

## 执行内容

### 1. package.json 新增脚本
- `dev`: `vite --host 0.0.0.0 --port 5173 --strictPort`（固定端口，端口被占直接报错不漂移）
- `kill:5173`: `kill-port 5173`（快速杀端口）
- `dev:restart`: `kill:5173 && dev`（一键重启）
- `clean`: `rimraf node_modules/.vite dist`（清缓存）
- `dev:clean`: `clean && dev`（清缓存后启动）
- `typecheck`: `tsc --noEmit`（独立类型检查）
- 安装 devDependencies: `kill-port`, `rimraf`

### 2. vite.config.ts 优化
- `server.host = '0.0.0.0'`（局域网可访问）
- `server.port = 5173` + `strictPort = true`
- `server.watch.ignored`: 排除 `data/raw/**`, `exports/**`, `backtests/**`, `.git/**`, `public/data/**`，避免大数据文件变更触发 HMR 卡死

### 3. ErrorBoundary 组件
- 新建 `src/components/ErrorBoundary.tsx`
- Class component，`getDerivedStateFromError` + `componentDidCatch`
- 默认 fallback：暖米白背景 + 错误信息 + 刷新按钮
- 支持自定义 `fallback` prop
- 在 `main.tsx` 中包住 `<App />`

### 4. 废弃 ticketOptimizer.ts
- `FUND_ALLOCATIONS` 和 `FundAllocation` 接口已迁移到 `ticketSplitEngine.ts`
- `PredictionEngine.tsx` 改为从 `ticketSplitEngine` 导入 `FUND_ALLOCATIONS`
- `ExposurePanel.tsx` 改为使用 `generateExampleTickets()` 替代 `optimizeTicketGroup()`
- `LeakagePanel.tsx` 同上
- 全部组件不再 import `ticketOptimizer`，该文件仅保留 deprecated 标记

### 5. SplitTicketBuilder 四态 UI（已有，确认无需修改）
- loading → "正在加载比赛数据..."
- error → 错误信息 + 原始/过滤比赛数 + 重新加载按钮
- empty → 无可选赛前比赛提示 + 重新加载按钮
- success → 正常渲染

## 验收结果
- `tsc --noEmit`: 0 错误
- `npm run build`: 通过（764.74 kB JS, 38.69 kB CSS, 225ms）
- `npm run dev`: 端口 5173 固定，`--strictPort` 生效
- `npm run dev:restart`: 可用（需配合 `kill:5173`）
- `npm run typecheck`: 独立可用
- chunk >500kB 警告仍存在（未处理，需后续动态 import/codeSplitting）

## 关键文件
- `package.json` — 新脚本 + 新 devDependencies
- `vite.config.ts` — server 配置 + watch.ignored
- `src/components/ErrorBoundary.tsx` — 新建
- `src/main.tsx` — 包入 ErrorBoundary
- `src/utils/ticketSplitEngine.ts` — 新增 FundAllocation 接口 + FUND_ALLOCATIONS 常量
- `src/components/PredictionEngine.tsx` — import 路径迁移
- `src/components/ExposurePanel.tsx` — 替换 optimizeTicketGroup
- `src/components/LeakagePanel.tsx` — 替换 optimizeTicketGroup

## 遗留
- chunk >500kB 警告：需要动态 import 或 manualChunks 拆分
- `kill-port` 偶尔超时，`dev:restart` 可能在极端情况下需要手动 `kill -9`
- SA/PL 赛事数据因 429 限流未同步（与本次治理无关）
