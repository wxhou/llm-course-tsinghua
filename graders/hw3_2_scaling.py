"""3.2 · Scaling law 复核：对读者给出的 (N, L) 数据点重做幂律拟合，核对 α 与 R²。

产物：points.json = {"points": [{"N": …, "L": …}, …], "alpha": …, "r2": …}。
拟合口径：在 log 空间对 log L = c − α·log N 做最小二乘；α = −slope。
"""

import argparse
import json
import math

import numpy as np

from _lib import need, report, run_self_test, self_test_requested

MIN_POINTS = 6
ALPHA_TOL = 0.05
R2_MIN = 0.9
R2_TOL = 0.02


def _fit(ns, ls):
    x, y = np.log(ns), np.log(ls)
    slope, intercept = np.polyfit(x, y, 1)
    pred = slope * x + intercept
    ss_res = float(((y - pred) ** 2).sum())
    ss_tot = float(((y - y.mean()) ** 2).sum())
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 1.0
    return -float(slope), r2


def judge(art):
    with open(art["points"], encoding="utf-8") as f:
        data = json.load(f)
    pts = data.get("points") if isinstance(data, dict) else None
    if not isinstance(pts, list):
        return False, "points.json 缺少 points 数组"
    if len(pts) < MIN_POINTS:
        return False, f"只有 {len(pts)} 个数据点，至少需要 {MIN_POINTS} 个"
    try:
        ns = np.array([float(p["N"]) for p in pts])
        ls = np.array([float(p["L"]) for p in pts])
    except (KeyError, TypeError, ValueError) as e:
        return False, f"数据点字段缺失或非数字：{e!r}"
    if (ns <= 0).any() or (ls <= 0).any():
        return False, "N 与 L 必须为正数（log 空间拟合）"
    if len(set(ns.tolist())) < 2:
        return False, "所有数据点的 N 相同，无法拟合斜率"

    alpha, r2 = _fit(ns, ls)
    if r2 < R2_MIN:
        return False, f"重拟合 R²={r2:.3f} < {R2_MIN}，数据点不服从幂律（或有离群点）"

    try:
        got_alpha = float(data["alpha"])
        got_r2 = float(data["r2"])
    except (KeyError, TypeError, ValueError):
        return False, "points.json 缺少可解析的 alpha 或 r2"

    if math.isnan(got_alpha) or math.isinf(got_alpha):
        return False, f"alpha 不是有限值：{got_alpha}"
    if abs(got_alpha - alpha) / abs(alpha) > ALPHA_TOL:
        return False, f"你报告的 α={got_alpha:.4f} 与重拟合 {alpha:.4f} 相对误差超过 {ALPHA_TOL:.0%}"
    if abs(got_r2 - r2) > R2_TOL:
        return False, f"你报告的 R²={got_r2:.4f} 与重拟合 {r2:.4f} 不一致（差 {abs(got_r2 - r2):.3f}）"

    return True, f"{len(pts)} 点，α={alpha:.4f}（报告 {got_alpha:.4f}），R²={r2:.4f}"


def _write(tmp, data, name):
    path = f"{tmp}/{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return path


def _law(alpha=0.34, c=2.5, noise=0.0):
    rng = np.random.default_rng(7)
    ns = np.array([1e17, 3e17, 1e18, 3e18, 1e19, 3e19, 1e20, 3e20])
    ls = c * ns**-alpha
    if noise:
        ls = ls * (1 + rng.standard_normal(ls.shape) * noise)
    alpha_fit, r2 = _fit(ns, ls)
    return {"points": [{"N": float(n), "L": float(l)} for n, l in zip(ns, ls)], "alpha": alpha_fit, "r2": r2}


def make_good(tmp):
    return {"points": _write(tmp, _law(noise=0.01), "scale_good")}


def make_bad(tmp):
    bad = _law(noise=0.01)
    bad["alpha"] = bad["alpha"] * 1.2  # 典型错误：拿两个端点算斜率
    return {"points": _write(tmp, bad, "scale_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--points", required=True)
    args = ap.parse_args()
    need(args.points, "points.json")
    ok, msg = judge({"points": args.points})
    report(ok, msg)
