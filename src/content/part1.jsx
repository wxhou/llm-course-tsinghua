import { useState } from 'react'
import { M, MB, CodeBlock, Callout, Assignment, Star, Refs, ChapterHead } from '../lib/ui.jsx'
import BpeDemo from '../demos/BpeDemo.jsx'
import AttentionDemo from '../demos/AttentionDemo.jsx'
import { Checklist } from '../components/Progress.jsx'

/* ============ 首屏钩子：可玩演示入口 + 续读卡 ============ */
const DEMOS = [
  ['#demo-bpe', 'BPE 分词器', '拖动滑块，亲眼看 token 从字符一步步合并长大', 'HW1'],
  ['#demo-attn', '注意力热力图', '点任意字，看它把注意力分给了谁——真·softmax(QKᵀ/√d)', 'HW1'],
  ['#demo-scaling', 'Scaling Law 拟合器', '调三个参数拟合幂律，顺手算出 Chinchilla 最优配比', 'HW3'],
]

function jumpToDemo(sel) {
  const el = document.querySelector(sel)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash')
  setTimeout(() => el.classList.remove('flash'), 1900)
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return m + ' 分钟前'
  const h = Math.floor(m / 60)
  if (h < 24) return h + ' 小时前'
  return Math.floor(h / 24) + ' 天前'
}

export function Overview() {
  const [last] = useState(() => {
    try { return JSON.parse(localStorage.getItem('llm-last') || 'null') } catch { return null }
  })
  return (
    <section id="overview">
      {last && last.href && last.href !== '#overview' && (
        <a
          className="resume"
          href={last.href}
          onClick={e => { e.preventDefault(); document.querySelector(last.href)?.scrollIntoView({ behavior: 'smooth' }) }}
        >
          <span className="resume-tag">RESUME</span>
          <span className="resume-body">
            <b>继续上次：{last.label}</b>
            <span className="resume-time">{timeAgo(last.ts)}读到这里</span>
          </span>
          <span className="resume-go" aria-hidden="true">→</span>
        </a>
      )}
      <div className="kicker">OVERVIEW</div>
      <h1>从零训练大模型 · 自学阶梯</h1>
      <p className="lead">
        复刻清华 KEG 唐杰《高级机器学习》（2026 秋）的作业设计。课程课件未公开，本站基于公开转述与开源社区资源重建了整条学习路径：<b>每一格作业 = 数学推导 + 可运行代码 + OJ 式编程作业 + 进阶思考题</b>。
      </p>
      <div className="you-get">
        <div className="you-get-title">走完这条路径，你会带走</div>
        <ul>
          <li>一个<b>你亲手训练</b>的 0.1B 参数语言模型（能对话）</li>
          <li>看懂 GPU 上「同一公式差 10 倍速度」的原因，<b>手写过</b> attention 内核</li>
          <li>回答「预算怎么花」的<b>数据 + Scaling Law</b> 方法论</li>
          <li>SFT / DPO / RLVR 三条后训练路线的<b>受控对比实验</b>经验</li>
          <li>一个能自动修 bug 的<b>迷你 Agent 系统</b>（期末作品）</li>
        </ul>
      </div>
      <div className="play-grid">
        {DEMOS.map(([href, title, desc, tag]) => (
          <button key={href} className="play-card" onClick={() => jumpToDemo(href)}>
            <span className="play-tag">INTERACTIVE · {tag}</span>
            <b>{title}</b>
            <span className="play-desc">{desc}</span>
            <span className="play-go">立即玩 →</span>
          </button>
        ))}
      </div>
      <div className="ladder">
        {[
          ['HW1', '基础：Tokenizer + Transformer + 0.1B 训练', '从字符到 token，从矩阵到对话——跑通全链路并理解每一步的数学', false],
          ['HW2', '系统：Triton Attention Kernel', '下探到算子层：online softmax 推导、tiling、GPU 性能实验方法学', true],
          ['HW3', '数据 + Scaling Law', '数据管线工程 + 幂律的统计拟合——回答"预算怎么花"的定量问题', false],
          ['HW4', '后训练：SFT / DPO / RLVR 受控对比', '从 KL 约束 RL 到 DPO 闭式解，三条后训练路线的统一视角', true],
          ['期末', '长程 Agent：可验证环境 + Harness + Self-judge', '四格作业的汇合点：造考场、造手脚、造裁判，最后接上 RLVR 训练', false],
        ].map(([tag, title, desc, alt]) => (
          <div className={`rung ${alt ? 'alt' : ''}`} key={tag}>
            <div className="tag">{tag}</div>
            <div className="body"><b>{title}</b><p>{desc}</p></div>
          </div>
        ))}
      </div>
      <details className="fold">
        <summary>我要正式学 · 先修与学时（点开看严肃版说明）</summary>
        <p>
          预期投入：HW1–HW4 共 56–72 学时，期末项目另需 40 学时以上。课程评审只看四件事：<b>Problem · Motivation · Method · Results</b>（作业 40% + 期末 60%）——这四条同时也是你自学的检验器。下面是各领域的先修要求：
        </p>
        <table>
        <thead><tr><th>领域</th><th>必须达到</th><th>缺了去哪补</th></tr></thead>
        <tbody>
          <tr><td>PyTorch</td><td>独立写训练循环；理解 <M>{"\\text{tensor}"}</M> 广播与 <code>.grad</code></td><td>官方 60-min blitz；《动手学深度学习》第 3–5 章</td></tr>
          <tr><td>线性代数</td><td>矩阵乘、迹、Frobenius 范数；特征值的直觉</td><td>3Blue1Brown 线代本质系列</td></tr>
          <tr><td>概率 / 信息论</td><td>条件概率、期望、KL 散度、交叉熵的含义与关系</td><td>MacKay《Information Theory》第 1–2 章</td></tr>
          <tr><td>深度学习</td><td>反向传播推导过一遍；知道 Adam 在修什么</td><td>karpathy Zero to Hero（B 站字幕版）</td></tr>
          <tr><td>算力</td><td>≥8GB 显存一张卡，或 AutoDL/Colab 租卡</td><td>0.1B 规模 4090 数小时可跑完</td></tr>
        </tbody>
      </table>
      </details>
    </section>
  )
}

