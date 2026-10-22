# 烟雨测速部署记录

- 正式地址：https://yanyubaby.eu.org/
- 备用地址：https://yanyu-speed.3878881.workers.dev/
- 平台：Cloudflare Workers（未开通付费套餐），服务名 `yanyu-speed`。
- 根域名旧 A 记录 `23.249.19.243` 按用户要求删除，改为 Worker 自定义域。
- 测试接口：`/api/ping`、`/api/download`（每请求 32 MiB）、`/api/upload`（每请求上限 32 MiB，流式丢弃）、`/api/geo`。
- 测速针对访问者到 Cloudflare 的链路；代理开启时测量含代理的链路，不是德国 VPS 带宽。
- 上游：SukkaW/speed.skk.moe。保留 Apache-2.0、原作声明及必要依赖/字体许可。烟雨为定制运营方，不声称上游原作版权。
- 所有页面静态产物内嵌在 Worker 模块，部署包 gzip 约 746 KiB。当前无外部测速服务依赖。
- 源码及构建辅助文件见 source.tar.gz；静态产物见 static.tar.gz；直接部署模块为 deploy-worker.mjs。
- 重新发布可在控制台同名 Worker 上传模块；注意完整保留许可证文件。
- 构建：npm install；设置 SPEEDTEST_TARGETS 后运行 Next build。此 iSH 环境注入 Node 标志需 `node --require ./build-compat.cjs node_modules/next/dist/bin/next build --webpack`。
- 免费 Workers 请求与 CPU 配额可能限制高频、大规模测速。不是无限流量/无限性能服务，未承诺测出线路理论上限。
- 独立验证：德国 VPS 对正式域名首页 HTTP 200、ping 204、POST 上传正常；备用域下载完整 32 MiB 通过。本机正式域曾出现 TLS EOF，需区分本地 DNS/代理缓存与网站故障。
