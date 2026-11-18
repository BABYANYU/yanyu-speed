# 初始部署历史

项目最初于 2026 年 10 月以单个内嵌静态资源的 Cloudflare Worker 发布，绑定正式域名 example.org，未部署到 VPS。

2026 年 10 月 23 日开始迁移为 Worker API + Cloudflare Static Assets，移除内嵌产物和 Python 打包工具，关闭额外访问域名配置。当前操作以 DEPLOYMENT.md 为准。

初始版本来自 SukkaW/speed.skk.moe，保留 Apache-2.0、原作署名及依赖/字体许可。测速仅描述访问者到 Cloudflare 的链路。
