# 项目审查与修改（2026-10-23）

范围：仓库全部前端源码、测速引擎、API Worker、构建工具、直接与锁定依赖、许可文件，以及 Cloudflare 发布配置。基线提交：107d8e280327622d2cbc30d32c19d45f4ebd9dea。

## 已修复

| 问题 | 修改及影响 |
| --- | --- |
| Single 实际仍启动 3 路下载并预取 | 默认改为 Single；只用一个下载请求且禁用预取。上传维持一路。回归测试检查真实同时在途请求数。 |
| 下载错误页可能被当成测速数据，ping 未检查状态 | 先验证 HTTP 状态；错误响应不计速。ping 单次最多 5 秒。 |
| 端点完全不可用仍显示结束 | 没有有效传输时判为失败并提示重试，保留已测结果。用户手动停止不弹失败提示。 |
| 地理查询可能长时间阻塞开始按钮 | 查询 8 秒超时，最多重试两次；单目标不等待地理查询。 |
| 上传中断缺少清理 | 捕获读取失败，返回 400，始终释放 reader；保持 32 MiB 限额。 |
| 下载为每块复制内存 | 复用不可变随机数据视图；流式响应保留背压和取消能力；明确不压缩。 |
| 缺少准确的方法错误响应 | 已知 API 不支持的方法返回 405 和 Allow；不存在 API 返回 404。 |
| 截图在没有 clipboard 的浏览器可能抛同步异常 | 无图片剪贴板时改为保存；稍后释放下载 URL，提高 Safari 兼容性。 |
| 浏览器禁用存储时外观切换会报错 | 捕获存储异常；当前页面仍应用选定外观。 |
| 静态资源内嵌在约 2.1 MB JS 模块中 | 改为 Cloudflare Static Assets；API Worker 预检 3.56 KiB（gzip 1.20 KiB），静态文件单独部署。 |
| 旧部署依赖 Python、混合 npm/pnpm 锁文件、生成产物可能过期 | 使用 Node/npm/Wrangler；自动构建后发布，移除旧内嵌包、Python 工具和 pnpm 文件。 |
| 原锁文件缺失 Windows 原生组件 | 从干净目录重建锁文件，保留各平台可选包；Windows 安装、构建、lint 均可运行。 |
| 无持续验证 | 新增 GitHub Actions：测试、构建/部署预检、类型检查、lint、生产依赖审计。工作流不发布网站。 |
| 品牌、页脚、额外域名 | 改为 Yanyu.Speed；删除主页运营页脚及许可入口；关闭 workers.dev 和版本预览。许可文件与独立许可页面保留。 |

## 环境与组件

线上运行环境是 Cloudflare Workers/V8 + Static Assets，不运行 Next.js 服务。无 VPS、数据库、KV、R2 或外部测速 API；现有 Worker 没有设置 secrets。自定义域名为 example.org。构建字体需要 Google Fonts，字体文件部署后同源加载。

本次构建使用 Node.js 22.23.4、npm 10.9.9；Wrangler 4.152.0；Cloudflare compatibility_date 保持 2026-10-01。

| 生产/构建依赖 | 锁定版本 |
| --- | --- |
| next | 16.4.2 |
| react / react-dom | 19.3.1 |
| @base-ui/react | 1.9.0 |
| @stylexjs/stylex | 0.19.1 |
| foxact / foxts | 0.3.12 / 5.9.1 |
| lucide-react | 1.61.0 |
| modern-screenshot | 4.7.0 |
| minireset.css / server-only | 0.0.7 / 0.0.1 |
| sonner / swr | 2.0.8 / 2.5.1 |
| xbits / zod | 0.2.0 / 4.6.7 |

| 开发依赖 | 锁定版本 |
| --- | --- |
| @eslint-sukka/react / eslint-config-sukka / eslint-formatter-sukka | 9.2.1 |
| @stylexjs/babel-plugin | 0.19.1 |
| @types/node | 20.19.43 |
| @types/react / @types/react-dom | 19.3.0 |
| babel-plugin-react-compiler | 1.0.0 |
| eslint | 10.13.0 |
| schema-dts | 2.1.0 |
| stylex-webpack | 0.5.0 |
| typescript | 6.0.3 |
| wrangler | 4.152.0 |

生产依赖审计为 0 项。完整依赖审计仍有 6 个 high 受影响条目，来自同一个 braces <=3.0.3 递归拒绝服务问题及其 ESLint 上游依赖链。npm 当时最新 braces 为 3.0.3，[GitHub 公告](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 标明无修复版本。未执行 audit fix --force 推荐的跨大版本降级。此依赖位于开发 lint 工具链，不作为本站线上 Worker 的运行依赖；这不等于项目没有其他未知漏洞。

## 验证与限制

- npm ci、生产静态构建、wrangler deploy --dry-run 已通过。
- 7 项行为回归测试覆盖单/多线程并发、HTTP 错误不能计速、精确 32 MiB 下载、取消下载、上传上限/中断、方法限制、元数据和静态资源绑定。
- 类型检查和 lint 通过；生产依赖审计 0 项。
- scripts/verify-live.mjs 用于发布后确认首页品牌、默认 Single、页脚移除、测速 API、静态资源缓存及许可文件。可运行 node scripts/verify-live.mjs。
- 当前会话内置浏览器不可用，未做交互式视觉验收；未使用外部浏览器替代。
- 此轮不调整算法的平滑/稳态规则，不承诺与其他测速网站或线路标称速率一致。单次测试流量仍可能较大。

迁移依据：[Cloudflare Static Assets 配置](https://developers.cloudflare.com/workers/static-assets/binding/)、[Wrangler 配置](https://developers.cloudflare.com/workers/wrangler/configuration/)。
