# 继续开发

- 项目：BABYANYU/yanyu-speed，Cloudflare Worker yanyu-speed。
- 正式域名：speed.fakeyou.eu.org；配置禁用 workers.dev 与预览地址。
- 左上角和网站元数据使用 Yanyu.Speed；首页无运营页脚。
- 默认 Single；单线程下载禁用并发和预取，上传为一个请求。
- Multi 保留三路下载槽位及预取、三路上传。
- HTTP 错误页不计入下载，延迟请求检查状态且 5 秒超时；无有效数据时提示失败。
- 地理信息查询 8 秒超时，失败最多重试两次；单目标测速不再被地理查询阻塞。
- worker.js 提供测速 API，wrangler.jsonc 绑定 out/ 静态资源；禁止直接修改生成产物代替源码。
- 构建前自动收集依赖许可；原作、字体许可和 THIRD_PARTY_NOTICES 保留。
- npm test 验证实际请求并发、错误状态、上传上限及流式响应。
- GitHub Actions 执行构建、部署预检、测试、类型检查、lint 和生产依赖审计，不自动发布。

修改后运行 README 的全部验证命令。发布使用 npm run deploy，Wrangler 会自动构建。不要恢复 Python 打包、pnpm 锁文件或静态资源内嵌模块；不要提交账号秘密。
