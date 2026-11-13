"""3.4 · PA3 交付验收：六档扫描、幂律拟合结果、四段式报告。

交付目录约定：
  scan.json    —— {"runs": [{"N":…, "L":…} × ≥6], "alpha":…, "r2":…}
  report.md    —— 含 Problem / Motivation / Method / Results 四段
"""

import argparse
import json
import os

import numpy as np

from _lib import need, report, run_self_test, self_test_requested

SECTIONS = ("Problem", "Motivation", "Method", "Results")
ALPHA_TOL, R2_MIN = 0.05, 0.9


def _fit(ns, ls):
    x, y = np.log(ns), np.log(ls)
    slope, intercept = np.polyfit(x, y, 1)
    pred = slope * x + intercept
    r2 = 1.0 - float(((y - pred) ** 2).sum()) / float(((y - y.mean()) ** 2).sum())
    return -float(slope), r2


def judge(art):
    d = art["artifacts"]
    scan_p, report_p = os.path.join(d, "scan.json"), os.path.join(d, "report.md")
    for p in (scan_p, report_p):
        if not os.path.exists(p):
            return False, f"交付目录缺少 {os.path.basename(p)}"
    with open(scan_p, encoding="utf-8") as f:
        try:
            scan = json.load(f)
        except json.JSONDecodeError as e:
            return False, f"scan.json 不是合法 JSON：{e}"
    runs = scan.get("runs") if isinstance(scan, dict) else None
    if not isinstance(runs, list):
        return False, "scan.json 缺少 runs 数组"
    ns = [r.get("N") for r in runs if isinstance(r, dict)]
    if len(runs) < 6 or len({n for n in ns if n}) < 6:
        return False, f"只有 {len(runs)} 档扫描（需 ≥6 档，且 N 互不相同）"
    try:
        arr_n = np.array([float(r["N"]) for r in runs])
        arr_l = np.array([float(r["L"]) for r in runs])
    except (KeyError, TypeError, ValueError) as e:
        return False, f"runs 里有缺失或非数字字段：{e!r}"
    if (arr_n <= 0).any() or (arr_l <= 0).any():
        return False, "N 与 L 必须为正"

    alpha, r2 = _fit(arr_n, arr_l)
    if r2 < R2_MIN:
        return False, f"扫描点重拟合 R²={r2:.3f} < {R2_MIN}"
    try:
        got = float(scan["alpha"])
    except (KeyError, TypeError, ValueError):
        return False, "scan.json 缺少 alpha"
    if abs(got - alpha) / abs(alpha) > ALPHA_TOL:
        return False, f"报告 α={got:.4f} 与重拟合 {alpha:.4f} 相差超过 {ALPHA_TOL:.0%}"

    with open(report_p, encoding="utf-8", errors="replace") as f:
        report_text = f.read()
    missing = [s for s in SECTIONS if s.lower() not in report_text.lower()]
    if missing:
        return False, f"report.md 缺少小节：{', '.join(missing)}"
    if len(report_text) < 240:
        return False, f"report.md 只有 {len(report_text)} 字符，撑不起四段式报告"

    return True, f"{len(runs)} 档扫描，α={alpha:.4f}，R²={r2:.3f}，报告四段齐备"


def _make(tmp, good):
    d = os.path.join(tmp, "good" if good else "bad")
    os.makedirs(d, exist_ok=True)
    ns = np.array([1e17, 3e17, 1e18, 3e18, 1e19, 3e19][: 6 if good else 5])
    ls = 2.5 * ns**-0.34 * (1 + np.random.default_rng(3).standard_normal(ns.shape) * 0.01)
    alpha, _ = _fit(ns, ls)
    with open(os.path.join(d, "scan.json"), "w", encoding="utf-8") as f:
        json.dump(
            {"runs": [{"N": float(n), "L": float(l)} for n, l in zip(ns, ls)], "alpha": alpha, "r2": 0.99}, f
        )
    with open(os.path.join(d, "report.md"), "w", encoding="utf-8") as f:
        f.write(
            "## Problem\n预算是固定的，参数量与数据量怎么分配？\n\n"
            "## Motivation\n经验曲线不足以支撑决策，需要一个可外推的函数形式；"
            "只看单点结果无法回答“再加一倍参数值不值”，而这个判断直接决定训练预算怎么花。\n\n"
            "## Method\n六档参数量、固定 token 预算，每档训到 loss 平台期；在 log 空间做最小二乘拟合，"
            "用 R² 检验幂律假设是否站得住，并对离群点单独复跑确认不是训练不稳造成的。\n\n"
            "## Results\nα 与 R² 见 scan.json；同等算力下数据和参数应按相同比例扩张，"
            "单方面加大其中一项的收益低于按比例同时增加。\n"
        )
    return {"artifacts": d}


def make_good(tmp):
    return _make(tmp, True)


def make_bad(tmp):
    return _make(tmp, False)


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifacts", required=True)
    args = ap.parse_args()
    need(args.artifacts, "交付目录")
    ok, msg = judge({"artifacts": args.artifacts})
    report(ok, msg)
