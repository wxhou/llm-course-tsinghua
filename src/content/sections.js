/* 节的单一真源：phase → lesson → 节。每节声明交付物与可机器检查的验收（结构见 openspec/changes/section-track/design.md D3）。
   tier 规则（design D2）：T1 = 作业节，T2 = 教学节并 feeds 指向本课作业节；思考题与资源是节内附属块，不在此登记。
   节数据必须是纯数据模块：ui.jsx 从这里取标题渲染锚点，任何 import 都会绕回内容模块形成环。 */

let seq = 0

/* 声明一组节：lessonId 与全局学习序号由声明顺序派生，写节时只需给内容 */
export function defineLessonSections(lessonId, list) {
  return list.map(s => ({ ...s, lessonId, order: ++seq }))
}

export const SECTIONS = [
  /* ---------- hw1 · Tokenizer 与 Transformer ---------- */
  ...defineLessonSections('hw1', [
    {
      id: 'hw1-1', tier: 't2', feeds: ['hw1-5'],
      title: '1.1 Tokenization：序列建模的第一道压缩',
      deliverable: '用 minbpe 在自己的语料上训练一个词表，导出 vocab 与 merges 两个文件',
      check: {
        how: '对导出的词表做可逆性与压缩率自检：编码再解码必须逐字还原，且 token 数少于字符数',
        cmd: 'python graders/hw1_1_bpe.py --vocab <你的 vocab.json> --merges <你的 merges.txt> --sample <一段测试文本>',
        expect: '解码还原完全一致，且 token 数 < 字符数；词表大小与训练时设定的目标一致',
        pitfall: '词表漏掉部分字节 token（或 vocab 与 merges 不同源）：解码还原失败，或压缩率停在 1.0',
        grader: 'graders/hw1_1_bpe.py',
      },
    },
    {
      id: 'hw1-2', tier: 't2', feeds: ['hw1-5'],
      title: '1.2 Transformer 块：把维度标注出来',
      deliverable: '默写出的 CausalSelfAttention（含多头拆分与 causal mask）',
      check: {
        how: '因果性自检：改动位置 t 之后的 token，位置 t 的输出必须逐位不变',
        interface: 'build_model() -> nn.Module；forward(LongTensor[B,T]) -> logits[B,T,V]',
        cmd: 'python graders/hw1_2_causal.py --model <你的模型文件路径>',
        expect: '扰动未来 token 前后，前 t 个位置的输出最大绝对差 < 1e-6；且输出形状与输入一致',
        pitfall: 'mask 条件写反（> 写成 >=）或干脆没加 mask：未来 token 泄漏进历史位置，训练 loss 低得可疑',
        grader: 'graders/hw1_2_causal.py',
      },
    },
    {
      id: 'hw1-3', tier: 't2', feeds: ['hw1-5'],
      title: '1.3 训练目标与损失',
      deliverable: '一段验证脚本：用自己写的交叉熵与 torch 官方实现对拍',
      check: {
        how: '在随机 logits 与随机标签上，对你实现的交叉熵与 F.cross_entropy 逐点对拍',
        interface: 'cross_entropy(logits[B,V], targets[B]) -> 标量（batch 均值）',
        cmd: 'python graders/hw1_3_xent.py --impl <你的实现文件路径>',
        expect: '全部对拍点的绝对差 < 1e-6；放大到 ±200 的 logit 下仍为有限值（说明做了 log-sum-exp 稳定化）',
        pitfall: '直接用 exp(z)/Σexp(z) 没减最大值：常规 logit 下对得上，放大后立刻溢出成 nan',
        grader: 'graders/hw1_3_xent.py',
      },
    },
    {
      id: 'hw1-4', tier: 't2', feeds: ['hw1-5'],
      title: '1.4 参考实现（对照默写用）',
      deliverable: '一个可实例化的模型文件：能前向、能报出参数量',
      check: {
        how: '形状与参数量自检：前向输出形状等于输入形状、词表维不随输入变化，自报参数量等于实际参数量',
        interface: 'build_model() -> nn.Module；count_params(model) -> int',
        cmd: 'python graders/hw1_4_shapes.py --model <你的模型文件路径>',
        expect: '三组输入下输出形状均为 [B,T,V] 且 V 不变；自报参数量与实际参数量相等；同配置两次构建一致',
        pitfall: '多头 reshape 时把 B 与 T 弄混（view 的维度顺序错），或 count_params 把绑定权重的输出头算了两次',
        grader: 'graders/hw1_4_shapes.py',
      },
    },
    {
      id: 'hw1-5', tier: 't1',
      title: '1.5 编程作业',
      deliverable: 'PA1 的三件交付物：可复现训练脚本、0.1B 的 loss 曲线与 ≥10 条采样、一组消融记录',
      check: {
        how: '用迷你配置（CPU 分钟级）真跑一段训练，看 loss 是否在下降',
        interface: 'python <训练脚本> --steps N --seed S，每步打印一行含 step=<i> 与 loss=<v>',
        cmd: 'python graders/hw1_5_smoke.py --script <你的训练脚本>',
        expect: '脚本退出码为 0；40 步 smoke 内 loss 下降 ≥30%；同 seed 重跑末步 loss 一致',
        pitfall: '没把 seed 传进 DataLoader/torch：同 seed 两次跑出不同曲线；或 lr 过大，前 40 步 loss 不降反升',
        grader: 'graders/hw1_5_smoke.py',
      },
    },
  ]),

  /* ---------- hw2 · Triton Attention Kernel ---------- */
  ...defineLessonSections('hw2', [
    {
      id: 'hw2-1', tier: 't2', feeds: ['hw2-5'],
      title: '2.1 朴素实现差在哪：一个 IO 视角',
      deliverable: '一页 IO 账：给出 naive 与分块两种实现在给定 (T, d, M) 下的 HBM 读写量估算',
      check: {
        how: '在 T=4096、d=64、M=1024、fp16 下估算四项，写进 answers.json：naive_bytes / blocked_bytes / naive_over_blocked / read_amplification（口径见 2.1 正文的 IO 账）',
        cmd: 'python graders/hw2_1_io.py --answers <你的 answers.json>',
        expect: '四项读写量估算均与解析式一致（相对误差 <1%）：朴素 b·(4Td+4T²)、分块 b·(2Td+2T²d/M)、放大 T/M',
        pitfall: '只算了"读一次 Q/K/V 写一次 O"：漏掉 S/P 的往返写读，朴素项偏小一半以上',
        grader: 'graders/hw2_1_io.py',
      },
    },
    {
      id: 'hw2-2', tier: 't2', feeds: ['hw2-5'],
      title: '2.2 Online Softmax：先把递推写出来',
      deliverable: '自己实现的 online softmax（含 running max 与 running 分母的递推）',
      check: {
        how: '与一次性 softmax 在 CPU 上对拍，并检验分块大小改变时结果不变',
        interface: 'online_softmax(x[...], block) -> 与 x 同形状，沿最后一维分块',
        cmd: 'python graders/hw2_2_online.py --impl <你的实现文件路径>',
        expect: '与参考 softmax 的绝对差 < 1e-6；分块取 {1, 7, 64, 100} 四档结果一致；logit 放大 500 倍后不溢出',
        pitfall: '更新了 running max 却忘了按 exp(m_old − m_new) 重标分母：分块大小一变结果就漂',
        grader: 'graders/hw2_2_online.py',
      },
    },
    {
      id: 'hw2-3', tier: 't2', feeds: ['hw2-5'],
      title: '2.3 Triton 参考实现（教学版 softmax kernel）',
      deliverable: '跑通 softmax kernel 的对拍输出（三种序列长度 × fp16）',
      check: {
        how: '检查你的对拍输出：{"runs": [{"T", "dtype", "max_abs_err"}, …]}，三种尺寸是否齐备，逐项误差是否达标',
        cmd: 'python graders/hw2_3_kernel_report.py --report <你的对拍输出文件>',
        expect: '含三种序列长度的记录；每项 max-abs-err < 1e-2；无 NaN',
        pitfall: '只跑了一个尺寸、或全程 fp32：大 T 的真实精度塌陷没被记录到',
        grader: 'graders/hw2_3_kernel_report.py',
      },
    },
    {
      id: 'hw2-4', tier: 't2', feeds: ['hw2-5'],
      title: '2.4 性能实验方法学',
      deliverable: '一份 benchmark 脚本：带同步、预热、事件计时与显存统计',
      check: {
        how: '静态检查你的 benchmark 脚本是否具备四条纪律',
        cmd: 'python graders/hw2_4_bench_discipline.py --script <你的 benchmark 脚本>',
        expect: '四项齐备：计时前 synchronize、warmup ≥3、CUDA event 计时、max_memory_allocated 统计',
        pitfall: '用 time.time() 包住 kernel 调用且不 synchronize：测到的是 launch 队列长度，不是计算时间',
        grader: 'graders/hw2_4_bench_discipline.py',
      },
    },
    {
      id: 'hw2-5', tier: 't1',
      title: '2.5 编程作业',
      deliverable: 'PA2 的三件交付物：kernel 实现、数值对拍脚本、性能归因报告（吞吐与显存双图）',
      check: {
        how: '检查交付目录（parity.json / oom.md / attribution.md）：对拍记录、OOM 分界数据、归因报告三段是否齐备且非空',
        cmd: 'python graders/hw2_5_accept.py --artifacts <你的交付目录>',
        expect: '三种尺寸对拍全过；大 T 下 naive OOM 而分块版正常的分界有数据；归因报告给出瓶颈判断与证据',
        pitfall: '归因只写"分块版更快"，没有带宽/算力证据；或 OOM 分界只有结论没有具体 T 与显存数字',
        grader: 'graders/hw2_5_accept.py',
      },
    },
  ]),

  /* ---------- hw3 · 数据与 Scaling Law ---------- */
  ...defineLessonSections('hw3', [
    {
      id: 'hw3-1', tier: 't2', feeds: ['hw3-4'],
      title: '3.1 数据管线：每一步都在去"毒"',
      deliverable: '管线脚本 + 过滤前后的统计（token 数、去重率、各规则命中数）',
      check: {
        how: '核对统计文件：过滤后不得多于过滤前，且各规则命中数与总减少量自洽',
        cmd: 'python graders/hw3_1_pipeline.py --stats <你的 stats.json>',
        expect: '过滤后 token 数 ≤ 过滤前；去重率与规则命中数之和与总减少量一致（误差 0）',
        pitfall: '规则互相重叠计数（同一条文档被两条规则各记一次）：账面的减少量大于实际减少量',
        grader: 'graders/hw3_1_pipeline.py',
      },
    },
    {
      id: 'hw3-2', tier: 't2', feeds: ['hw3-4'],
      title: '3.2 Scaling Law：从经验曲线到预算决策',
      deliverable: '一组 (N, L) 数据点与幂律拟合参数（α 与拟合优度）',
      check: {
        how: '对数据点重做幂律拟合，核对你的 α 与 R²',
        cmd: 'python graders/hw3_2_scaling.py --points <你的 points.json>',
        expect: '拟合 R² ≥ 0.9；你报告的 α 与重拟合结果相对误差 <5%；数据点数 ≥6',
        pitfall: '用首尾两点代替最小二乘：含噪数据上 α 系统性偏大，外推结论跟着错',
        grader: 'graders/hw3_2_scaling.py',
      },
    },
    {
      id: 'hw3-3', tier: 't2', feeds: ['hw3-4'],
      title: '3.3 你自己的拟合：log 空间最小二乘',
      deliverable: 'log 空间最小二乘的实现（不调用拟合库）',
      check: {
        how: '与 numpy 的最小二乘实现对照，并检验对已知幂律的还原精度',
        interface: 'lsq(x, y) -> (slope, intercept)，拟合 y = slope·x + intercept',
        cmd: 'python graders/hw3_3_lsq.py --impl <你的实现文件路径>',
        expect: '与 numpy 结果相对误差 <1e-6；对合成的幂律数据能还原出原指数（误差 <1e-3）',
        pitfall: '没在 log 空间拟合（直接拟 L = a·N^−α）：R² 看着很高，但 α 与真实指数对不上',
        grader: 'graders/hw3_3_lsq.py',
      },
    },
    {
      id: 'hw3-4', tier: 't1',
      title: '3.4 编程作业',
      deliverable: 'PA3 的三件交付物：消融对比、6 档参数量扫描、四段式实验报告',
      check: {
        how: '检查交付目录（scan.json / report.md）：扫描档数与拟合结果是否齐备，报告四段是否非空',
        cmd: 'python graders/hw3_4_accept.py --artifacts <你的交付目录>',
        expect: '6 档扫描齐备；拟合给出 α 与 R²；报告含 Problem/Motivation/Method/Results 四段',
        pitfall: '六档共用一个 token 预算却没说明；或报告缺 Method 段，结果无法复现',
        grader: 'graders/hw3_4_accept.py',
      },
    },
  ]),

  /* ---------- hw4 · SFT / DPO / RLVR ---------- */
  ...defineLessonSections('hw4', [
    {
      id: 'hw4-1', tier: 't2', feeds: ['hw4-4'],
      title: '4.1 统一出发点：KL 约束的奖励最大化',
      deliverable: 'KL 约束目标的推导（手写）+ 一个小实验：β 变化对策略偏移的影响',
      check: {
        how: '在两臂 bandit（奖励 [1,0]、参考策略均匀）上扫描 β，把 {"betas": [...], "kl": [...]} 写进 results.json，检查偏移与闭式解一致',
        cmd: 'python graders/hw4_1_kl.py --results <你的 results.json>',
        expect: '每个 β 的 KL 与闭式解相差 <1%；偏移随 β 单调不增；β=100 时 KL < 1e-3',
        pitfall: '把 β 乘进奖励而不是除（方向反了）：偏移随 β 增大，与"β 越大越贴参考"相反',
        grader: 'graders/hw4_1_kl.py',
      },
    },
    {
      id: 'hw4-2', tier: 't2', feeds: ['hw4-4'],
      title: '4.2 DPO：两步闭式推导（作业要求手推一遍）',
      deliverable: 'DPO 损失的实现 + 在参考点上与解析解的一致性验证',
      check: {
        how: '在构造点上对照 DPO 损失与闭式解',
        interface: 'dpo_loss(policy_chosen, policy_rejected, ref_chosen, ref_rejected, beta) -> 标量',
        cmd: 'python graders/hw4_2_dpo.py --impl <你的实现文件路径>',
        expect: '实现值与解析值绝对差 < 1e-6；β→0 时损失趋近 ln2（与理论一致）',
        pitfall: '参考项符号写反：等价于把偏好反过来奖励，训练会朝反方向推',
        grader: 'graders/hw4_2_dpo.py',
      },
    },
    {
      id: 'hw4-3', tier: 't2', feeds: ['hw4-4'],
      title: '4.3 RLVR 与 GRPO：奖励可验证时的做法',
      deliverable: '一个可判分的 verifier + 组内归一化的优势计算',
      check: {
        how: '核对判分器对样例集的准确率，以及组内优势的归一化性质',
        interface: 'verify(answer, gold) -> bool；grpo_advantage(rewards[G]) -> 同形状',
        cmd: 'python graders/hw4_3_grpo.py --impl <你的实现文件路径>',
        expect: '对样例集判分准确率 = 1.0；每组优势均值≈0、标准差≈1；组内奖励全同则该组优势全为 0',
        pitfall: '优势只做中心化没除标准差；或全同奖励时除零，整组变成 nan',
        grader: 'graders/hw4_3_grpo.py',
      },
    },
    {
      id: 'hw4-4', tier: 't1',
      title: '4.4 编程作业',
      deliverable: 'PA4 的交付物：三条训练路线的产物、统一评测结果、人工检视记录',
      check: {
        how: '检查交付目录（sft/ dpo/ grpo/、eval.json、review.md）：三条路线产物齐备、评测数字与检视记录存在',
        cmd: 'python graders/hw4_4_accept.py --artifacts <你的交付目录>',
        expect: 'SFT / DPO / GRPO 三条路线各有 checkpoint 或训练记录；统一评测含留出集准确率；人工检视 ≥20 条',
        pitfall: '三条路线共用同一份 checkpoint：评测数字不是各自训练的产物，对比没有意义',
        grader: 'graders/hw4_4_accept.py',
      },
    },
  ]),

  /* ---------- 期末 · 长程 Agent ---------- */
  ...defineLessonSections('fin', [
    {
      id: 'fin-5-1', tier: 't2', feeds: ['fin-5-3'],
      title: '5.1 三个组件的接口契约',
      deliverable: '环境 schema 实例 + 10–20 道可判分的题目',
      check: {
        how: '校验环境目录（schema.json / tasks.jsonl / LEAKAGE.md）：必填字段、题目数量与 id 唯一、verifier 可定位、泄露审计齐备',
        cmd: 'python graders/fin_5_1_env.py --env <你的环境目录>',
        expect: 'schema 必填字段齐备；题目数量在 10–20；verifier 文件存在；有数据泄露审计说明',
        pitfall: '题目堆到 25 道，或 verifier 路径写死在容器里——换台机器就找不到判分入口',
        grader: 'graders/fin_5_1_env.py',
      },
    },
    {
      id: 'fin-5-2', tier: 't2', feeds: ['fin-5-3'],
      title: '5.2 Harness 主循环',
      deliverable: 'harness 实现 + 至少一条可回放的轨迹',
      check: {
        how: '校验轨迹文件：initial_observation 齐备、步号从 0 连续、每步有 action/observation/reward、done 只在最后一步',
        cmd: 'python graders/fin_5_2_harness.py --traj <你的轨迹文件>',
        expect: '轨迹含逐步的 action/observation/reward；可从起点重放；终止步与 max_steps 自洽',
        pitfall: '只记了终止步的理由，中间步没有 observation：轨迹无法回放，也无法做失败归因',
        grader: 'graders/fin_5_2_harness.py',
      },
    },
    {
      id: 'fin-5-3', tier: 't1',
      title: '5.3 编程作业',
      deliverable: 'FINAL 的交付物：可验证环境、harness 与轨迹、self-judge 对比报告、judge 校准报告',
      check: {
        how: '检查交付目录：四类产物齐备，对比报告含前后通过率数字',
        cmd: 'python graders/fin_5_3_accept.py --artifacts <你的交付目录>',
        expect: '环境与轨迹齐备；对比报告含 "self-judge 前后通过率"具体数字；校准报告给出 judge 的混淆矩阵或等价指标',
        pitfall: '对比报告只有结论没有前后数字，或校准报告只写"效果不错"——两条都拿不出可核对的证据',
        grader: 'graders/fin_5_3_accept.py',
      },
    },
  ]),
]

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map(s => [s.id, s]))

export const SECTIONS_BY_LESSON = SECTIONS.reduce((m, s) => {
  (m[s.lessonId] ||= []).push(s)
  return m
}, {})

/* 节级检查登记为课级验收项（design D4）：沿用同一份本机状态与事件 */
export const sectionCheckId = sectionId => `${sectionId}-check`

export const sectionCheckItems = lessonId =>
  (SECTIONS_BY_LESSON[lessonId] || []).map(s => ({
    id: sectionCheckId(s.id),
    text: `自检通过：${s.title}`,
  }))
