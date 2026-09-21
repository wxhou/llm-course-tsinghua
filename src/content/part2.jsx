import { M, MB, CodeBlock, Callout, Assignment, Star, Refs, ChapterHead } from '../lib/ui.jsx'
import ScalingLawDemo from '../demos/ScalingLawDemo.jsx'
import { Checklist } from '../components/Progress.jsx'
import { HW3_CHECK, HW4_CHECK, FIN_CHECK } from './registry.jsx'

/* ============ HW3 ============ */

export function HW3() {
  return (
    <section id="hw3">
      <ChapterHead
        kicker="HW3 · DATA & SCALING" no="03"
        title="数据管线与 Scaling Law"
        oneliner="大模型 90% 的工作其实是洗数据——这一章教你把脏网页变成干净教材，并用一套方法回答『钱包有限，该先买参数还是先买数据』。"
        lead="目标：掌握工业界 LLM 团队占比最大的两件事——把原始网页变成可用语料的工程，以及用统计方法回答'预算该堆参数还是堆数据'。"
        hours="14–18h" prereq="HW1 的训练脚本可复用"
      />
      <h3>3.1 数据管线：每一步都在去"毒"</h3>
      <table>
        <thead><tr><th>步骤</th><th>做什么</th><th>为什么必须做</th><th>工具</th></tr></thead>
        <tbody>
          <tr><td>提取</td><td>HTML → 正文</td><td>模板文本会让模型学会生成导航栏</td><td>trafilatura / resiliparse</td></tr>
          <tr><td>启发式过滤</td><td>长度、符号率、语言置信度</td><td>廉价信号先筛掉 60%+</td><td>规则</td></tr>
          <tr><td>模型过滤</td><td>教育价值分类器打分</td><td>质量信号，fineweb-edu 核心创新</td><td>小模型 + 阈值</td></tr>
          <tr><td>去重</td><td>精确 + MinHash/LSH 模糊去重</td><td>网页重复率极高；重复导致记忆与梯度偏置</td><td>datasketch</td></tr>
          <tr><td>去污</td><td>n-gram 匹配剔除基准测试文本</td><td>评测污染会让你的 benchmark 虚高</td><td>n-gram 索引</td></tr>
        </tbody>
      </table>
      <CodeBlock file="minhash_dedup.py · LSH 近邻去重核心" lang="python" highlight={[12, 13]}>
{`from datasketch import MinHash, MinHashLSH

def sig(text, num_perm=128, k=5):
    shingles = {tuple(text[i:i+k]) for i in range(0, len(text) - k, k)}
    m = MinHash(num_perm=num_perm)
    for s in shingles:
        m.update(''.join(s).encode('utf-8'))
    return m

lsh = MinHashLSH(threshold=0.8, num_perm=128)
keep = {}
for doc_id, text in corpus.items():
    m = sig(text)
    if not lsh.query(m):          # 已有近邻 => 重复，丢弃
        lsh.insert(doc_id, m)
        keep[doc_id] = text`}
      </CodeBlock>
      <Callout type="int" title="Har：上亿网页两两比对不现实，MinHash 用概率近似省了什么？">
        <p>两个集合的 MinHash 签名逐位相等的概率 = Jaccard 相似度。128 个置换给出 128 维签名，位比较代替集合比较，<M>{'O(|A|+|B|)'}</M> 的相似度判定变成 <M>{'O(128)'}</M>；LSH 分桶把成对比较从 <M>{'N^2'}</M> 降到近邻数量级。</p>
      </Callout>
      <h3>3.2 Scaling Law：从经验曲线到预算决策</h3>
      <Callout type="thm" title="Chinchilla 定律：参数和数据要按比例一起涨">
        <p><b>参数化</b>：<M>{'L(N,D)=E+A/N^{\beta}+B/D^{\gamma}'}</M>；对算力 <M>{'C\approx 6ND'}</M>，最优配比满足 <M>{'N_{\text{opt}}\propto C^{a},\ D_{\text{opt}}\propto C^{b}'}</M>，实证 <M>{'a\approx b\approx 0.5'}</M>——即 <b>参数与数据应等比增长</b>，经验法则每参数 20 token。GPT-3（175B/300B）按此标准欠训约一个数量级。</p>
      </Callout>
      <ScalingLawDemo />
      <h3>3.3 你自己的拟合：log 空间最小二乘</h3>
      <p>单变量形式 <M>{'L(N)=E+A/N^{\alpha}'}</M>。取对数后非线性部分只余截距：</p>
      <MB>{String.raw`\log(L(N)-E)=\log A-\alpha\,\log N \;\xrightarrow{\ E\ \text{固定}\ }\ \text{对 }(\log N,\ \log(L-E))\text{ 做线性回归}`}
      </MB>
      <p><M>{'E'}</M> 不可直接观测——实操是网格搜索 <M>{'E'}</M>，取使线性回归 <M>{'R^2'}</M> 最高的那个；报告时必须给出 <M>{'\alpha'}</M> 的置信区间（对回归系数做 t 检验即可）。迷你实验 6 个点只够"验证幂律形状成立"，别对外宣称精确系数。</p>
      <h3>3.4 编程作业</h3>
      <Assignment
        title="PA3 · 数据质量消融 + 迷你 Scaling Law"
        difficulty={3} estHours="12–16h" prereq="3.1–3.3；HW1 训练脚本"
        deliverables={[
          '去重管线代码 + 去重率统计（重复 token 占比）',
          '数据质量消融：raw vs filtered 各训一个 26M，同 token 数',
          '6 档参数量 × 相同 token 的扫描数据 + 拟合曲线（含 R² 与 α 置信区间）',
        ]}
        accept={[
          '质量消融给出定量结论：filtered 使同 token loss 降低 ≥0.05（或等效 PPL 降幅），并解释与 fineweb 论文结论的一致/差异',
          '拟合 R² ≥ 0.98，α 落在 0.2–0.5 区间且能解释偏离文献值的原因（数据域/分词器/训练步数）',
          '报告按四段式，Results 一节必须包含"如果预算翻倍你会怎么花"的决策推演',
        ]}
        hints={[
          '控制变量优先：所有点用同一 tokenizer、同一数据、同一 warmup/调度，只变参数量。',
          '拟合不理想时先查最大的那个点——0.1B 训练不足会整体抬曲线尾巴，宁可少一个点也不要一个欠训点。',
          '质量消融的"下游小任务"可用简单的 next-token 分类探针，不必搭完整 eval 框架。',
        ]}
      />
      <h3>3.5 进阶思考题</h3>
      <Star diff={2} title="Llama 系列'训过头'（远超 Chinchilla 最优 token 数）为什么在推理经济学上是理性决策？">
        Chinchilla 最优化的是<b>训练算力</b>；部署成本由 <M>{'C_{\text{infer}}\propto N'}</M> 主导。"小参数 × 多数据"用一次性训练算力换终身推理成本——当模型服务量大时（Llama 的下载量级），这笔交换严格划算。Scaling law 给的是约束，不是目标函数；目标函数取决于训练/推理成本比。
      </Star>
      <Star diff={3} title="数据配比问题（domain weighting）为什么不能靠网格搜索？DoReMi 的思路是什么？">
        网格搜索每配比都要训一个模型，成本不可承受；且最优配比随规模漂移。DoReMi 训一组小 domain experts，用组间 KL 作为代理信号在线调整配比——把"哪个域值得多喂"变成轻量的分布优化。思考：这种 proxy 在你的 26M 实验里可以直接验证。
      </Star>
      <Checklist items={HW3_CHECK} />
      <h3>资源</h3>
      <div className="res-grid">
        <div className="res"><b>fineweb / datatrove</b><span className="why">数据管线参考实现，PA3 的工程底座。</span><span className="meta">HF Hub · HuggingFaceFW/fineweb</span></div>
        <div className="res"><b>fineweb-edu 论文</b><span className="why">教育价值分类器 + 消融方法学，质量过滤的范本。</span><span className="meta">arXiv 2406.17557</span></div>
      </div>
      <Refs items={[
        { text: 'Kaplan et al. Scaling Laws for Neural Language Models. 2020.', href: 'https://arxiv.org/abs/2001.08361' },
        { text: 'Hoffmann et al. Training Compute-Optimal Large Language Models (Chinchilla). 2022.', href: 'https://arxiv.org/abs/2203.15556' },
        { text: 'Penedo et al. The FineWeb Datasets. 2024.', href: 'https://arxiv.org/abs/2406.17557' },
        { text: 'Xie et al. DoReMi: Optimizing Data Mixtures Speeds Up Language Model Pretraining. 2023.', href: 'https://arxiv.org/abs/2305.10429' },
      ]} />
    </section>
  )
}

