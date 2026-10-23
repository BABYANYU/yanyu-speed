# Cloudflare 部署与开发

## 环境

- Node.js 22，npm 10+；仅使用 package-lock.json 与 npm ci。
- Next.js 静态导出 + React + StyleX；不需要 Node 服务、VPS、数据库、Python。
- Worker yanyu-speed；唯一正式域名 yanyubaby.eu.org。
- worker.js 提供 API；out/ 通过 Cloudflare Static Assets 提供。
- 构建时需要访问 npm 和 Google Fonts；字体随构建产物部署，浏览器不从 Google Fonts 加载字体。
- 未使用第三方测速 API；/api/geo 来自 Cloudflare 请求元数据。

## 命令

```sh
npm ci
npm run dev:worker
npm test
npm run deploy:check
npm run typecheck
npm run lint
npm audit --omit=dev
npx wrangler login
npm run deploy
```

Windows 的 PowerShell 若限制 npm.ps1，可使用 npm.cmd 与 npx.cmd。所有脚本不再依赖 Python。dev:worker 和 deploy 都由 Wrangler 的 build.command 自动构建前端。deploy:check 完成构建和部署包检查，不向线上发布。

## 配置

默认 API 为同源 /api/ping、/api/download、/api/upload 和 /api/geo。目标在构建时配置；修改 SPEEDTEST_TARGETS 后必须重新构建。默认目标已内置，无需创建 .env。

wrangler.jsonc 关闭 workers_dev 和 preview_urls，只保留正式域名。只有 /api/* 优先进入 Worker，其他文件由 Static Assets 处理；不存在的 API 返回 404，不回退首页。_next/static/ 的哈希资源可长期缓存，测速 API 始终 no-store。

旧的静态文件内嵌打包方式已移除，不再使用 deploy-worker.mjs、package-worker.py 或 static.tar.gz。不要只在控制台粘贴 worker.js；它需要 Wrangler 同时上传 out/ 并绑定 ASSETS。

## 上线验收

- 首页出现 Yanyu.Speed，默认 Single，无运营页脚。
- /api/ping 的 GET/HEAD 为 204，其他方法为 405。
- /api/download 为 32 MiB，HEAD 没有响应体；测速数据不压缩、不缓存。
- POST /api/upload --data-binary test 返回 {"received":4}；超过 32 MiB 返回 413。
- /api/geo 返回当前请求的 IP、地区、运营商；不缓存个人连接信息。
- 点击测速，下载、上传、延迟、抖动和截图功能正常。
- 确认 Cloudflare 域名设置不再启用 workers.dev 或版本预览地址。

网站测试针对访问者到 CF 边缘的链路，不是某台服务器的标称带宽。免费计划仍有请求和 CPU 限制；单次完整测速可能使用数百 MiB 或更多流量。

## 账号与回滚

仓库不存储 Cookie、API Token、登录文件或 .env。GitHub 的校验工作流不执行正式发布。首次发布须使用域名所属 Cloudflare 账号授权。可在 Cloudflare Deployments 回滚到上一个版本；不要调整其他 Worker 或无关 DNS。
