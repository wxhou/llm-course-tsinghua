"""2.2 · Online softmax 对拍：沿最后一维分块计算，结果与一次性 softmax 一致，且分块大小无关、大 logit 不溢出。

产物契约：实现文件导出 `online_softmax(x, block)`，x 为二维数组，沿最后一维做 softmax，按 block 分块。
"""

import argparse
import importlib.util

import numpy as np

from _lib import need, report, run_self_test, self_test_requested

BLOCKS = (1, 7, 64, 100)
TOL = 1e-6


def _ref(x):
    z = x - x.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def judge(art):
    spec = importlib.util.spec_from_file_location("reader_online", art["impl"])
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception as e:
        return False, f"实现文件导入失败：{type(e).__name__}: {e}"
    fn = getattr(mod, "online_softmax", None)
    if fn is None:
        return False, "实现文件没有导出 online_softmax(x, block)"

    rng = np.random.default_rng(0)
    x = rng.standard_normal((4, 100))
    want = _ref(x)
    for block in BLOCKS:
        try:
            got = np.asarray(fn(x, block), dtype=np.float64)
        except Exception as e:
            return False, f"block={block} 调用失败：{type(e).__name__}: {e}"
        if got.shape != x.shape:
            return False, f"block={block} 输出形状 {got.shape} 与输入 {x.shape} 不一致"
        diff = np.abs(got - want).max()
        if diff >= TOL:
            return False, f"block={block} 与一次性 softmax 差 {diff:.3e}（容差 {TOL:.0e}）"

    big = x * 500
    try:
        got = np.asarray(fn(big, 7), dtype=np.float64)
    except Exception as e:
        return False, f"大 logit 下调用失败：{type(e).__name__}: {e}"
    if not np.isfinite(got).all():
        return False, "大 logit 下出现 inf/nan（running max 没有参与指数计算）"
    diff = np.abs(got - _ref(big)).max()
    if diff >= 1e-6:
        return False, f"大 logit 下与参考差 {diff:.3e}"

    return True, f"分块 {BLOCKS} 结果一致（最大差 {diff:.1e}）；大 logit 下稳定"


GOOD_SRC = """
import numpy as np
def online_softmax(x, block):
    x = np.asarray(x, dtype=np.float64)
    out = np.empty_like(x)
    for r in range(x.shape[0]):
        row = x[r]
        m, l = -np.inf, 0.0
        for s in range(0, row.size, block):
            seg = row[s:s + block]
            m_new = max(m, float(seg.max()))
            l = l * np.exp(m - m_new) + float(np.exp(seg - m_new).sum())
            m = m_new
        for s in range(0, row.size, block):
            out[r, s:s + block] = np.exp(row[s:s + block] - m) / l
    return out
"""

BAD_SRC = """
import numpy as np
def online_softmax(x, block):
    # 朴素实现：不减最大值，大 logit 下 exp 溢出
    e = np.exp(np.asarray(x, dtype=np.float64))
    return e / e.sum(axis=-1, keepdims=True)
"""


def _write(tmp, src, name):
    path = f"{tmp}/{name}.py"
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    return path


def make_good(tmp):
    return {"impl": _write(tmp, GOOD_SRC, "online_good")}


def make_bad(tmp):
    return {"impl": _write(tmp, BAD_SRC, "online_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--impl", required=True)
    args = ap.parse_args()
    need(args.impl, "实现文件")
    ok, msg = judge({"impl": args.impl})
    report(ok, msg)