/* ============ HW4 ============ */

export function HW4() {
  return (
    <section id="hw4">
      <ChapterHead
        kicker="HW4 · POST-TRAINING" no="04"
        title="SFT / DPO / RLVR：统一视角下的三条路"
        oneliner="会续写不等于会听话——这一章用三条不同的训练路线，把一个『会接话』的模型教成『听指令』的助手。"
        lead="目标：不只背结论，而是从同一个 KL 约束 RL 目标推出三种算法——理解它们是同一问题的不同近似，差别只在'信号从哪来'。"
        hours="14–18h" prereq="HW1 的 base model；概率论（KL 散度）"
      />
      <h3>4.1 统一出发点：KL 约束的奖励最大化</h3>
      <Callout type="thm" title="三条后训练路线，出发去同一个地方">
        <MB>{String.raw`\max_{\pi}\ \mathbb{E}_{x\sim\mathcal{D},\,y\sim\pi(\cdot|x)}\big[r(x,y)\big]\;-\;\beta\,\mathbb{D}_{\mathrm{KL}}\big[\pi(\cdot|x)\,\|\,\pi_{\text{ref}}(\cdot|x)\big]`}
        </MB>
        <p>奖励 <M>{'r'}</M> 的来源决定了路线：人类标注训出的奖励模型（RLHF）、偏好对（DPO 的隐式奖励）、可验证判分器（RLVR）。<M>{'\beta'}</M> 是不偏离 base 的拉力——三种方法共享它。</p>
      </Callout>
      <h3>4.2 DPO：两步闭式推导（作业要求手推一遍）</h3>
      <p><b>第一步</b>：上述目标的 optimal policy 有闭式解，反解奖励：</p>
      <MB>{String.raw`p^*(y|x)=\frac{1}{Z(x)}\pi_{\text{ref}}(y|x)\,e^{r(x,y)/\beta}\;\Longleftrightarrow\;r(x,y)=\beta\log\frac{p^*(y|x)}{\pi_{\text{ref}}(y|x)}+\beta\log Z(x)`}
      </MB>
      <p><b>第二步</b>：把 <M>{'p^*'}</M> 代回 Bradley-Terry 偏好模型 <M>{'P(y_w\succ y_l)=\sigma(r(y_w)-r(y_l))'}</M>——配分函数 <M>{'\log Z(x)'}</M> 在偏好差中<b>相消</b>，得 DPO 损失：</p>
      <MB>{String.raw`\mathcal{L}_{\text{DPO}}=-\log\sigma\!\Big(\beta\big[\underbrace{(\log \pi_\theta(y_w|x)-\log \pi_{\text{ref}}(y_w|x))}_{\text{win 的 log-prob 增益}}-\underbrace{(\log \pi_\theta(y_l|x)-\log \pi_{\text{ref}}(y_l|x))}_{\text{lose 的}}\big]\Big)`}
      </MB>
      <Callout type="int" title="这个公式读完了，它在告诉你什么？">
        <p>① DPO 不是"绕过 RL"，是把 RL 解的闭式形式直接当损失；② <M>{'\beta'}</M> 越小越敢偏离参考模型（也越容易崩）；③ 它优化的是<b>似然差</b>，对 lose 侧的唯一约束是"压下去"——这就是为什么 DPO 后生成多样性常下降、以及为什么先 SFT 把分布收拢再 DPO 才稳。</p>
      </Callout>
      <h3>4.3 RLVR 与 GRPO：奖励可验证时的做法</h3>
      <p>奖励来自判分器（测试通过 / 答案匹配 / 格式合规）。GRPO 省掉 critic：对同一 prompt 采 <M>{'K'}</M> 个回答，用组内均值当 baseline：</p>
      <MB>{String.raw`A_i=\frac{r_i-\mathrm{mean}(r_{1:K})}{\mathrm{std}(r_{1:K})+\epsilon},\qquad \mathcal{L}=-\mathbb{E}\Big[\min\big(\rho_iA_i,\ \text{clip}(\rho_i,1\pm\epsilon)A_i\big)\Big]`}
      </MB>
      <Callout type="warn" title="模型会比作弊者更快找到判分器的漏洞（Reward Hacking）">
        <p>判分器一旦有洞，策略一定找到并无限利用：答案匹配判分器会被"输出答案串但过程垃圾"攻破；测试判分器会被硬编码期望输出攻破。对策：判分器多样化 + 定期人工审计高分样本。你会在 PA4 里亲手见到一次 hacking——这是本作业最重要的体验。</p>
      </Callout>
      <h3>4.4 编程作业</h3>
      <Assignment
        title="PA4 · 同一 Base 三条路线受控对比"
        difficulty={4} estHours="12–16h" prereq="4.1–4.3"
        deliverables={[
          '200 题任务集（含 40 题留出）+ 三个路线的训练配置',
          '三条路线的留出集准确率 + 训练曲线对比图',
          '一次 reward hacking 的实例记录与修复',
        ]}
        accept={[
          '三条路线唯一的自由变量是算法本身（数据同源、评测同集、超参搜索预算相同）',
          '结论回答：胜负是否随数据量变化？（建议 100/200/400 三档各跑 SFT/DPO）',
          '手推 DPO 推导（4.2）拍照附在报告附录',
          'hacking 实例能指认判分器的具体漏洞与修复方式',
        ]}
        hints={[
          'GRPO 在 26M 模型上也能跑，只是采样开销大——K=4、短生成长度即可起步。',
          'DPO 训崩的第一症状是 win 侧似然也狂跌：查 β（通常 0.1）与参考模型是否正确冻结。',
          '造一个必然被 hack 的判分器（如只查关键词）是体验 hacking 最快的方式， deliberately 做一次。',
        ]}
      />
      <h3>4.5 进阶思考题</h3>
      <Star diff={2} title="IPO 指出 DPO 的什么失败模式？数学上改了哪一项？">
        DPO 的 logistic 损失在可分数据上会驱使 <M>{'\pi_\theta(y_w)'}</M> 无限上升、<M>{'\pi_\theta(y_l)'}</M> 无限下降，过拟合偏好对。IPO 把损失改为对偏好边际的<b>平方回归</b> <M>{'(\log(\pi_w/\pi_{\text{ref}})-\log(\pi_l/\pi_{\text{ref}})-2\beta\gamma)^2'}</M>——目标从"拉到无穷"变成"收敛到有限边际 <M>{'2\beta\gamma'}</M>"。
      </Star>
      <Star diff={3} title="RLVR 中，如果判分器噪声率为 p（p 概率给错分），GRPO 的组内基线为什么比绝对奖励更稳？">
        组内基线只依赖同 prompt 内的<b>相对序</b>；独立噪声在取均值时部分抵消，且 std 归一进一步压制噪声尺度。但当 <M>{'p'}</M> 高到改变组内排序时，优势方向出错且无自检机制——所以工程上"判分器置信度"应进入采样策略（低置信样本不进梯度）。
      </Star>
      <Checklist items={HW4_CHECK} />
      <h3>资源</h3>
      <div className="res-grid">
        <div className="res"><b><a href="https://github.com/huggingface/trl" target="_blank" rel="noreferrer">huggingface/trl</a></b><span className="why">SFT/DPO/GRPO 一个库全覆盖，PA4 主工具。</span><span className="meta">19.3K★ · 活跃</span></div>
        <div className="res"><b><a href="https://github.com/verl-project/verl" target="_blank" rel="noreferrer">verl-project/verl</a></b><span className="why">GRPO 事实标准之一；原 bytedance/verl 已迁至本组织。</span><span className="meta">23.5K★ · 活跃</span></div>
        <div className="res"><b><a href="https://github.com/hiyouga/EasyR1" target="_blank" rel="noreferrer">hiyouga/EasyR1</a></b><span className="why">verl 生态轻量 GRPO，小模型入门首选。</span><span className="meta">5.2K★</span></div>
      </div>
      <Refs items={[
        { text: 'Rafailov et al. Direct Preference Optimization (DPO). NeurIPS 2023.', href: 'https://arxiv.org/abs/2305.18290', note: '4.2 推导的原始出处' },
        { text: 'Azar et al. A General Theoretical Paradigm (IPO). 2023.', href: 'https://arxiv.org/abs/2310.12036' },
        { text: 'Shao et al. DeepSeekMath (GRPO 出处). 2024.', href: 'https://arxiv.org/abs/2402.03300', note: '§4 GRPO 设计' },
        { text: 'Lambert et al. Tülu 3 (RLVR 系统化实践). 2024.', href: 'https://arxiv.org/abs/2411.15124' },
      ]} />
    </section>
  )
}

