# Shotpack Lite

一个独立、无第三方依赖的镜头清单整理工具。用中文卡片编辑镜头，将同一工程整理为镜头清单、素材需求和提示词任务草稿。

当前版本：0.1.0，初始开源版。尚未完成运行测试或用户验收。

## 功能

- 编辑工程名称、画幅、镜头 ID、时长、场景、人物、道具、景别、运镜、动作和备注。
- 校验唯一 ID、必填字段、数值、数组、已知字段和工程 schema 版本。
- 按完全相同的名称汇总场景、人物和道具，列出出现次数与关联镜头。
- 导出 project.json、shots.txt、assets.txt、prompt-tasks.txt。
- 浏览器编辑与命令行导出复用同一份清单处理代码。

提示词草稿是字段拼接结果，未调用模型。它不能代替导演、改编、连续性检查或画面质量验收；计划时长也不是实际成片时长。

## 最快使用

双击 index.html，用本机浏览器打开。首次显示的是虚构的“雨后小站”示例，可直接查看三类文字预览。

若浏览器对本地文件的脚本或文件选择器有限制，可以在已安装 Node.js 的电脑上双击“启动工具.cmd”，然后打开终端显示的本机地址。默认地址为 `http://127.0.0.1:8765/`。

也可以在项目目录执行：

```sh
node bin/serve.cjs
```

服务只监听 127.0.0.1，只返回清单中列出的公开界面文件。它没有上传接口，不提供任意目录浏览，也不保存用户工程。

如果默认端口被占用，可显式指定其他端口：

```sh
node bin/serve.cjs 8766
```

## 编辑与保存

1. 点击“新建工程”，填写场景和画面动作，按需添加镜头。
2. 人物、道具用逗号、顿号或分号分隔；名称完全相同时才归为同一项。
3. 在右侧查看校验结果。存在问题时，复制与导出按钮会停用。
4. 用“保存工程 JSON”选择文件位置；再次编辑前可从该文件导入。
5. 用“选择文件夹并导出”选择父目录，工具会建立一个名称带随机标识的新子目录，写入四个文件。

建议将工作文件保存到你指定的数据盘，例如 F:\gpt文件。浏览器出于隐私限制不会向网页提供选定目录的完整路径，因此网页不能代替你检查盘符。

文件夹选择器不可用时，可复制右侧文本后手动保存，或使用命令行导出。工具不使用自动下载到浏览器默认目录的退路。

工程只放在页面内存中，没有自动保存、浏览器数据库或 localStorage。刷新、关闭页面或停止服务前请保存重要修改。替换工程与删除镜头有确认提示；删除没有撤销按钮。

导入失败保留当前工程。新 schema 和未知字段会被拒绝，不会自动迁移或覆盖原文件。文件写入报错时可能保留部分新输出，应检查报错中给出的目录。

## 命令行导出

需要 Node.js，无需 npm install。package.json 的 private 字段只用于避免意外发布到 npm，不影响源码许可。

```sh
node bin/shotpack.cjs examples/demo.json ./exports/demo-001
```

第二个参数必须是尚不存在的输出目录。该目录已存在时，命令报错退出。输入始终只读，四个输出文件用独占创建方式写入。支持不超过 2 MiB、1–500 个镜头的工程，单镜头时长大于 0、至多 3600 秒。

Windows 可使用明确的数据盘路径：

```powershell
node bin/shotpack.cjs examples/demo.json 'F:\gpt文件\镜头导出\demo-001'
```

## 数据格式

以 examples/demo.json 为准。schemaVersion 固定为 1；shots 是镜头数组。characters 和 props 是文本数组，可以为空；camera 与 notes 可以省略。

支持画幅：16:9、9:16、21:9、4:3、3:4、1:1。ID 使用字母开头的字母、数字、下划线或短横线，区分大小写，去除两端空白后必须唯一。

## 公开范围

本仓库仅包含本工具的新编代码、说明和虚构示例，没有引用任何真实创作工程或私有制作资料。提示词导出仅使用通用字段标签。

没有云端接口、模型接入、遥测、账号系统或外部字体资源。导入工程在本机处理，任何真实数据都由使用者决定保存位置。请将真实工程、导出包和凭据保存在仓库之外。

.gitignore 只放行当前发布清单中的文件；新增源码需要有意调整清单。发布候选包应从明确的文件列表生成，而不是打包工作盘。

## 开发与贡献

src/core.js 负责格式校验和文本整理；src/app.js 负责本地界面；bin/shotpack.cjs 负责命令行导出；bin/serve.cjs 只负责本机静态预览。

这是初始实现。当前未提供或运行自动化测试，也没有跨浏览器兼容性结论或用户规模数据。缺陷反馈请使用虚构的最小示例，避免提交真实创作资料。

源码由 AI 辅助编写，并由项目维护者决定采用及发布范围。项目所有者已确认仅公开本工具的 15 个新编文件，采用 MIT 许可，见 LICENSE。

## English overview

Shotpack Lite is a small local shot-list editor and handoff formatter. It validates a versioned JSON format, groups scene/character/prop names, and produces plain-text production lists plus generic prompt drafts. It does not call an AI model or upload project data.

Open index.html, or run `node bin/serve.cjs`. For a new output directory, run `node bin/shotpack.cjs examples/demo.json ./exports/demo-001`. There are no runtime dependencies.

This is an initial, AI-assisted implementation with fictional examples, published under the MIT license with the owner's approval. Runtime tests, browser compatibility, and user adoption have not been established.
