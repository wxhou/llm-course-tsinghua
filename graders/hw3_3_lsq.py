"""3.3 · 最小二乘实现对拍：手写的 log 空间拟合与 numpy 结果一致。

产物契约：实现文件导出 `lsq(x, y)` → (slope, intercept)，拟合 y = slope·x + intercept，不得调用现成拟合例程。
"""

import argparse
import importlib.util

import numpy as np

from _lib import need, report, run_self_test, self_test_requested


def _ref(x, y):
    slope, intercept = np.polyfit(x, y, 1)
    return float(slope), float(intercept)


def _check(fn, x, y, tol, label):
    want_s, want_i = _ref(x, y)
    try:
        got = fn(x, y)
        s, i = float(got[0]), float(got[1])
    except Exception as e:
        return f"{label} 调用失败：{type(e).__name__}: {e}"
    ds, di = abs(s - want_s), abs(i - want_i)
    if ds > tol * max(1.0, abs(want_s)) or di > tol * max(1.0, abs(want_i)):
        return f"{label} 与 numpy 不一致：slope {s:.6g} vs {want_s:.6g}，intercept {i:.6g} vs {want_i:.6g}"
    return None


def judge(art):
    spec = importlib.util.spec_from_file_location("reader_lsq", art["impl"])
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception as e:
        return False, f"实现文件导入失败：{type(e).__name__}: {e}"
    fn = getattr(mod, "lsq", None)
    if fn is None:
        return False, "实现文件没有导出 lsq(x, y)"

    rng = np.random.default_rng(11)

    x = np.linspace(0.0, 5.0, 40)
    err = _check(fn, x, 3.0 * x - 2.0, 1e-6, "无噪声直线")
    if err:
        return False, err

    ns = np.array([1e17, 3e17, 1e18, 3e18, 1e19, 3e19, 1e20])
    alpha = 0.34
    err = _check(fn, np.log(ns), np.log(2.5) - alpha * np.log(ns), 1e-3, "合成幂律")
    if err:
        return False, err
    s, _ = fn(np.log(ns), np.log(2.5) - alpha * np.log(ns))
    if abs(-float(s) - alpha) > 1e-3:
        return False, f"合成的幂律指数 {alpha} 未被还原：得到 {-float(s):.4f}"

    noisy_x = rng.standard_normal(200)
    noisy_y = 1.7 * noisy_x + 0.4 + rng.standard_normal(200) * 0.3
    err = _check(fn, noisy_x, noisy_y, 1e-6, "200 点含噪回归")
    if err:
        return False, err + "（两点求斜率会在这里露馅）"

    return True, "无噪声直线、合成幂律、200 点含噪回归三档均与 numpy 一致"


GOOD_SRC = """
import numpy as np
def lsq(x, y):
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    xm, ym = x.mean(), y.mean()
    slope = ((x - xm) * (y - ym)).sum() / ((x - xm) ** 2).sum()
    return float(slope), float(ym - slope * xm)
"""

BAD_SRC = """
import numpy as np
def lsq(x, y):
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    # 只用首尾两点求斜率：在含噪数据上偏差很大
    slope = (y[-1] - y[0]) / (x[-1] - x[0])
    return float(slope), float(y[0] - slope * x[0])
"""


def _write(tmp, src, name):
    path = f"{tmp}/{name}.py"
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    return path


def make_good(tmp):
    return {"impl": _write(tmp, GOOD_SRC, "lsq_good")}


def make_bad(tmp):
    return {"impl": _write(tmp, BAD_SRC, "lsq_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--impl", required=True)
    args = ap.parse_args()
    need(args.impl, "实现文件")
    ok, msg = judge({"impl": args.impl})
    report(ok, msg)
