# 继续开发交接

## 当前状态

烟雨测速已经发布到 Cloudflare Worker `yanyu-speed`，绑定 `yanyubaby.eu.org`，备用域为 `yanyu-speed.3878881.workers.dev`。用户批准替换旧根域记录。不在 VPS 部署，未开付费。

使用 SukkaW/speed.skk.moe 原作定制，而不是独立原创整个引擎。原作版权、Apache-2.0、依赖及字体许可都已保留；可选推广已移除。

## 从哪里修改

| 内容 | 文件 |
| --- | --- |
| 测速页面与控件 | `src/app/components/speedtest.tsx` |
| 页脚 | `src/app/page.tsx` |
| 标题、元数据、字体与图标 | `src/app/layout.tsx` |
| 网络测速、计时和并发 | `src/lib/engine.ts` |
| 平滑和稳定性判断 | `src/lib/stability.ts` |
| 目标配置和校验 | `.env.example`、`src/lib/targets.ts` |
| IP 信息请求 | `src/hooks/use-geo.ts` |
| 自有测速后端 | `worker.js` |
| 静态资源打包进模块 | `package-worker.py` |
| Worker 发布设置 | `wrangler.jsonc` |

## 改完之后

1. `npm ci`，复制 `.env.example` 为 `.env`。
2. `npm run build`。
3. `npm run package:worker`。
4. 核对许可、页面、延迟/下载/上传接口。
5. 本人授权后 `npx wrangler deploy`。
6. 提交源码及新的 `deploy-worker.mjs`，保持生成产物和源码对应。

## 已做的逻辑定制

- `engine.ts` 将本站 `yanyubaby.eu.org/api/` 目标解析到当前 origin，正式域及备用域均可测速。
- 每个传输阶段增加约 15 秒真实时间上限，避免后台计时节流造成长时间传输；后台依然可能影响测试准确性。
- `/api/geo` 直接使用 CF 请求元数据，不调用原作未公开接口。
- 上传数据流式读取后丢弃，不保存。

## 边界

- 当前 GitHub 仓库为私有；未设置 GitHub Actions 自动发布。
- 文档/打包脚本在上传 GitHub 时整理过，没有因此重新发布线上网站。
- 不修改生成模块来代替修改源码，否则下次打包会覆盖。
- 新增依赖需重新收集授权文件；不得丢失 public 中许可文件。
- 不提交 Cookie、API Token、密钥或 `.env`。
- 生产依赖审计当时为零报告，不代表未来永久无漏洞；dev 依赖仍需维护。