/* ============ 期末 ============ */

export function Final() {
  return (
    <section id="final">
      <ChapterHead
        kicker="FINAL PROJECT · 60%" no="05"
        title="长程 Agent：可验证环境 + Harness + Self-judge"
        oneliner="前面四章攒下的零件，这一章拼成一个能自己修 bug 的 AI 助手——并给它配一个公平的考试场和裁判。"
        lead="四格作业的汇合点：HW1 给你模型、HW2 给你算子直觉、HW3 给你数据方法学、HW4 给你训练算法——期末把它们拼成一个会干活的系统，并且训练它。"
        hours="40h+" prereq="HW1–HW4 全部完成"
      />
      <h3>5.1 三个组件的接口契约</h3>
      <CodeBlock file="env_schema.json · 可验证环境的最小契约" lang="json">
{`{
  "task_id": "fix-bug-0007",
  "observation": { "files": ["repo/**"], "test_output": "...", "issue_text": "..." },
  "actions": ["read", "edit", "bash"],
  "termination": { "max_steps": 30, "verifier": "pytest tests/ -x" },
  "reward": { "type": "binary", "pass": 1.0, "fail": 0.0, "partial": false }
}`}
      </CodeBlock>
      <p>关键设计决策都在这张 schema 里：<M>{'\text{partial}'}</M> 是否允许（稠密奖励好训但易被 hack）、<M>{'\text{max_steps}'}</M> 设多少（决定"长程"到什么程度）、verifier 是否防泄漏（测试本身可能被 agent 改掉——所以真实验收要在<b>另一份</b>隐藏测试上跑）。</p>
      <h3>5.2 Harness 主循环</h3>
      <CodeBlock file="harness.py · agent loop 骨架" lang="python" highlight={[9, 10, 11, 12]}>
{`def run_episode(env, policy, judge=None, traj=None):
    obs, info = env.reset()
    traj = traj or []
    for step in range(env.max_steps):
        action = policy(obs, traj)                 # LLM: obs+历史 -> 工具调用
        obs, reward, done, info = env.step(action)
        traj.append((action, obs, reward))
        if done:
            break
    if judge is not None:                          # self-judge 回路
        critique = judge(traj, obs)                # 模型自评: 哪里可能没过
        if critique and not env.verify():          # 不合格且有修改意见
            return run_episode(env, policy, judge, traj + [('judge', critique)])  # 带批评重试
    return env.reward(), traj`}
      </CodeBlock>
      <Callout type="warn" title="自己评自己，这两个统计学陷阱要防">
        <p><b>自我偏好</b>：同一模型既当选手又当裁判，自评分与真实通过率的相关性可能很弱——务必用留出集校准 judge 的混淆矩阵；<b>终审权归属</b>：judge 分只能当"再试一次"的触发器，最终 reward 必须来自环境的客观 verifier，否则你训练的是"讨好自己"的策略。</p>
      </Callout>
      <h3>5.3 编程作业</h3>
      <Assignment
        title="FINAL · 端到端：迷你环境 + Harness + Self-judge +（进阶）RLVR"
        difficulty={5} estHours="40h+" prereq="HW1–HW4"
        deliverables={[
          '可验证环境（10–20 题）+ 环境接口文档 + 数据泄露审计说明',
          'Harness 与轨迹数据集（每条轨迹可回放）',
          '零样本 vs self-judge 的通过率对比 + judge 校准报告',
          '（进阶）RLVR 训练前后的通过率对比与失败案例分析',
        ]}
        accept={[
          '环境判分 100% 自动可执行，且在隐藏测试上复验（防 agent 改测试）',
          '轨迹日志完整到可以从任意中间步恢复重放',
          'Results 一节给出"self-judge 使通过率从 X% 到 Y%"的主曲线（这是评分权重的核心）',
          '进阶部分：GRPO 训练曲线 + 与零样本的 gap，失败案例按 hacking/能力不足/环境 bug 三类归因',
        ]}
        hints={[
          '先造环境再写 harness：环境接口是否干净，决定了后面所有实验的可信度。',
          'judge 用另一个更强的模型 + 不同于执行的 prompt 视角，是提升校准的最低成本手段。',
          'RLVR 阶段把 reward 稀疏问题放在第一位：可以先给 partial reward（编译通过=0.2，单测部分通过=按比例），但要在报告里说明 hack 风险。',
        ]}
      />
      <h3>5.4 进阶思考题</h3>
      <Star diff={3} title="为什么'隐藏测试'是防 hacking 的必要非充分条件？还能从哪三个维度加固？">
        必要：agent 可见的测试可被直接改写或硬编码通过。非充分：agent 仍可 overfit 输入分布（特判题面样例）、或通过 side channel（修改 conftest/环境变量）。加固：输入扰动（同构新用例）、过程检查（diff 审计：测试文件的修改单独 revert）、pass@k 与 pass^k 双指标（后者衡量稳定性）。
      </Star>
      <h3>5.5 资源</h3>
      <div className="res-grid">
        <div className="res"><b><a href="https://github.com/SWE-bench/SWE-bench" target="_blank" rel="noreferrer">SWE-bench</a></b><span className="why">可验证环境标杆：真实 issue + 测试判分。</span><span className="meta">5.9K★ · 活跃</span></div>
        <div className="res"><b><a href="https://github.com/harbor-framework/harbor" target="_blank" rel="noreferrer">harbor（Terminal-Bench）</a></b><span className="why">终端任务环境；原 laude-institute/terminal-bench 已并入。</span><span className="meta">5.4K★ · 活跃</span></div>
        <div className="res"><b>SWE-agent / OpenHands</b><span className="why">harness 参照实现：工具设计、轨迹格式、重试策略。</span><span className="meta">GitHub 可查</span></div>
      </div>
      <Refs items={[
        { text: 'Jimenez et al. SWE-bench. ICLR 2024.', href: 'https://arxiv.org/abs/2310.06770' },
        { text: 'Yang et al. SWE-agent: Agent-Computer Interfaces Enable Software Engineering LMs. 2024.', href: 'https://arxiv.org/abs/2405.15793', note: 'ACI（agent-computer interface）设计原则' },
        { text: 'Shinn et al. Reflexion (self-judge 回路的思想源头之一). 2023.', href: 'https://arxiv.org/abs/2303.11366' },
      ]} />
    </section>
  )
}

