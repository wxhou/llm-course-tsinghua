"""4.2 · DPO 损失对拍：实现的损失与闭式解逐点一致。

闭式解：L = −log σ(β·[(log π_c − log π_r) − (log π_ref_c − log π_ref_r)])，对一个 batch 取均值。
产物契约：实现文件导出 `dpo_loss(policy_chosen, policy_rejected, ref_chosen, ref_rejected, beta)` → 标量。
"""

import argparse
import importlib.util
import math

import numpy as np
import torch

from _lib import need, report, run_self_test, self_test_requested

PROBES = 8


def _want(pc, pr, rc, rr, beta):
    margin = np.asarray(pc) - np.asarray(pr) - (np.asarray(rc) - np.asarray(rr))
    z = beta * margin
    # −logσ(z) = log(1 + e^{−z})，用 logaddexp 保持数值稳定
    return float(np.logaddexp(0.0, -z).mean())


def judge(art):
    spec = importlib.util.spec_from_file_location("reader_dpo", art["impl"])
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception as e:
        return False, f"实现文件导入失败：{type(e).__name__}: {e}"
    fn = getattr(mod, "dpo_loss", None)
    if fn is None:
        return False, "实现文件没有导出 dpo_loss(...)"

    rng = np.random.default_rng(5)
    for i in range(PROBES):
        n = 8
        pc = rng.standard_normal(n) - 1.0
        pr = rng.standard_normal(n) - 1.5
        rc = rng.standard_normal(n) - 1.0
        rr = rng.standard_normal(n) - 1.0
        beta = float(rng.choice([0.01, 0.1, 0.5, 2.0]))
        args = [torch.tensor(v, dtype=torch.float64) for v in (pc, pr, rc, rr)]
        try:
            got = float(torch.as_tensor(fn(*args, beta)).reshape(-1)[0])
        except Exception as e:
            return False, f"dpo_loss 调用失败：{type(e).__name__}: {e}"
        want = _want(pc, pr, rc, rr, beta)
        if abs(got - want) >= 1e-6:
            return False, f"探针 {i + 1}：得到 {got:.6f}，闭式解 {want:.6f}（差 {abs(got - want):.2e}）"

    # β 很小时偏好几乎不参与，损失应接近 ln2
    n = 8
    z = np.zeros(n)
    got = float(torch.as_tensor(fn(*[torch.tensor(z) for _ in range(4)], 1e-9)).reshape(-1)[0])
    if not math.isfinite(got) or abs(got - math.log(2)) > 1e-4:
        return False, f"β→0 时损失为 {got}，应趋近 ln2≈{math.log(2):.4f}"

    return True, f"{PROBES} 个探针与闭式解一致（<1e-6）；β→0 极限正确"


GOOD_SRC = """
import torch
import torch.nn.functional as F
def dpo_loss(policy_chosen, policy_rejected, ref_chosen, ref_rejected, beta):
    margin = (policy_chosen - policy_rejected) - (ref_chosen - ref_rejected)
    return -F.logsigmoid(beta * margin).mean()
"""

BAD_SRC = """
import torch
import torch.nn.functional as F
def dpo_loss(policy_chosen, policy_rejected, ref_chosen, ref_rejected, beta):
    # 符号反了：把参考项的差减反，等价于偏好被奖励反转
    margin = (policy_chosen - policy_rejected) + (ref_chosen - ref_rejected)
    return -F.logsigmoid(beta * margin).mean()
"""


def _write(tmp, src, name):
    path = f"{tmp}/{name}.py"
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    return path


def make_good(tmp):
    return {"impl": _write(tmp, GOOD_SRC, "dpo_good")}


def make_bad(tmp):
    return {"impl": _write(tmp, BAD_SRC, "dpo_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--impl", required=True)
    args = ap.parse_args()
    need(args.impl, "实现文件")
    ok, msg = judge({"impl": args.impl})
    report(ok, msg)
