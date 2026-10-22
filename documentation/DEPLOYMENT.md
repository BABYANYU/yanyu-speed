# 部署与开发指南

## 已上线配置

- 正式域名：`yanyubaby.eu.org`
- 备用域名：`yanyu-speed.3878881.workers.dev`
- Cloudflare Worker：`yanyu-speed`，production 环境。
- 用户批准移除旧根域 A=`23.249.19.243`，现由 Worker 自定义域管理 DNS。
- 未开通付费套餐，未在德国 VPS 部署。

## 构建

建议 Node.js 22、npm 10、Python 3，构建时需访问 npm 和 Google Fonts。

```bash
git clone https://github.com/BABYANYU/yanyu-speed.git
cd yanyu-speed
npm ci
cp .env.example .env
npm run build
npm run package:worker
```

- 本版以 `package-lock.json`、`npm ci` 为准；pnpm 文件仅保留上游参考，不混用。
- `SPEEDTEST_TARGETS` 构建时读取；改端点后必须重新 build。
- `out/` 为静态网站；`worker.js` 是自有 API；`package-worker.py` 把二者合并为 `deploy-worker.mjs`。
- 根目录已提交当前线上完整模块，可直接恢复部署；不要仅上传 `worker.js`，那不是完整网站。
- `artifacts/static.tar.gz` 是当前静态文件快照。
- `npm run dev` 可本地查看前端，geo 是样例数据，开发服务器本身不提供 Worker 测速 API。

## 发布

```bash
npx wrangler login
npx wrangler deploy
```

`wrangler.jsonc` 指向完整模块、服务名与正式自定义域。需在域名所属 Cloudflare 账号授权；首次绑定域名需要相应域名/DNS 权限。不把 Token、Cookie 或本地登录文件提交 GitHub。

也可在 Cloudflare 控制台给同名 Worker 上传完整 `deploy-worker.mjs`。仓库没有自动部署工作流，推送提交不会自动改线上网站。

## 验证

```bash
curl -I https://yanyubaby.eu.org/
curl -I https://yanyubaby.eu.org/api/ping
curl -X POST --data-binary test https://yanyubaby.eu.org/api/upload
```

预期：首页 200、ping 204、上传返回 `{"received":4}`。网页点击 Start test，完成后显示 Test again。

下载接口每个请求 32 MiB；上传单请求上限 32 MiB，流式丢弃。每次完整测试可能产生数百 MiB 或更多流量，免费 Workers 额度不是无限。

## 本机特别说明

Minis/iSH 中安装依赖与构建放在 `/root/`；`/var/minis/` 共享文件系统不支持 npm 符号链接。`build-compat.cjs` 清空本机注入的 Node execArgv，避免 Next 子进程 NODE_OPTIONS 参数报错。

最终浏览器测试已完成：当次出口约下载 485 Mbps、上传 12 Mbps，仅供验收，不代表所有用户速度。测速针对设备到 CF 边缘链路；开代理时包含代理链路，不是德国 VPS 带宽。

本机正式域曾出现 TLS EOF；公共 DNS 和 CF 证书正常，德国 VPS 正式域首页与 API 均通过。应先区分本地代理、DNS 缓存和线路问题，可用备用域验证。

## 许可与删除

原作 Apache-2.0、原作声明、字体 OFL 和依赖版权文件均须保留。页面仅集中提供许可入口。

如需停止服务，在 Cloudflare 解除本项目自定义域并删除 `yanyu-speed` Worker；不要删除无关子域、邮件记录、其他 Worker。删除线上服务不删除 GitHub 仓库。
