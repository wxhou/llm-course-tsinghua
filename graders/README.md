# graders

每个节的可执行检查入口。站点把"这一节学完凭什么算学完"写成一句可复制的命令，命令就跑这里的脚本。

## 约定

- 入口：`python graders/<name>.py [--artifact <你的产物>]`，只用标准库 + 本机已装依赖（`torch` / `numpy`）。
- 退出码即判定：`0` 通过、`1` 不通过、`2` 输入缺失无法判定。
- 单行输出：`PASS: …` / `FAIL: …` / `ERROR: …`，后面跟一句原因。
- 只**消费**读者产出的东西（词表、实现文件、报告、轨迹、JSON 答案），不替读者训练。
- 每个 grader 都支持 `--self-test`：进程内造一份合法产物断言判为通过，再造一份损坏产物断言判为不通过。这样判定逻辑本身可以被核对，不需要先交出产物。

```bash
python graders/hw1_1_bpe.py --self-test
# PASS: self-test —— 合法产物通过、损坏产物不通过
```

## 清单

| grader | 节 | 判定什么 |
| --- | --- | --- |
| `hw1_1_bpe.py` | 1.1 Tokenization | 词表可逆、有压缩、词表大小对得上 |
| `hw1_2_causal.py` | 1.2 Transformer 块 | 未来 token 不影响历史位置（因果性） |
| `hw1_3_xent.py` | 1.3 训练目标与损失 | 交叉熵与 `F.cross_entropy` 对拍，大 logit 不溢出 |
| `hw1_4_shapes.py` | 1.4 参考实现 | 前向形状稳定、自报参数量等于实际参数量 |
| `hw1_5_smoke.py` | 1.5 编程作业 | 40 步 smoke：loss 下降、同 seed 可复现 |
| `hw2_1_io.py` | 2.1 IO 视角 | 四项 HBM 读写量与解析式一致 |
| `hw2_2_online.py` | 2.2 Online Softmax | 与一次性 softmax 一致、分块无关、不溢出 |
| `hw2_3_kernel_report.py` | 2.3 Triton 参考实现 | 三种尺寸 × fp16 的误差记录达标 |
| `hw2_4_bench_discipline.py` | 2.4 性能实验方法学 | benchmark 脚本四项纪律齐备 |
| `hw2_5_accept.py` | 2.5 编程作业 | 对拍、OOM 分界、归因三段齐备 |
| `hw3_1_pipeline.py` | 3.1 数据管线 | 过滤只减不增、各项计数与总减少量自洽 |
| `hw3_2_scaling.py` | 3.2 Scaling Law | 重拟合 α/R² 与报告一致 |
| `hw3_3_lsq.py` | 3.3 自己的拟合 | 手写最小二乘与 numpy 一致 |
| `hw3_4_accept.py` | 3.4 编程作业 | 六档扫描 + 拟合 + 四段式报告 |
| `hw4_1_kl.py` | 4.1 KL 约束 | β 扫描的偏移与闭式解一致、单调 |
| `hw4_2_dpo.py` | 4.2 DPO | 损失与闭式解一致、β→0 极限正确 |
| `hw4_3_grpo.py` | 4.3 RLVR / GRPO | 判分准确率、组内优势均值 0 标准差 1 |
| `hw4_4_accept.py` | 4.4 编程作业 | 三条路线产物、统一评测、人工检视 |
| `fin_5_1_env.py` | 5.1 接口契约 | schema、题目数、verifier、泄露审计 |
| `fin_5_2_harness.py` | 5.2 Harness | 轨迹可回放、终止条件自洽 |
| `fin_5_judge.py` | 5.3 Self-judge 与判定校准 | 混淆矩阵与一致率自洽、样本量与阈值达标 |
| `fin_5_3_accept.py` | 5.4 编程作业 | 四类产物齐备、通过率与校准数字存在 |

## 新增一个节

1. 在 `src/content/sections.js` 里给所在课加一条节声明（`deliverable` 与 `check` 五个字段都必填）。
2. 在 `src/content/part1.jsx` / `part2.jsx` 里用 `<Section id="…">` 包住正文。
3. 写对应的 grader，跑通 `--self-test`，把 `check.grader` 指过去。
4. `npm run check:content`：它会核对正文与节数据一一对应，并确认 grader 文件存在。
