# 从零构建 AI · 全栈自学

按 20 个 phase 组织的 LLM 全栈自学站点：从数学基础到 Agent 工程，每一站都有可验收的终点——**数学推导 + 可运行代码 + OJ 式编程作业 + 进阶思考题**。当前已上线 P10 与 P14，其余 phase 在课程地图中可见。

## 学习路径

phase 编号沿用上游 [AI Engineering from Scratch](https://github.com/rohitg00/ai-engineering-from-scratch) 的目录划分。

| phase | 内容 | 状态 |
|---|---|---|
| P00 环境与工具 | 开发环境、Git、GPU、Docker 与调试工具 | 未上线 |
| P01 数学基础 | 线性代数、微积分、概率与优化 | 未上线 |
| P02 机器学习基础 | 回归、树模型、SVM、评估方法与 ML 系统设计 | 未上线 |
| P03 深度学习核心 | 感知机、反向传播、优化器与一个小型框架 | 未上线 |
| P04 计算机视觉 | 卷积、检测、分割、扩散与视频理解 | 未上线 |
| P05 NLP 基础 | 文本处理、词向量、序列模型、注意力与分词 | 未上线 |
| P06 语音与音频 | 音频特征、ASR、TTS、语音克隆与流式语音 | 未上线 |
| P07 Transformer | 自注意力、多头、位置编码、完整 Transformer 与缩放律 | 未上线 |
| P08 生成式 AI | VAE、GAN、扩散模型、ControlNet 与视频生成 | 未上线 |
| P09 强化学习 | MDP、Q-learning、策略梯度、PPO 与奖励建模 | 未上线 |
| P10 LLM 从零训练 | 从 tokenizer 到 0.1B，含数据管线与三条后训练路线 | **已上线** |
| P11 LLM 工程 | 提示工程、RAG、LoRA 微调、结构化输出与生产化 | 未上线 |
| P12 多模态 AI | CLIP、LLaVA、Qwen-VL 与全模态模型 | 未上线 |
| P13 工具与协议 | 工具调用、MCP 协议、技能与 Agent SDK | 未上线 |
| P14 Agent 工程 | 可验证环境、harness、self-judge 与 RLVR 训练 | **已上线** |
| P15 自主系统 | 长程 Agent、自主改进、权限模式与可观测执行 | 未上线 |
| P16 多智能体与群体 | 编排、通信、共识与群体失败模式 | 未上线 |
| P17 基础设施 | 托管平台、服务与生产运维 | 未上线 |
| P18 伦理与安全 | 对齐、安全评估与风险治理 | 未上线 |
| P19 Capstone 项目 | 综合前 19 个 phase 的完整项目 | 未上线 |

P10 与 P14 的课目：

| 课 | 内容 | 交互演示 |
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
npm run dev            # 开发服务器（默认 5173）
npm run build          # 生产构建 → dist/
npm run preview        # 预览生产构建
npm run check:content  # 校验 phase 地图、验收项结构与站点身份
```

无后端、无账户：学习进度（Checklist 勾选）、主题偏好、续读位置仅保存在浏览器 localStorage，本站不收集、不上传任何数据。

## 技术栈

- **框架**：React 18 + Vite 5（单页 + hash 路由）
- **公式**：KaTeX（按需字体子集 `src/lib/katex-subset.css`，仅捆绑 Main/Math/Size/AMS 共 11 个 woff2，约 158KB）
- **代码高亮**：highlight.js（core 按语言注册）
- **字体**：Archivo Black（标题）/ Archivo（正文）/ JetBrains Mono（编号与数据），经 `fonts.loli.net` 境内镜像加载，系统字体栈回退
- **测试**：Playwright（`tests/playwright/`，含 seed/auth 脚手架）

## 目录结构

```
src/
├── site.js           # 站点身份单一真源（站名/副标题/描述/署名）
├── App.jsx           # 顶栏、侧栏目录、⌘K 跳转面板、主题、路由分发
├── routes.js         # 目录表、hash 解析（含旧 slug 兼容）、翻页顺序
├── content/
│   ├── phases/       # phase 地图单一真源（20 个 phase 数据 + 构建期校验）
│   ├── sections.js   # 节的单一真源（21 个节：标题/交付物/检查/汇入）
│   ├── registry.jsx  # 课级验收项注册表（进度统计的唯一真源）
│   ├── components.jsx# 课节点 → 正文组件
│   ├── part1.jsx     # Overview + HW1 + HW2
│   └── part2.jsx     # HW3 + HW4 + 期末 + 计划
├── demos/            # 交互演示（BPE / Attention / ScalingLaw）
├── components/       # PhasePage 课目条、MapPage 课程地图、Checklist 进度、Palette
├── lib/              # UI 原语（公式/代码块/Callout/作业卡/思考题/节）+ katex 子集
└── styles.css        # 全站样式（黑白 zine × 图鉴设计语言，深浅双主题）
graders/              # 每节的可执行检查入口（约定见 graders/README.md）
scripts/              # check-content.mjs（真实内容校验）、check-validate.mjs（校验的负向用例）
```

## 内容与验收约定

- **节是内容单位**：一次可完成、有交付物、可机器判定的学习动作。节的标题、交付物、检查与全站学习顺序都声明在 `src/content/sections.js`；正文用 `<Section id="…">` 承载，标题与锚点由数据渲染，不再手写 `<h3>`。进阶思考题与资源是节内附属块，不进节数据。
- **每节带一条可跑的检查**：`check` 声明 `how`（跑什么）/ `interface`（跑什么签名，可选）/ `cmd`（可复制命令）/ `expect`（判定口径）/ `pitfall`（常见失败）/ `grader`（仓库内入口）。站点不执行读者代码、不回传任何结果，判定完全在读者本机完成。
- **验收同源**：节的「我跑通了这项检查」与课级验收项共用 `llmcourse-{id}` 与本机进度事件，档案与收敛判定不变。
- **两道构建门**：`npm run check:content` 校验真实内容（含正文与节数据双向对照、grader 文件存在性），`npm run check:validate` 用负向用例证明校验真的会拦。新增一节按 `graders/README.md` 的四步走。

## 设计约定

- 黑白 zine 语言：纸白底、墨黑字、单一钴蓝（ultramarine）信号色；2px 硬边框 + 偏移实影，零圆角
- 首页是 20 节点课程地图：实心=已上线、空心=未上线，箭头即学习顺序；每个 phase 配一枚线稿图示
- 章节页以整幅钴蓝色带开场（编号 / 标题 / 一句话 / 预计学时），色带即全书最重的视觉落点
- 标题 Archivo Black、正文 Archivo、编号与数据 JetBrains Mono；层级靠字号与字重，不靠阴影
- 深色模式为夜间纸面：同一套版式，信号色提亮以适应暗底

## 许可与来源

站点主线参考 [AI Engineering from Scratch](https://github.com/rohitg00/ai-engineering-from-scratch)（MIT）的 phase 划分与课程组织；P10 与 P14 的作业设计参考清华 KEG《高级机器学习》（2026 秋）作业框架的公开转述，该课程课件未公开。其余参考的开源实现（nanoGPT、minimind、minbpe、flash-attention、trl、verl 等）版权归原作者所有。本站代码与编排内容仅用于学习交流。
