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

## 测试

先安装依赖，再跑测试——顺序不能颠倒：

```sh
npm ci
npm test
```

- `npm test` 等于 `node --test tests/*.test.mjs`，不需要构建、不联网、不需要 wrangler 或 workerd；Node 需满足 `engines: ">=22.22.0 <25"`。
- **tests 依赖 `typescript` devDependency**：`tests/engine.test.mjs` 与 `tests/frontend.test.mjs` 都直接 `import ts from 'typescript'`，在内存中转译 `src/**` 的 TS/TSX 后再执行断言。`typescript`（`^6.0.3`）只存在于 `devDependencies`，`npm ci` / `npm install` 之后才有。
- 没装 devDependencies 时的现象：`tests/worker.test.mjs` 仍然通过，但另外两个文件报 `ERR_MODULE_NOT_FOUND: Cannot find package 'typescript'`（实测 8 个用例中 6 通过、2 个文件级失败）。这种“部分绿”不是通过，不能用来判断回归，也不能据此认为代码有问题。
- `npm ci` 会按锁文件安装并校验 `package-lock.json`；不要用 `npm install` 代替，也不要跳过 devDependencies（`--omit=dev`）后跑测试。
- CI（`.github/workflows/check.yml`）的顺序是 `npm ci` → `npm test` → `npm run deploy:check` → `npm run typecheck` → `npm run lint` → `npm audit --omit=dev`。

## 后期修改注意事项

- 修改 `src/`、`worker.js` 和配置源码，不直接修改生成的 `out/`。
- 标识与页面控件位于 `src/app/components/speedtest.tsx`；默认单线程位于 `src/context/speedtest.ts`；测速逻辑位于 `src/lib/engine.ts`。
- 本地完整联调使用 `npm run dev:worker`；`npm run dev` 仅预览前端，地理信息是演示数据，测速 API 不可用。
- 修改 `SPEEDTEST_TARGETS` 后需重新构建发布。保持单线程禁用并发和预取，测速 API 禁止缓存。
- 发布前完成以下检查；发布后确认首页、默认 Single 和测速功能正常。
- GitHub 推送只触发检查，不自动发布网站；正式更新仍需运行 `npm run deploy`。额外域名与预览地址保持关闭。
- 本次全面审查记录见 `documentation/AUDIT-2026-11-16.md`；涉及测速生命周期、异常流、Worker 上传限制、截图隐私和浏览器验收。

```sh
npm test
npm run deploy:check
npm run typecheck
npm run lint
npm audit --omit=dev
npm run deploy
node scripts/verify-live.mjs
```
