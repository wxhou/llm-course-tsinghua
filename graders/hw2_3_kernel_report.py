"""2.3 · kernel 对拍记录：三种序列长度 × fp16 的误差都达标。

产物：对拍输出 JSON，形如 {"runs": [{"T": 512, "dtype": "fp16", "max_abs_err": 0.0012}, ...]}。
必须覆盖 T = 512 / 2048 / 8192，每项误差有限且 < 1e-2（fp16 的合理容差）。
"""

import argparse
import json
import math

from _lib import need, report, run_self_test, self_test_requested

SIZES = (512, 2048, 8192)
TOL = 1e-2


def judge(art):
    with open(art["report"], encoding="utf-8") as f:
        data = json.load(f)
    runs = data.get("runs") if isinstance(data, dict) else None
    if not isinstance(runs, list) or not runs:
        return False, "报告缺少 runs 数组"

    by_T = {}
    for i, r in enumerate(runs):
        if not isinstance(r, dict):
            return False, f"runs[{i}] 不是对象"
        if "T" not in r or "max_abs_err" not in r:
            return False, f"runs[{i}] 缺少 T 或 max_abs_err"
        try:
            by_T[int(r["T"])] = r
        except (TypeError, ValueError):
            return False, f"runs[{i}] 的 T 不是整数：{r['T']!r}"

    missing = [t for t in SIZES if t not in by_T]
    if missing:
        return False, f"缺少序列长度 {missing} 的记录（三种都要跑）"

    for t in SIZES:
        r = by_T[t]
        dtype = str(r.get("dtype", "")).lower()
        if "fp16" not in dtype and "float16" not in dtype and "half" not in dtype:
            return False, f"T={t} 记录的 dtype 不是 fp16：{r.get('dtype')!r}"
        try:
            err = float(r["max_abs_err"])
        except (TypeError, ValueError):
            return False, f"T={t} 的 max_abs_err 不是数字：{r['max_abs_err']!r}"
        if math.isnan(err) or math.isinf(err):
            return False, f"T={t} 的误差为 {err}（数值发散）"
        if err >= TOL:
            return False, f"T={t} 的误差 {err:.3e} 超出 fp16 容差 {TOL:.0e}"

    errs = ", ".join(f"T={t}:{float(by_T[t]['max_abs_err']):.1e}" for t in SIZES)
    return True, f"三种尺寸齐备且达标（{errs}）"


def _write(tmp, runs, name):
    path = f"{tmp}/{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"runs": runs}, f, ensure_ascii=False)
    return path


GOOD = [
    {"T": 512, "dtype": "fp16", "max_abs_err": 3.1e-4},
    {"T": 2048, "dtype": "fp16", "max_abs_err": 8.4e-4},
    {"T": 8192, "dtype": "fp16", "max_abs_err": 2.2e-3},
]


def make_good(tmp):
    return {"report": _write(tmp, GOOD, "kernel_good")}


def make_bad(tmp):
    bad = [dict(r) for r in GOOD]
    bad[2]["max_abs_err"] = 0.041  # 大 T 下真正会出现的精度崩塌
    return {"report": _write(tmp, bad, "kernel_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", required=True)
    args = ap.parse_args()
    need(args.report, "对拍输出")
    ok, msg = judge({"report": args.report})
    report(ok, msg)
