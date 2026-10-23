# Yanyu.Speed

## 搭建注意事项

- 使用 Node.js 22、npm 10+，通过 `npm ci` 安装依赖。
- 构建时需能访问 npm 和 Google Fonts；默认测速端点已内置，无需创建 `.env`。
- 发布前在 `wrangler.jsonc` 配置自己的正式域名，并登录该域名所属的 Cloudflare 账号。
- 使用 `npm run deploy` 发布，会自动构建并上传 Worker 与静态资源；不要仅在控制台粘贴 `worker.js`。
- Windows PowerShell 若限制脚本执行，使用 `npm.cmd`、`npx.cmd`。
- 不要提交 Token、Cookie、`.env` 或登录文件；无需 VPS、数据库或 Python。

```sh
npm ci
npx wrangler login
npm run deploy
```

## 后期修改注意事项

- 修改 `src/`、`worker.js` 和配置源码，不直接修改生成的 `out/`。
- 标识与页面控件位于 `src/app/components/speedtest.tsx`；默认单线程位于 `src/context/speedtest.ts`；测速逻辑位于 `src/lib/engine.ts`。
- 本地完整联调使用 `npm run dev:worker`；`npm run dev` 仅预览前端，地理信息是演示数据，测速 API 不可用。
- 修改 `SPEEDTEST_TARGETS` 后需重新构建发布。保持单线程禁用并发和预取，测速 API 禁止缓存。
- 发布前完成以下检查；发布后确认首页、默认 Single 和测速功能正常。
- GitHub 推送只触发检查，不自动发布网站；正式更新仍需运行 `npm run deploy`。额外域名与预览地址保持关闭。

```sh
npm test
npm run deploy:check
npm run typecheck
npm run lint
npm audit --omit=dev
npm run deploy
node scripts/verify-live.mjs
```
