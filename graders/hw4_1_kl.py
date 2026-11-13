"""4.1 · KL 约束的偏移：β 扫描结果与两臂 bandit 的闭式解一致。

口径：两臂、奖励 r = [1, 0]、参考策略 π0 均匀。KL 约束目标的最优策略是
  p(β) ∝ π0 · exp(r/β)，即 softmax(r/β + log π0)，偏移 KL(p‖π0) 有闭式解。
产物：results.json = {"betas": [...], "kl": [...]}，两组等长，β > 0。
"""

import argparse
import json

import numpy as np

from _lib import need, report, run_self_test, self_test_requested

REWARDS = np.array([1.0, 0.0])
REF = np.array([0.5, 0.5])
TOL = 0.01


def kl_of(beta):
    z = REWARDS / beta + np.log(REF)
    p = np.exp(z - z.max())
    p /= p.sum()
    return float((p * np.log(p / REF)).sum())


def judge(art):
    with open(art["results"], encoding="utf-8") as f:
        data = json.load(f)
    try:
        betas = [float(b) for b in data["betas"]]
        kls = [float(k) for k in data["kl"]]
    except (KeyError, TypeError, ValueError) as e:
        return False, f"results.json 缺少可解析的 betas / kl：{e!r}"
    if len(betas) != len(kls):
        return False, f"betas 有 {len(betas)} 个，kl 有 {len(kls)} 个，长度不一致"
    if len(betas) < 5:
        return False, f"只扫了 {len(betas)} 个 β，至少 5 个"
    if any(b <= 0 for b in betas):
        return False, "β 必须为正"
    if not all(np.isfinite(kls)):
        return False, "kl 里出现 inf/nan"

    order = np.argsort(betas)
    prev = np.inf
    for i in order:
        want = kl_of(betas[i])
        rel = abs(kls[i] - want) / want if want > 1e-12 else abs(kls[i] - want)
        if rel > TOL:
            return False, f"β={betas[i]:g} 的 KL={kls[i]:.6f} 与闭式解 {want:.6f} 相差 {rel:.1%}"
        if kls[i] > prev + 1e-9:
            return False, f"KL 未随 β 单调不增（β={betas[i]:g}：{kls[i]:.6f} > 上一个 {prev:.6f}）"
        prev = kls[i]

    if kls[order[-1]] > 1e-3:
        return False, f"β={betas[order[-1]]:g} 时偏移仍为 {kls[order[-1]]:.4f}，应趋于 0"
    return True, f"{len(betas)} 个 β 均与闭式解一致；β={betas[order[-1]]:g} 时 KL={kls[order[-1]]:.2e}"


def _write(tmp, data, name):
    path = f"{tmp}/{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return path


BETAS = [0.01, 0.03, 0.1, 0.3, 1.0, 3.0, 10.0, 100.0]


def make_good(tmp):
    return {"results": _write(tmp, {"betas": BETAS, "kl": [kl_of(b) for b in BETAS]}, "kl_good")}


def make_bad(tmp):
    # 典型错误：把 β 乘进去而不是除（方向反了）
    wrong = []
    for b in BETAS:
        z = REWARDS * b + np.log(REF)
        p = np.exp(z - z.max())
        p /= p.sum()
        wrong.append(float((p * np.log(p / REF)).sum()))
    return {"results": _write(tmp, {"betas": BETAS, "kl": wrong}, "kl_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True)
    args = ap.parse_args()
    need(args.results, "results.json")
    ok, msg = judge({"results": args.results})
    report(ok, msg)
