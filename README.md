# Yanyu.Speed

基于 [speed.skk.moe](https://github.com/SukkaW/speed.skk.moe) 的浏览器测速应用，使用 Next.js、React 与 Cloudflare Workers。测量当前设备到所选测速端点的下载、上传速度、延迟与抖动，默认使用本站 Cloudflare API 和单连接模式。

## 安装与测试

使用 Node.js `>=22.22.0 <25`、npm `>=10`（项目指定 npm `10.9.9`）。

```sh
git clone https://github.com/BABYANYU/yanyu-speed.git
cd yanyu-speed
npm ci
npm test
```

测试依赖开发依赖中的 TypeScript，请完整执行 `npm ci`，保留 devDependencies。Windows PowerShell 若限制脚本执行，可使用 `npm.cmd`、`npx.cmd`。

## 本地开发

```sh
npm run dev
```

这是 Next.js 前端开发服务，地理信息使用演示数据，未提供本地测速 API。需要联调 Worker 与静态页面时运行：

```sh
npm run dev:worker
```

Wrangler 会按配置先构建，再启动本地 Worker；访问终端输出的地址。构建使用 Google Fonts，需能访问相应字体服务；安装依赖需访问 npm。

常用开发命令：

| 命令 | 用途 |
|---|---|
| `npm test` | 运行 Node.js 测试 |
| `npm run build` | 收集第三方许可并导出静态页面到 `out/` |
| `npm run deploy:check` | 构建并检查部署打包，使用 Wrangler dry-run |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 检查 |

修改源码和配置后重新构建；`out/` 是生成目录。

## 环境变量

默认端点已内置，无需创建环境变量文件。自定义测速区域或端点时，参考 [.env.example](.env.example)，复制为 `.env.local` 并编辑 `SPEEDTEST_TARGETS` JSON。该变量在构建时读取，修改后需重新构建和部署。

每个区域提供下载 URL 列表，可选 `ping`、国家代码和上传 URL 列表；`upload: null` 跳过上传阶段。外部端点需支持浏览器跨域请求，具体字段说明见模板。默认内置 API 会解析到当前站点域名。

## Cloudflare 部署与自定义域

1. 将域名所在区域接入 Cloudflare，并登录对应账号。
2. 在 [wrangler.jsonc](wrangler.jsonc) 中将 `routes` 的 `pattern` 替换为自己的域名，保留 `custom_domain: true`；在同一账号部署多个实例时同时调整 Worker `name`。
3. 执行检查和部署：

```sh
npx wrangler login
npm run deploy:check
npm run deploy
```

Wrangler 的构建钩子会执行 `npm run build`，一起发布 Worker 与静态资源。Cloudflare Custom Domain 负责关联域名、DNS 和证书；可在 Worker 的域名设置中确认绑定状态。当前配置关闭 `workers.dev` 和预览 URL，使用配置的自定义域访问。GitHub 工作流负责检查，网站更新通过上述部署命令完成。

部署后可检查首页与 API：

```sh
node scripts/verify-live.mjs https://speed.example.com/
```

将示例 URL 替换为自己的部署地址；此检查会发起实际测速 API 请求。

## Worker Static Assets

Next.js 通过静态导出生成页面，Cloudflare Static Assets 托管 `out/`，无需运行 Next.js 服务端。`/api/*` 优先进入 [worker.js](worker.js)，提供地理信息、延迟探测、流式下载和接收上传数据的接口，其响应设置为 `no-store`；静态文件由 `ASSETS` 提供，`/_next/static/*` 配置长期 immutable 缓存。

## 许可

项目采用 [Apache License 2.0](LICENSE)。上游归属与修改说明见 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES)。发布后的许可页面为 `/licenses.html`；第三方依赖许可由构建脚本收集，字体许可随静态资源提供。