/* ============ 计划 ============ */
const WEEKS = [
  ['W1 · HW1 上半', 'Zero to Hero 前三集；minbpe 跑通；BPE 演示玩透；minimind 26M 跑通。', '产出：分词器 + 训练环境'],
  ['W2 · HW1 下半', '默写+订正 Transformer 块；0.1B 训练；三种解码实现；消融实验启动。', '产出：PA1 通过'],
  ['W3 · HW2 上半', 'FlashAttention §3 + Triton tutorial 01–03；softmax kernel。', '产出：kernel 数值对拍'],
  ['W4 · HW2 下半', '分块 attention + causal mask；benchmark 双图；归因报告。', '产出：PA2 通过'],
  ['W5 · HW3 上半', 'datatrove 管线；质量消融启动（26M × 2）。', '产出：去重统计'],
  ['W6 · HW3 下半', '6 档参数量扫描；log 空间拟合；四段式报告。', '产出：PA3 通过'],
  ['W7 · HW4', '三条路线全部跑通；hacking 实验故意做一次。', '产出：PA4 通过'],
  ['W8 · 期末启动', 'SWE-bench Lite 当考生；迷你环境出题清单定稿。', '产出：环境 schema'],
]

export function Plan() {
  return (
    <section id="plan">
      <ChapterHead
        kicker="STUDY PLAN" no="06"
        title="八周学习计划"
        oneliner="别被总时长吓到——这里把整个学习过程拆成八周，每周只管向前一步，还有明确的『这周要交什么』。"
        lead="每周 8–10 小时设计，每周有明确交付物——赶项目的周可以只保住'产出'那一栏。"
        hours="W1–W8 约 64–80h；期末另需 40h+"
      />
      <div className="week-grid">
        {WEEKS.map(([t, d, out]) => (
          <div className="week" key={t}>
            <b>{t}</b><p>{d}</p>
            <p style={{ color: 'var(--green)', fontWeight: 600 }}>{out}</p>
          </div>
        ))}
      </div>
      <h3>第八周之后</h3>
      <div className="card blue">
        <p>期末项目按"先环境、再 harness、再 self-judge、最后 RLVR"的顺序推进——每一步都可独立交付。评分逻辑与课程一致：<b>Results 主曲线（self-judge 前后通过率）是核心权重</b>，Method 的可复现性次之，Problem 与 Motivation 各一票。每完成一步，用四件事各问自己一遍。</p>
      </div>
      <footer>本站为自学教学页，基于清华 KEG《高级机器学习》2026 秋作业框架的公开转述与开源社区资源重建；课程课件本身未公开。<br />数据说明：你的学习进度、主题偏好与续读位置仅保存在本机浏览器中，本站不收集、不上传任何数据。</footer>
    </section>
  )
}
