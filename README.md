# 烟雨测速

<!-- Modified by 烟雨: customized branding, self-hosted APIs and reproducible deployment documentation. -->

由烟雨定制与运营，基于 SukkaW/speed.skk.moe 的 Apache-2.0 开源派生版本；不声称拥有上游原作版权。

- 正式网站：<https://yanyubaby.eu.org/>
- 备用网站：<https://yanyu-speed.3878881.workers.dev/>
- 托管：Cloudflare Workers；不在 VPS 上运行。
- 功能：下载、上传、延迟、抖动、IP/运营商信息、结果截图。
- 测速针对当前设备到 Cloudflare 的链路；如果开启代理，结果包含代理链路。

## 从这里继续修改

完整步骤见 [部署与开发指南](docs/DEPLOYMENT.md)，当前项目交接见 [继续开发](docs/HANDOFF.md)。

需要 Node.js 22、npm、Python 3。构建字体时需要能访问 Google Fonts。

```bash
npm ci
cp .env.example .env
npm run dev
```

开发模式的地理信息是演示数据；`next dev` 本身不提供测速 API。完整接口需部署 Worker 后测试。

生产构建：

```bash
npm run build
npm run package:worker
```

- `out/`：静态网站，可用任意静态托管服务（API 仍需后端）。
- `worker.js`：自有 API 的可维护源码。
- `deploy-worker.mjs`：静态网站和 API 合并后的完整部署模块；仓库内含已上线版本，可直接发布。
- `artifacts/static.tar.gz`：当前已部署的静态产物快照。

可选使用 Wrangler 手动部署；只在本人电脑授权，不要把 API Token 写入源码：

```bash
npx wrangler login
npx wrangler deploy
```

仓库没有配置自动发布，推送代码不会自动修改线上网站。Cloudflare 免费配额并非无限服务，公开测速需关注请求量和流量。

## 接口

| 路径 | 用途 |
| --- | --- |
| `/api/ping` | GET/HEAD 返回 204 |
| `/api/download` | 流式返回 32 MiB 测试数据，不缓存 |
| `/api/upload` | 流式接收并丢弃 POST 数据，单请求最大 32 MiB |
| `/api/geo` | 使用 Cloudflare 请求元数据返回连接信息 |

## 许可

原作、必要依赖及字体授权保留在 [LICENSE](LICENSE)、[THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES)、`public/` 的相关许可文件及 `/licenses.html`。烟雨新增的 Worker、品牌定制与部署工具按各文件及项目许可使用。

**speed.skk.moe** © [Sukka](https://github.com/SukkaW), Released under the [Apache License 2.0](LICENSE) License.
Authored and maintained by Sukka with help from contributors ([list](https://github.com/SukkaW/speed.skk.moe/graphs/contributors)).
