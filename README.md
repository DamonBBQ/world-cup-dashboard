# World Cup Match Intelligence

世界杯赛事分析与合规出票辅助工具

⚠️ **仅供数据分析与娱乐参考，不构成投注建议。请遵守所在地法律法规，理性购彩，未成年人禁止参与。**

## 技术栈

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- Recharts
- Python 3 (数据同步脚本，仅用标准库)

## 快速开始

### 1. 安装依赖

```bash
cd world-cup-dashboard
npm install
```

### 2. 配置 API Key

在项目根目录创建 `.env` 文件（已自动创建）：

```bash
# .env
FOOTBALL_DATA_API_KEY=你的API Key
```

获取免费 API Key：https://www.football-data.org/client/register

> ⚠️ `.env` 已加入 `.gitignore`，不会被提交到 Git。  
> ⚠️ 前端**不会**直接调用 API，token 仅在 Python 同步脚本中使用。

### 3. 同步数据

```bash
python3 scripts/ingest/fetch_football_data.py
```

同步脚本会：
- 从 football-data.org 获取 12 个赛事的比赛数据
- 标准化后输出到 `public/data/` 目录
- 前端读取本地 JSON 文件，不暴露 API Key

同步后的文件：
```
public/data/
├── football_data_latest_matches.json    # 前端比赛数据
├── football_data_competitions.json      # 赛事列表
└── football_data_sync_status.json       # 同步状态
```

原始数据保存在：
```
data/raw/football_data_org/               # API原始响应
data/processed/                           # 标准化数据
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:5173/

### 5. 构建

```bash
npm run build
```

## 数据同步说明

### 同步范围

| 代码 | 赛事 | 免费版 |
|------|------|--------|
| WC | FIFA World Cup | ✅ |
| CL | UEFA Champions League | ✅ |
| BL1 | Bundesliga | ✅ |
| DED | Eredivisie | ✅ |
| BSA | Campeonato Brasileiro Série A | ✅ |
| PD | La Liga | ✅ |
| FL1 | Ligue 1 | ✅ |
| ELC | Championship | ✅ |
| PPL | Primeira Liga | ✅ |
| EC | European Championship | ✅ |
| SA | Serie A | ✅ |
| PL | Premier League | ✅ |

### 免费版限制

- **每天 100 次请求**
- 每秒 10 次请求
- 同步 12 个赛事约消耗 13 次请求（1次competitions + 12次matches）
- 建议每天同步 1-3 次即可

### 同步失败排查

| 错误 | 原因 | 解决 |
|------|------|------|
| 403 | API Key 无效或免费版不支持 | 检查 Key，确认免费版覆盖该赛事 |
| 429 | 请求频率限制 | 等待 60 秒后重试 |
| 网络错误 | 无法连接 API | 检查网络连接 |
| API Key 缺失 | .env 未配置 | 在 .env 中设置 FOOTBALL_DATA_API_KEY |

### 更新前端数据

当同步脚本运行后，前端刷新页面即可读取最新数据。  
前端不会直接调用 API，所有数据来自 `public/data/` 目录的静态 JSON 文件。

## 数据标准化格式

所有比赛数据统一为以下格式：

```json
{
  "competition": "WC",
  "competitionName": "FIFA World Cup",
  "season": "2026",
  "utcDate": "2026-06-11T19:00:00Z",
  "homeTeam": "Mexico",
  "awayTeam": "South Africa",
  "status": "FINISHED",
  "score": "2-0",
  "matchday": 1,
  "stage": "GROUP_STAGE",
  "group": "A",
  "source": "football-data.org"
}
```

## 模块列表

1. **Hero** - 顶部数据概览
2. **数据同步状态** - API同步状态与日志
3. **今日赛果与进行中比赛** - 实时比赛追踪
4. **预测与策略洞察** - 概率分析与推荐
5. **球员池与阵容实力** - 球队评分与球员影响力
6. **推荐出票版块** - 模拟票组生成（智能/拆票/历史）
7. **预测引擎** - 多维度预测分析
8. **相关性控制** - 票组风险分散
9. **漏洞检测** - 策略弱点诊断
10. **组合评分** - 票组质量评估
11. **策略自我进化** - 回测与策略注册
12. **资金台账** - 资金记录与票组管理
13. **历史回测** - 预测准确度追踪
14. **错误分析与校准** - 赛后复盘
15. **六步分析框架** - 分析方法论

## 合规声明

本工具仅用于赛事数据整理、模拟分析和个人记录，不提供任何真实交易、支付、下注或购彩平台入口。所有模拟结果均不构成投注建议。请遵守所在地法律法规，理性参与，未成年人禁止使用相关功能。
