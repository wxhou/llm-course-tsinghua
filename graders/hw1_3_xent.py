"""1.3 · 交叉熵对拍：读者实现的 cross_entropy 与 F.cross_entropy 在多个探针点上一致，且大 logit 下不溢出。

产物契约：实现文件导出 `cross_entropy(logits, targets)`：logits 形状 [B,V]，targets 形状 [B]（int64），返回标量均值。
"""

import argparse
import importlib.util

import torch
import torch.nn.functional as F

from _lib import need, report, run_self_test, self_test_requested

PROBES = 8


def _load(path):
    spec = importlib.util.spec_from_file_location("reader_xent", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return getattr(mod, "cross_entropy", None)


def judge(art):
    try:
        fn = _load(art["impl"])
    except Exception as e:
        return False, f"实现文件导入失败：{type(e).__name__}: {e}"
    if fn is None:
        return False, "实现文件没有导出 cross_entropy(logits, targets)"

    torch.manual_seed(0)
    worst = 0.0
    for _ in range(PROBES):
        logits = torch.randn(16, 32)
        targets = torch.randint(0, 32, (16,))
        try:
            got = torch.as_tensor(fn(logits, targets)).reshape(-1)
        except Exception as e:
            return False, f"cross_entropy 调用失败：{type(e).__name__}: {e}"
        if got.numel() != 1:
            return False, f"应返回标量，实际返回 {got.numel()} 个值"
        want = F.cross_entropy(logits, targets)
        diff = abs(got.item() - want.item())
        worst = max(worst, diff)
        if diff >= 1e-6:
            return False, f"与 F.cross_entropy 不一致：差 {diff:.3e}（探针 {_ + 1}/{PROBES}）"

    # 数值稳定性：朴素 exp 实现在这里会溢出成 inf/nan，正解要减 running max
    big = torch.randn(8, 32) * 200
    big_t = torch.randint(0, 32, (8,))
    try:
        got = float(torch.as_tensor(fn(big, big_t)).reshape(-1)[0])
    except Exception as e:
        return False, f"大 logit 下调用失败：{type(e).__name__}: {e}"
    if not torch.isfinite(torch.tensor(got)):
        return False, "大 logit 下结果不是有限值（缺少 log-sum-exp 稳定化）"
    want = F.cross_entropy(big, big_t).item()
    if abs(got - want) >= 1e-3:
        return False, f"大 logit 下偏离参考值：{got:.4f} vs {want:.4f}"

    return True, f"{PROBES} 个探针最大差 {worst:.1e}；大 logit 下稳定（{got:.3f}）"


GOOD_SRC = """
import torch
def cross_entropy(logits, targets):
    logp = torch.log_softmax(logits, dim=-1)
    return -logp.gather(1, targets[:, None]).mean()
"""

BAD_SRC = """
import torch
def cross_entropy(logits, targets):
    # 朴素实现：没有减最大值，大 logit 下 exp 溢出
    p = torch.exp(logits)
    p = p / p.sum(dim=-1, keepdim=True)
    return -torch.log(p.gather(1, targets[:, None])).mean()
"""


def _write(tmp, src, name):
    path = f"{tmp}/{name}.py"
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    return path


def make_good(tmp):
    return {"impl": _write(tmp, GOOD_SRC, "xent_good")}


def make_bad(tmp):
    return {"impl": _write(tmp, BAD_SRC, "xent_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--impl", required=True)
    args = ap.parse_args()
    need(args.impl, "实现文件")
    ok, msg = judge({"impl": args.impl})
    report(ok, msg)
