"""4.3 · RLVR 判分器 + GRPO 组内优势：判分准确率与归一化性质。

产物契约（同一个文件导出两个函数）：
  verify(answer, gold) → bool            answer 可能是字符串（模型输出），gold 是标准答案
  grpo_advantage(rewards) → 数组         输入一组（G 条）奖励，输出同长度的组内归一化优势
"""

import argparse
import importlib.util

import numpy as np

from _lib import need, report, run_self_test, self_test_requested

ARITH = [(3, 7, "+", 10), (12, 30, "+", 42), (9, 4, "*", 36), (100, 25, "-", 75), (7, 8, "*", 56),
         (45, 5, "/", 9), (2, 6, "*", 12), (50, 12, "-", 38), (15, 15, "+", 30), (8, 3, "*", 24)]


def _cases():
    out = []
    for a, b, op, val in ARITH:
        out.append((str(val), val, True))
        out.append((f" {val} ", val, True))
        out.append((str(val + 1), val, False))
    out.append(("0.5", 0.5, True))
    out.append(("2.75", 2.75, True))
    out.append(("0.5001", 0.5, False))
    return out


def judge(art):
    spec = importlib.util.spec_from_file_location("reader_grpo", art["impl"])
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception as e:
        return False, f"实现文件导入失败：{type(e).__name__}: {e}"
    verify = getattr(mod, "verify", None)
    adv = getattr(mod, "grpo_advantage", None)
    if verify is None:
        return False, "实现文件没有导出 verify(answer, gold)"
    if adv is None:
        return False, "实现文件没有导出 grpo_advantage(rewards)"

    cases = _cases()
    wrong = []
    for ans, gold, want in cases:
        try:
            got = bool(verify(ans, gold))
        except Exception as e:
            return False, f"verify({ans!r}, {gold!r}) 抛错：{type(e).__name__}: {e}"
        if got != want:
            wrong.append(f"verify({ans!r}, {gold!r}) → {got}，应为 {want}")
    if wrong:
        return False, f"判分准确率 {(len(cases) - len(wrong)) / len(cases):.0%}：" + "；".join(wrong[:3])

    rng = np.random.default_rng(5)
    for _ in range(4):
        r = rng.standard_normal(8)
        try:
            a = np.asarray(adv(r), dtype=np.float64)
        except Exception as e:
            return False, f"grpo_advantage 调用失败：{type(e).__name__}: {e}"
        if a.shape != r.shape:
            return False, f"优势形状 {a.shape} 与奖励 {r.shape} 不一致"
        if abs(a.mean()) > 1e-6:
            return False, f"组内优势均值 {a.mean():.3e} 不为 0"
        if abs(a.std()) - 1.0 > 1e-6:
            return False, f"组内优势标准差 {a.std():.4f} 不为 1（漏了除以 std？）"

    tied = np.array([2.0, 2.0, 2.0, 2.0])
    try:
        a = np.asarray(adv(tied), dtype=np.float64)
    except Exception as e:
        return False, f"全同奖励下 grpo_advantage 抛错：{type(e).__name__}: {e}"
    if not np.isfinite(a).all():
        return False, "全同奖励下出现 inf/nan（std 为 0 时未短路）"
    if np.abs(a).max() > 1e-6:
        return False, f"全同奖励下优势应为全 0，实际最大 {np.abs(a).max():.3e}"

    return True, f"{len(cases)} 条判分全对；组内优势均值 0、标准差 1；全同组返回全 0"


GOOD_SRC = """
import numpy as np
def verify(answer, gold):
    try:
        return abs(float(str(answer).strip()) - float(gold)) < 1e-9
    except (TypeError, ValueError):
        return False

def grpo_advantage(rewards):
    r = np.asarray(rewards, dtype=np.float64)
    s = r.std()
    if s < 1e-12:
        return np.zeros_like(r)
    return (r - r.mean()) / s
"""

BAD_SRC = """
import numpy as np
def verify(answer, gold):
    try:
        return abs(float(str(answer).strip()) - float(gold)) < 1e-9
    except (TypeError, ValueError):
        return False

def grpo_advantage(rewards):
    r = np.asarray(rewards, dtype=np.float64)
    return r - r.mean()  # 只做了中心化，没除以标准差
"""


def _write(tmp, src, name):
    path = f"{tmp}/{name}.py"
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    return path


def make_good(tmp):
    return {"impl": _write(tmp, GOOD_SRC, "grpo_good")}


def make_bad(tmp):
    return {"impl": _write(tmp, BAD_SRC, "grpo_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--impl", required=True)
    args = ap.parse_args()
    need(args.impl, "实现文件")
    ok, msg = judge({"impl": args.impl})
    report(ok, msg)
