/* 全站 Checklist 注册表：单一事实源。内容文件从这里导入，进度统计（Progress/Sidebar）以本表 × localStorage 计算。
   debt: 数组含 JSX 故为 .jsx；新增章节时把对应 CHECK 数组移入本文件并在 CHECKS 登记。 */

export const HW1_CHECK = [
  { id: 'hw1-1', text: <>环境就绪；clone <code>karpathy/nanoGPT</code> 与 <code>jingyaogong/minimind</code>（61.8K★，26M→0.5B 全档可复现，中文文档）</> },
  { id: 'hw1-2', text: '数据：1–5GB 中文语料清洗为纯文本，统计 token 数与字符数比例' },
  { id: 'hw1-3', text: <>Tokenizer：跑通 <code>minbpe</code>；用自己的语料训练一个 2048 词表的 BPE，检查高频中文词是否成 token</> },
  { id: 'hw1-4', text: '模型：合上电脑默写 Transformer 块 → 对照 minGPT model.py 逐行订正 → 解释每一行的 shape' },
  { id: 'hw1-5', text: '训练：overfit 单 batch（loss→≈0）；全量训练 0.1B（~2B token），盯 loss 曲线与梯度范数' },
  { id: 'hw1-6', text: '采样：实现 temperature / top-k / top-p 三种解码，与 base model 对话，记录"接话不听话"的例子' },
  { id: 'hw1-7', text: '实验记录：2–3 组不同 (n_layer, d) 配置的 loss 曲线，按 Problem/Motivation/Method/Results 四段写' },
]

export const HW2_CHECK = [
  { id: 'hw2-1', text: <>跑通 <a href="https://triton-lang.org/main/getting-started/tutorials/06-fused-attention.html" target="_blank" rel="noreferrer">Triton tutorial 06</a>，画出它的 block 迭代结构</> },
  { id: 'hw2-2', text: '从零写两个 kernel：naive（落完整 T×T 矩阵）与分块 + online softmax 版' },
  { id: 'hw2-3', text: '数值对拍 torch SDPA（fp16, atol=1e-2）通过' },
  { id: 'hw2-4', text: 'benchmark：T∈{512…8192} × 三种实现，画吞吐与显存双图' },
  { id: 'hw2-5', text: '结论按四段式写：性能差距的瓶颈归因（计算 or 显存带宽）' },
]

export const HW3_CHECK = [
  { id: 'hw3-1', text: <>跑通 fineweb 的 datatrove 管线，从 <a href="https://huggingface.co/datasets/HuggingFaceFW/fineweb" target="_blank" rel="noreferrer">sample-10BT</a> 取 1/10 起步</> },
  { id: 'hw3-2', text: '对比实验：同一 26M 模型分别用未过滤/过滤后语料各训 1B token，对比 loss 与下游小任务' },
  { id: 'hw3-3', text: '6 档参数量扫描（26M→0.1B，log 均匀），每档喂相同 token 数，得到自己的 loss–N 数据点' },
  { id: 'hw3-4', text: 'log 空间最小二乘拟合幂律，报告 α 与拟合优度 R²，用本站演示器校验形状' },
  { id: 'hw3-5', text: '按 Problem/Motivation/Method/Results 四段写实验报告（含拟合置信区间）' },
]

export const HW4_CHECK = [
  { id: 'hw4-1', text: '冻结同一 base（26M–0.1B），构建 200 题同一任务的评测集 + 留出集' },
  { id: 'hw4-2', text: '路线 A：TRL SFTTrainer 跑 SFT（同数据做 DPO 的 chosen 侧）' },
  { id: 'hw4-3', text: '路线 B：SFT checkpoint 接 DPOTrainer' },
  { id: 'hw4-4', text: '路线 C：EasyR1/verl 跑 GRPO（判分器 = 答案精确匹配）' },
  { id: 'hw4-5', text: '统一评测：留出集准确率 + 20 条人工检视 + 训练曲线三线对比图' },
  { id: 'hw4-6', text: '四段式结论：哪条路赢、在什么数据条件下会换赢家' },
]

export const FIN_CHECK = [
  { id: 'fin-1', text: 'W1–2：以考生身份跑通 SWE-bench Lite / Terminal-Bench（harbor），理解环境接口' },
  { id: 'fin-2', text: 'W3–4：自建迷你可验证环境（10–20 题"修测试"仓库集），定义状态/动作/判分 JSON schema' },
  { id: 'fin-3', text: 'W5–6：harness（API + read/edit/bash 工具 + 循环 + 轨迹日志）跑通零样本基线' },
  { id: 'fin-4', text: 'W7–8：self-judge 回路接入，量化通过率提升' },
  { id: 'fin-5', text: 'W9+：环境判分接入 GRPO 做 RLVR 训练，对比训练前后——期末完整版' },
]

/* 按存储前缀分组（与 routes.js NAV 的 prefix 一致：final→fin） */
export const CHECKS = {
  hw1: HW1_CHECK,
  hw2: HW2_CHECK,
  hw3: HW3_CHECK,
  hw4: HW4_CHECK,
  fin: FIN_CHECK,
}

/* 全量扁平清单（进度总数 = 28） */
export const ALL_ITEMS = Object.values(CHECKS).flat()
