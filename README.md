# Yanyu.Speed

基于 [SukkaW/speed.skk.moe](https://github.com/SukkaW/speed.skk.moe) 定制的 Cloudflare 测速站。

- 网站：<https://yanyubaby.eu.org/>
- 托管：Cloudflare Workers + Static Assets，仅使用正式域名。
- 默认 Single：下载和上传各一个请求；Multi 可手动切换。
- 测量当前设备到 Cloudflare 的下载、上传、延迟与抖动；代理开启时包含代理链路。
- 截图默认隐藏 IP 和运营商；首页不显示运营页脚。

## 开发和发布

使用 Node.js 22（见 .nvmrc）与 npm 10+。安装、类型检查和构建都支持 Windows；不再依赖 Python。

```sh
npm ci
npm run dev:worker
```

该命令构建前端并启动本地 Worker，测速 API 和前端在同一端口。默认目标已内置，不需要 .env；需要自定义目标时可参考 .env.example。本地 Worker 无真实 Cloudflare 连接信息。只改前端时可用 npm run dev，其地理信息为演示数据，测速 API 不可用。

```sh
npm test
npm run deploy:check
npm run typecheck
npm run lint
npm audit --omit=dev
```

正式发布（在拥有域名的 Cloudflare 账号登录）：

```sh
npx wrangler login
npm run deploy
```

Wrangler 会自动构建；静态资源来自 out/，API 来自 worker.js。workers.dev 与预览地址在配置中均关闭。GitHub Actions 只验证，不自动部署，也不需要 Cloudflare Token。

详见 [部署指南](documentation/DEPLOYMENT.md)、[交接说明](documentation/HANDOFF.md)、[审查记录](documentation/REVIEW.md)。

## 许可

首页的许可链接已移除，原作、依赖及字体许可文件仍保留，并可直接访问 /licenses.html。构建会收集当前安装的生产依赖许可。

**speed.skk.moe** © [Sukka](https://github.com/SukkaW), Released under the [Apache License 2.0](LICENSE) License.
Authored and maintained by Sukka with help from contributors ([list](https://github.com/SukkaW/speed.skk.moe/graphs/contributors)).
