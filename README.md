# 从零训练大模型 · 自学阶梯

复刻清华 KEG《高级机器学习》（2026 秋）作业设计的自学站点。课程课件未公开，本站基于公开转述与开源社区资源重建整条学习路径：**每一格作业 = 数学推导 + 可运行代码 + OJ 式编程作业 + 进阶思考题**。

## 学习路径

| 章节 | 内容 | 交互演示 |
|---|---|---|
| HW1 | Tokenizer 与 Transformer：从字符到 0.1B | BPE 分词器、注意力热力图 |
| HW2 | 手写 Triton Attention Kernel | — |
| HW3 | 数据管线与 Scaling Law | Scaling Law 拟合器 |
| HW4 | SFT / DPO / RLVR 三条后训练路线 | — |
| 期末 | 长程 Agent：可验证环境 + Harness + Self-judge | — |

预期投入：HW1–HW4 共 56–72 学时，期末另需 40h+；八周计划表见站内。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器（默认 5173）
npm run build      # 生产构建 → dist/
npm run preview    # 预览生产构建
```

无后端、无账户：学习进度（Checklist 勾选）、主题偏好、续读位置仅保存在浏览器 localStorage，本站不收集、不上传任何数据。

## 技术栈

- **框架**：React 18 + Vite 5（单页，无路由）
- **公式**：KaTeX（按需字体子集 `src/lib/katex-subset.css`，仅捆绑 Main/Math/Size/AMS 共 11 个 woff2，约 158KB）
- **代码高亮**：highlight.js（core 按语言注册）
- **字体**：Fraunces / Space Grotesk / JetBrains Mono，经 `fonts.loli.net` 境内镜像加载，系统字体栈回退
- **测试**：Playwright（`tests/playwright/`，含 seed/auth 脚手架）

## 目录结构

```
src/
├── App.jsx           # 顶栏、侧栏目录、⌘K 跳转面板、主题
├── content/          # 章节内容（part1: Overview+HW1+HW2, part2: HW3+HW4+期末+计划）
├── demos/            # 交互演示（BPE / Attention / ScalingLaw）
├── components/       # Checklist 进度、Palette
├── lib/              # UI 原语（公式/代码块/Callout/作业卡/思考题）+ katex 子集
└── styles.css        # 全站样式（纸面×编辑部设计语言，深浅双主题）
```

## 设计约定

- 章首巨型描边章节数字、恒定墨盒代码区、方格纸纹理与噪点覆膜
- 每章「一句话」人话卡降低入门门槛；进阶思考题与推导完整保留
- 深色主题下格纸纹理、进度条辉光、阶梯连线均有独立调校

## 许可与来源

作业框架来自清华 KEG《高级机器学习》的公开转述；参考的开源实现（nanoGPT、minimind、minbpe、flash-attention、trl、verl 等）版权归原作者所有。本站代码与编排内容仅用于学习交流。