/* ============ HW1 ============ */
const HW1_CHECK = [
  { id: 'hw1-1', text: <>环境就绪；clone <code>karpathy/nanoGPT</code> 与 <code>jingyaogong/minimind</code>（61.5K★，26M→0.5B 全档可复现，中文文档）</> },
  { id: 'hw1-2', text: '数据：1–5GB 中文语料清洗为纯文本，统计 token 数与字符数比例' },
  { id: 'hw1-3', text: <>Tokenizer：跑通 <code>minbpe</code>；用自己的语料训练一个 2048 词表的 BPE，检查高频中文词是否成 token</> },
  { id: 'hw1-4', text: '模型：合上电脑默写 Transformer 块 → 对照 minGPT model.py 逐行订正 → 解释每一行的 shape' },
  { id: 'hw1-5', text: '训练：overfit 单 batch（loss→≈0）；全量训练 0.1B（~2B token），盯 loss 曲线与梯度范数' },
  { id: 'hw1-6', text: '采样：实现 temperature / top-k / top-p 三种解码，与 base model 对话，记录"接话不听话"的例子' },
  { id: 'hw1-7', text: '实验记录：2–3 组不同 (n_layer, d) 配置的 loss 曲线，按 Problem/Motivation/Method/Results 四段写' },
]

