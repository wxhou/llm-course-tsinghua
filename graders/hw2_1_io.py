"""2.1 · IO 账对拍：四个 HBM 读写量与解析式一致。

口径（fp16，每个元素 b 字节，单头，序列长 T、头维 d、片上可用 M）：
  朴素：读 Q/K/V (3Td) + 写读 S (2T²) + 写读 P (2T²) + 写 O (Td)  ⇒ b·(4Td + 4T²)
  分块：读 Q 一次 (Td) + 每块重读 K/V (2Td·T/M) + 写 O (Td)          ⇒ b·(2Td + 2T²d/M)
  朴素/分块 比值，以及 K/V 的重读放大倍数 T/M。

产物：answers.json 含 naive_bytes / blocked_bytes / naive_over_blocked / read_amplification 四个数字。
"""

import argparse
import json

from _lib import need, report, run_self_test, self_test_requested

TOL = 0.01


def expected(T, d, M, b):
    naive = b * (4 * T * d + 4 * T * T)
    blocked = b * (2 * T * d + 2 * T * T * d / M)
    return {
        "naive_bytes": naive,
        "blocked_bytes": blocked,
        "naive_over_blocked": naive / blocked,
        "read_amplification": T / M,
    }


def judge(art):
    with open(art["answers"], encoding="utf-8") as f:
        got = json.load(f)
    want = expected(art["T"], art["d"], art["M"], art["b"])
    for key, w in want.items():
        if key not in got:
            return False, f"answers.json 缺少字段 {key}"
        try:
            g = float(got[key])
        except (TypeError, ValueError):
            return False, f"{key} 不是数字：{got[key]!r}"
        if w == 0:
            if abs(g) > TOL:
                return False, f"{key}={g} 与解析值 0 不符"
            continue
        rel = abs(g - w) / abs(w)
        if rel > TOL:
            return False, f"{key}={g:,.0f} 与解析值 {w:,.0f} 相对误差 {rel:.1%}（容差 {TOL:.0%}）"
    return True, (
        f"四项与解析式一致：朴素 {want['naive_bytes'] / 1e6:.1f} MB、"
        f"分块 {want['blocked_bytes'] / 1e6:.1f} MB、放大 {want['read_amplification']:.0f}×"
    )


def _write(tmp, data, name):
    path = f"{tmp}/{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return path


BASE = {"T": 4096, "d": 64, "M": 1024, "b": 2}


def make_good(tmp):
    return {"answers": _write(tmp, expected(**BASE), "io_good"), **BASE}


def make_bad(tmp):
    data = expected(**BASE)
    data["naive_bytes"] *= 1.1  # 典型错误：漏算 S/P 的一次读写
    return {"answers": _write(tmp, data, "io_bad"), **BASE}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--answers", required=True)
    ap.add_argument("--T", type=int, default=BASE["T"])
    ap.add_argument("--d", type=int, default=BASE["d"])
    ap.add_argument("--M", type=int, default=BASE["M"])
    ap.add_argument("--bytes", type=int, default=BASE["b"], dest="b")
    args = ap.parse_args()
    need(args.answers, "answers.json")
    ok, msg = judge({"answers": args.answers, "T": args.T, "d": args.d, "M": args.M, "b": args.b})
    report(ok, msg)
