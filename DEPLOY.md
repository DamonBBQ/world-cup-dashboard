# Vercel 部署说明

## 1. 本地检查

```bash
npm install
npm run typecheck
npm run build
```

如果报错，请逐个修复，直到 build 成功。

## 2. 推送 GitHub

```bash
git init
git add .
git commit -m "prepare vercel deploy"
```

然后创建 GitHub 仓库，并推送：

```bash
git remote add origin <你的 GitHub 仓库地址>
git branch -M main
git push -u origin main
```

## 3. Vercel 部署

进入 [Vercel](https://vercel.com/)：

1. 点击 **New Project**
2. **Import Git Repository** → 选择刚推送的 GitHub 仓库
3. 配置项目：
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. 点击 **Deploy**

部署完成后，Vercel 会生成一个公网地址，例如：

```
https://xxx.vercel.app
```

以后手机、家里电脑都可以访问这个地址。

## 4. 注意事项

- ✅ 不要上传 `.env` / `.env.local`（已在 `.gitignore` 中）
- ✅ 不要把 API token 写在前端代码里
- ⚠️ **localStorage 不会跨设备同步**（每台设备独立存储）
- ⚠️ 如果页面数据为空，先检查 `public/data/` 文件是否成功部署
- ⚠️ 部署后 `public/data/` 下的 JSON 文件是静态的，不会自动更新（需重新部署或接入动态 API）

## 5. 后续改进方向

- 接入 Vercel Serverless Function 作为 API 代理（避免前端暴露 API token）
- 接入数据库（Supabase / Firebase）实现跨设备数据同步
- 设置 GitHub Actions 自动同步数据并触发重新部署