export function HW1() {
  return (
    <section id="hw1">
      <ChapterHead
        kicker="HW1 · FOUNDATIONS" no="01"
        title="Tokenizer 与 Transformer：从字符到 0.1B"
        oneliner="语言模型读的不是字，是数字——这一章你亲手把文字变成数字、搭出会续写的模型，并跑通一次完整训练。"
        lead="目标：跑通端到端全链路，并且能对每一步回答'为什么'。学完这章，'大模型'应退化为一段你亲手写过的、能解释的代码。"
        hours="16–20h" prereq="先修自查全部通过"
      />
      <h3>1.1 Tokenization：序列建模的第一道压缩</h3>
      <p>
        模型只能吃向量。按字符切序列太长（英文一个词被拆成一串字符，注意力平方开销浪费在词内）；按词切无法处理开放词表。<b>Byte Pair Encoding</b> 的答案是让词表从数据里"长"出来：初始化为字节/字符级，反复执行<em>「统计相邻 pair 频次 → 合并最高频者」</em>，直到达到目标词表规模。
      </p>
      <BpeDemo />
      <Callout type="int" title="为什么 GPT 不直接用词典查词？">
        <p>合并操作本质是贪心的频次压缩（与 Huffman 同源但保留次序信息）。高频词优先合并 → 常用语料序列变短；低频组合永不合并 → 开放词表，任何新文本都能回退到字节表示，<b>不存在 OOV</b>。GPT-2 的 50,257 词表就是字节级 BPE，一个汉字通常 1–2 个 token。</p>
      </Callout>

      <h3>1.2 Transformer 块：把维度标注出来</h3>
      <p>设 batch=B、序列长=T、模型维度 d、头数 h（每头 <M>{'d_h=d/h'}</M>）。一块 Transformer 的数据流：</p>
      <MB>{String.raw`x \;\xrightarrow{\text{LN}}\; Q,K,V = XW_q, XW_k, XW_v \quad (W_q,W_k,W_v\in\mathbb{R}^{d\times d})`}
      </MB>
      <MB>{String.raw`\text{Attn}(Q,K,V)=\text{softmax}\!\Big(\frac{QK^{\top}}{\sqrt{d_h}}+M_{\text{causal}}\Big)V,\qquad M_{ij}=\begin{cases}0 & j\le i\\ -\infty & j>i\end{cases}`}
      </MB>
      <MB>{String.raw`\text{FFN}(x)=W_2\,\sigma(W_1 x),\qquad W_1\in\mathbb{R}^{d\times 4d},\ W_2\in\mathbb{R}^{4d\times d}`}
      </MB>
      <Callout type="def" title="三个值得停下来想的问题">
        <p><b>① 为什么除以 <M>{'\u221Ad_h'}</M>？</b> <M>{'q\cdot k=\sum_{i=1}^{d_h}q_ik_i'}</M>，若各分量独立、方差 <M>{'1'}</M>，点积方差为 <M>{'d_h'}</M>；softmax 在大 logit 下梯度消失，除以 <M>{'\u221Ad_h'}</M> 把方差归一回 1。</p>
        <p><b>② causal mask 为什么要 <M>{'-\infty'}</M> 而不是 0？</b> softmax 的分母会累加所有位置的权重，0 仍然是可参与归一化的分数；<M>{'-\infty'}</M> 经 exp 后变 0，才真正切断信息流。</p>
        <p><b>③ FFN 为什么先升 4 倍？</b> 无定理级答案——是 2017 年沿用至今的经验配置；理论角度它给逐位置变换提供了高维"键值空间"，参数占比约 2/3，被普遍认为是知识存储的主要场所。</p>
      </Callout>
      <AttentionDemo />

      <h3>1.3 训练目标与损失</h3>
      <Callout type="thm" title="训练的损失就是你每天听说的交叉熵">
        <p>给定语料 <M>{'x_{1:T}'}</M>，自回归模型 <M>{'p_\theta'}</M> 的负对数似然：</p>
        <MB>{String.raw`\mathcal{L}(\theta)=-\sum_{t=1}^{T}\log p_\theta(x_t\mid x_{<t})=-\sum_{t=1}^{T}\underbrace{\log\frac{e^{z_{t,x_t}}}{\sum_j e^{z_{t,j}}}}_{\text{交叉熵}(z_t,\,\text{onehot}(x_t))}`}
        </MB>
        <p>所以"训练语言模型"与"逐位置做 softmax 分类"是同一件事。<b>困惑度</b> <M>{'\text{PPL}=e^{\mathcal{L}/T}'}</M> 是等价口径，中文语料 0.1B 模型训到 PPL 15–25 属正常区间。</p>
      </Callout>

      <h3>1.4 参考实现（对照默写用）</h3>
      <CodeBlock file="model.py · 多头注意力（minGPT 风格）" lang="python" highlight={[8, 9, 10]}>
{`import torch, torch.nn as nn, torch.nn.functional as F

class CausalSelfAttention(nn.Module):
    def __init__(self, d, n_head):
        super().__init__()
        self.n_head = n_head
        self.qkv = nn.Linear(d, 3 * d)            # 一次投影出 Q,K,V
        self.proj = nn.Linear(d, d)
        self.register_buffer("mask", torch.tril(torch.ones(1024, 1024))
                                      .view(1, 1, 1024, 1024))   # 下三角 = 因果

    def forward(self, x):                          # x: (B, T, d)
        B, T, d = x.shape
        q, k, v = self.qkv(x).split(d, dim=2)
        # 拆头：(B,T,d) -> (B, h, T, d/h)。关键：多头=在 d/h 维子空间并行做 attention
        q = q.view(B, T, self.n_head, -1).transpose(1, 2)
        k = k.view(B, T, self.n_head, -1).transpose(1, 2)
        v = v.view(B, T, self.n_head, -1).transpose(1, 2)
        att = (q @ k.transpose(-2, -1)) / (k.size(-1) ** 0.5)   # (B,h,T,T)
        att = att.masked_fill(self.mask[:, :, :T, :T] == 0, float('-inf'))
        att = F.softmax(att, dim=-1)
        y = att @ v                                 # (B,h,T,d/h)
        y = y.transpose(1, 2).contiguous().view(B, T, d)
        return self.proj(y)`}
      </CodeBlock>
      <Callout type="warn" title="训练跑不动？新手十有八九栽在这三个坑">
        <p><b>mask 泄漏</b>：评测时用了双向注意力，训练 loss 低得可疑；<b>norm 位置</b>：Post-LN 深层训不动时先检查是否漏了残差分支上的 LN；<b>数值</b>：fp16 训练出现 NaN，换 bf16 或对 attention 前做 <code>float()</code> 提升。排查顺序永远是：先 overfit 单 batch，再查数据管线，最后查数值。</p>
      </Callout>

      <h3>1.5 编程作业</h3>
      <Assignment
        title="PA1 · 从零训练 nanogpt-mini 并完成受控消融"
        difficulty={2} estHours="8–12h" prereq="本章 1.1–1.4"
        deliverables={[
          '可复现训练脚本（固定 seed，单命令跑通）',
          '0.1B 模型的最终 loss 曲线与采样样例 ≥10 条',
          '一组消融：去掉 causal mask / 去掉残差 / 去掉 LN，各跑 1k step，记录 loss 与现象',
        ]}
        accept={[
          '单 batch overfit：loss 能压到 <0.1',
          '0.1B / 2B token：验证 PPL 落在 15–25 区间（语料不同可浮动，需解释）',
          '采样 20 条中能指出 ≥3 条"接话不听话"的实例（为 HW4 埋伏笔）',
          '消融实验有定性结论：哪一项去掉后最先崩，为什么',
        ]}
        hints={[
          '先抄 minbpe 把 tokenizer 跑通——独立于模型部分，可并行推进。',
          'overfit 单 batch 压不到 0：99% 是 mask/标签错位（预测的是 x_t 而不是 x_{t+1}）或学习率过大。',
          '消融实验建议先跑「去残差」，它的失败模式最直观（梯度消失、loss 不降）。',
        ]}
      />

      <h3>1.6 进阶思考题</h3>
      <Star diff={2} title="Pre-LN 为什么比 Post-LN 稳定？写出两者的残差表达式并分析梯度路径。">
        Post-LN：<M>{'x_{l+1}=\text{LN}(x_l+\text{Attn}(x_l))'}</M>——梯度要穿过每层的 LN，深层时 LN 的 Jacobian 会放大/缩小梯度导致训练不稳，需要 warmup；Pre-LN：<M>{'x_{l+1}=x_l+\text{Attn}(\text{LN}(x_l))'}</M>——存在一条干净的恒等路径直通顶层，梯度无损回传，但代价是深层有效深度增长更慢（表示"欠深"）。这就是现代模型几乎全用 Pre/沙箱 LN 的原因。
      </Star>
      <Star diff={3} title="如果词表从 5 万扩到 20 万，参数量和计算量分别怎么变？什么情况下扩词表是亏的？">
        嵌入与输出头增加 <M>{'2\times\Delta V\times d'}</M> 参数（若不共享权重）。计算量增加发生在输出投影与 softmax：<M>{'O(T\cdot d\cdot\Delta V)'}</M>。当语料中新增 token 的平均频率低于阈值时，序列长度压缩带来的节省（每 token 一次 attention O(T²) 的收益）抵不过 softmax 变贵——对英文扩词表常亏，对中文/多语场景常赚。
      </Star>
      <Star diff={3} title="base model 的采样为什么会陷入循环重复？给出一种解码期的补救及其代价。">
        贪心/低温采样下，重复前缀会提高其自身的续写概率（正反馈），进入吸引子。补救：重复惩罚（logit 减固定值）、presence/frequency penalty、或对比搜索。代价：这些手段都会扭曲分布，长文本里引入不连贯——本质是"用分布偏移换多样性"。
      </Star>

      <Checklist items={HW1_CHECK} />
      <h3>资源</h3>
      <div className="res-grid">
        <div className="res"><b><a href="https://github.com/karpathy/nanoGPT" target="_blank" rel="noreferrer">karpathy/nanoGPT</a></b><span className="why">300 行最小完整实现，本作业的"标准答案级"参照。</span><span className="meta">63.2K★ · MIT</span></div>
        <div className="res"><b><a href="https://github.com/jingyaogong/minimind" target="_blank" rel="noreferrer">jingyaogong/minimind</a></b><span className="why">中文生态最全的可复现小模型，26M→0.5B 全档。</span><span className="meta">61.5K★ · 活跃</span></div>
        <div className="res"><b><a href="https://github.com/karpathy/minbpe" target="_blank" rel="noreferrer">karpathy/minbpe</a></b><span className="why">100 行 GPT-4 风格 BPE，配 1 小时讲解视频。</span><span className="meta">教学向</span></div>
        <div className="res"><b>Zero to Hero（视频课）</b><span className="why">从 micrograd 到 GPT 的完整推导链，HW1 最佳伴随材料。</span><span className="meta">B 站字幕版</span></div>
      </div>
      <Refs items={[
        { text: 'Vaswani et al. Attention Is All You Need. NeurIPS 2017.', href: 'https://arxiv.org/abs/1706.03762', note: 'Transformer 出处，重点读 3.2 节' },
        { text: 'Sennrich et al. Neural Machine Translation of Rare Words with Subword Units. ACL 2016.', href: 'https://arxiv.org/abs/1508.07909', note: 'BPE 用于神经网络的原始论文' },
        { text: 'Radford et al. Language Models are Unsupervised Multitask Learners (GPT-2). 2019.', href: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf', note: '字节级 BPE 与 zero-shot 范式' },
      ]} />
      <h3>基础自测</h3>
      <Star diff={1} title="为什么 attention 复杂度 O(T²) 而 FFN 是 O(T·d²)？这决定了上下文长度的什么性质？">
        每个位置与其余所有位置交互 → T² 次点积；FFN 逐位置独立 → T·d²。T² 项意味着序列翻倍、attention 计算翻四倍——这是 HW2 的优化动机，也是长上下文模型（稀疏/线性注意力/滑动窗口）存在的理由。
      </Star>
      <Star diff={1} title="base model 为什么'会接话不会听话'？">
        训练目标是续写（模仿语料分布），不是服从指令。指令遵循是 HW4 后训练的产物——先在这里亲眼看现象，HW4 的动机就成立了。
      </Star>
    </section>
  )
}

/* ============ HW2 ============ */
const HW2_CHECK = [
  { id: 'hw2-1', text: <>跑通 <a href="https://triton-lang.org/main/getting-started/tutorials/06-fused-attention.html" target="_blank" rel="noreferrer">Triton tutorial 06</a>，画出它的 block 迭代结构</> },
  { id: 'hw2-2', text: '从零写两个 kernel：naive（落完整 T×T 矩阵）与分块 + online softmax 版' },
  { id: 'hw2-3', text: '数值对拍 torch SDPA（fp16, atol=1e-2）通过' },
  { id: 'hw2-4', text: 'benchmark：T∈{512…8192} × 三种实现，画吞吐与显存双图' },
  { id: 'hw2-5', text: '结论按四段式写：性能差距的瓶颈归因（计算 or 显存带宽）' },
]

export function HW2() {
  return (
    <section id="hw2">
      <ChapterHead
        kicker="HW2 · SYSTEMS" no="02"
        title="手写 Triton Attention Kernel"
        oneliner="同样的公式，实现差十倍速度——这一章教你像修车一样打开模型引擎，看懂性能到底卡在哪。"
        lead="目标：下探到算子层。同一数学公式，实现差 10 倍速度——学会用 IO 复杂度而非 FLOPs 分析 GPU 性能，这是系统课的思维转变。"
        hours="12–16h" prereq="HW1 完成；CUDA 层次结构的基本概念"
      />
      <h3>2.1 朴素实现差在哪：一个 IO 视角</h3>
      <p>
        教科书实现 <M>{'\text{softmax}(QK^\top/\sqrt{d_h})V'}</M> 需要<b>物化</b> T×T 的注意力矩阵到 HBM（高带宽显存）。A100 的 HBM 带宽约 2TB/s，而片上 SRAM 带宽高一个数量级但只有 20MB——naive 实现把矩阵反复在 HBM↔SRAM 之间搬运，GPU 大量时间在等数据。
      </p>
      <Callout type="thm" title="FlashAttention 赢在哪：不是算得快，是搬得少">
        <p>标准实现需要 <M>{'\Theta(Td + T^2)'}</M> 次 HBM 访问（<M>{'d'}</M> 为头维度）；FlashAttention 通过分块+online softmax 把它降到 <M>{'\Theta(T^2d^2/M)'}</M>（<M>{'M'}</M> 为 SRAM 大小）。两者之比约为 <M>{'M/d^2'}</M>——对典型 <M>{'d=64\sim128'}</M>、几百 KB 的片上 SRAM，约是一个数量级的减少，实测 2–4× 端到端加速、显存 O(T²)→O(T)。</p>
      </Callout>
      <h3>2.2 Online Softmax：先把递推写出来</h3>
      <p>softmax 的平移不变性允许流式计算。设处理到第 <M>{'j'}</M> 块时维护 <M>{'m_j'}</M>（running max）、<M>{'\ell_j'}</M>（running 分母）、<M>{'o_j'}</M>（未归一化输出）。对新块 <M>{'[m_{\text{new}}, s_{\text{new}}, V_{\text{new}}]'}</M>：</p>
      <MB>{String.raw`m_{j+1}=\max(m_j,\,m_{\text{new}}),\qquad
\ell_{j+1}=e^{m_j-m_{j+1}}\ell_j+e^{m_{\text{new}}-m_{j+1}}\sum_i e^{s_{\text{new},i}},`}
      </MB>
      <MB>{String.raw`o_{j+1}=\underbrace{e^{m_j-m_{j+1}}}_{\text{旧块整体缩放}}\,o_j+e^{m_{\text{new}}-m_{j+1}}\,s_{\text{new}}^{\top}V_{\text{new}}`}
      </MB>
      <Callout type="int" title="边算边修正，凭什么和一次算完的结果一模一样？">
        <p>所有块结束后 <M>{'o_J/\ell_J'}</M> 与一次性算完的 softmax·V 逐位相等——递推只是把「先全算再归一」改成「边算边修正」。划算在于：<M>{'s_{\text{new}}'}</M> 和 <M>{'V_{\text{new}}'}</M> 从 SRAM 读写、<b>从不落 HBM</b>，中间量随算随弃。</p>
      </Callout>
      <h3>2.3 Triton 参考实现（教学版 softmax kernel）</h3>
      <CodeBlock file="softmax_kernel.py" lang="python" highlight={[11]}>
{`import triton
import triton.language as tl

@triton.jit
def softmax_kernel(out_ptr, in_ptr, n_cols, BLOCK: tl.constexpr):
    row = tl.program_id(0)                       # grid 维度 0 = 一行一个 program
    cols = tl.arange(0, BLOCK)                   # 块内列号（编译期常量）
    x = tl.load(in_ptr + row * n_cols + cols,
                mask=cols < n_cols, other=-float('inf'))
    x = x - tl.max(x, axis=0)                    # 数值稳定：减行最大值
    e = tl.exp(x)
    e = e / tl.sum(e, axis=0)
    tl.store(out_ptr + row * n_cols + cols, e, mask=cols < n_cols)`}
      </CodeBlock>
      <p>attention 版在其上做两层嵌套：外层遍历 Q 块、内层遍历 K/V 块，每个内层迭代执行上面三条递推。写完的第一件事是 <code>torch.allclose(out, F.scaled_dot_product_attention(q,k,v), atol=1e-2)</code>——<b>数值不过关之前，性能没有意义</b>。</p>
      <h3>2.4 性能实验方法学</h3>
      <Callout type="warn" title="测出来的速度不可信？四个纪律防假数据">
        <p>① <code>torch.cuda.synchronize()</code> 之后再计时，否则测的是 kernel launch 队列；② warmup ≥3 次再测；③ 用 CUDA event 计时而非 <code>time.time()</code>；④ 固定频率跑（笔记本温控降频会毁掉数据）。显存用 <code>torch.cuda.max_memory_allocated()</code>，它才是区分两种实现的真正证据。</p>
      </Callout>
      <h3>2.5 编程作业</h3>
      <Assignment
        title="PA2 · Triton Attention Kernel 与性能归因报告"
        difficulty={4} estHours="10–14h" prereq="2.1–2.4"
        deliverables={[
          'softmax kernel + 分块 attention kernel（含 causal mask）',
          '数值对拍脚本（三种 T 尺寸 × fp16）',
          '性能报告：吞吐曲线 + 显存曲线 + 瓶颈归因（计算受限 or 带宽受限，给证据）',
        ]}
        accept={[
          '三种尺寸数值对拍全部通过',
          '大 T（≥4096）下 naive 版 OOM 而分块版正常——用数据展示这一分界',
          '报告能回答：你的 kernel 距 torch SDPA 还差多少？差距来自哪个工程维度（tiling 策略/调度/向量化）',
        ]}
        hints={[
          '先不写 causal mask 的分块版，对拍通过后再加 mask（内层跳过全被 mask 的 K 块，这本身就是性能优化）。',
          'BLOCK 大小用 tl.constexpr 让编译器 specialize；试 {64,128} 两档对比。',
          '归因利器：把 attention 的 FLOPs 估算与实测时间相除得"有效算力"，远低于峰值即带宽受限。',
        ]}
      />
      <h3>2.6 进阶思考题</h3>
      <Star diff={2} title="推导 attention 对 V 的 backward，并说明 backward 中的 softmax Jacobian 为什么也可以流式计算。">
        前向记 <M>{'S=QK^{\top}/\sqrt{d_h}'}</M>、<M>{'P=\text{softmax}(S)'}</M>、<M>{'O=PV'}</M>。设 <M>{'D'}</M> 为损失对输出 <M>{'O'}</M> 的上游梯度，则 <M>{'\partial L/\partial V=P^{\top}D'}</M>；对分数的梯度要过 softmax Jacobian <M>{'\text{diag}(P)-PP^{\top}'}</M>，与上游梯度 <M>{'G'}</M>（对 <M>{'P'}</M>）相乘后可化简为逐元素形式 <M>{'\partial L/\partial S_{ij}=P_{ij}\big(G_{ij}-\sum_{k}P_{ik}G_{ik}\big)'}</M>——只含逐元素乘与行求和，全程无需物化 T×T 的 Jacobian 矩阵。行求和项随分块累积即可，与 forward 的 running-max 递推同构，所以 backward 同样可以分块流式，这是 FlashAttention backward 的核心。
      </Star>
      <Star diff={3} title="FlashAttention-2 相比 v1 改了哪个并行维度，为什么对小 batch 训练收益大？">
        v1 在 batch×head 维并行，SM 占用率在长序列小 batch 时不足（seq 维只有 1 个程序）；v2 把 Q 的序列维也拆开并行、并减少非 matmul FLOPs、调整 warp 分工。你的 kernel 卡在 SM 占用还是带宽，决定了这些技巧哪些对你有效——先 profile 再抄。
      </Star>
      <Checklist items={HW2_CHECK} />
      <h3>资源</h3>
      <div className="res-grid">
        <div className="res"><b><a href="https://github.com/Dao-AILab/flash-attention" target="_blank" rel="noreferrer">Dao-AILab/flash-attention</a></b><span className="why">生产级实现；论文 §3 的 IO 分析框架是本作业的灵魂。</span><span className="meta">25.0K★</span></div>
        <div className="res"><b><a href="https://github.com/triton-lang/triton" target="_blank" rel="noreferrer">triton-lang/triton</a></b><span className="why">tutorials 01–10 是最好教材，06 即 fused attention。</span><span className="meta">20.2K★ · 活跃</span></div>
      </div>
      <Refs items={[
        { text: 'Dao et al. FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness. 2022.', href: 'https://arxiv.org/abs/2205.14135', note: '§3 IO 复杂度必读' },
        { text: 'Dao. FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning. 2023.', href: 'https://arxiv.org/abs/2307.08691' },
        { text: 'Tillet et al. Triton: An Intermediate Language for Tiled Neural Network Accelerators. 2019.', note: '理解 Triton 的 block 抽象' },
      ]} />
    </section>
  )
}
