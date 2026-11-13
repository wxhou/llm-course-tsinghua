"""2.5 · PA2 交付验收：对拍记录、OOM 分界数据、归因报告三段齐备。

交付目录约定：
  parity.json       —— {"runs": [{"T":…, "max_abs_err":…}, …]}，至少三档，误差 < 1e-2
  oom.md            —— naive 在多大 T 下 OOM、分块版在同样 T 下正常的分界数据
  attribution.md    —— 性能归因：瓶颈判断 + 支撑证据
"""

import argparse
import json
import os
import re

from _lib import need, report, run_self_test, self_test_requested

TOL = 1e-2


def _read(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


def judge(art):
    d = art["artifacts"]
    for name in ("parity.json", "oom.md", "attribution.md"):
        p = os.path.join(d, name)
        if not os.path.exists(p):
            return False, f"交付目录缺少 {name}"
        if not _read(p).strip():
            return False, f"{name} 是空文件"

    try:
        parity = json.loads(_read(os.path.join(d, "parity.json")))
    except json.JSONDecodeError as e:
        return False, f"parity.json 不是合法 JSON：{e}"
    runs = parity.get("runs") if isinstance(parity, dict) else None
    if not isinstance(runs, list) or len(runs) < 3:
        return False, "parity.json 的 runs 少于三档"
    for i, r in enumerate(runs):
        try:
            err = float(r["max_abs_err"])
        except (KeyError, TypeError, ValueError):
            return False, f"parity.json runs[{i}] 缺少可解析的 max_abs_err"
        if not err < TOL:
            return False, f"parity.json runs[{i}] 误差 {err:.3e} 未达标（< {TOL:.0e}）"

    oom = _read(os.path.join(d, "oom.md"))
    if not re.search(r"oom|out of memory|显存不足", oom, re.IGNORECASE):
        return False, "oom.md 没有出现 OOM 相关记录"
    if not re.search(r"\d{3,}", oom):
        return False, "oom.md 没有给出具体的 T 值（分界需要数字）"

    attr = _read(os.path.join(d, "attribution.md"))
    if len(attr) < 200:
        return False, f"attribution.md 只有 {len(attr)} 字符，写不下归因证据"
    if "瓶颈" not in attr:
        return False, "attribution.md 没有给出瓶颈判断"

    return True, f"三段齐备：对拍 {len(runs)} 档、OOM 分界有数据、归因 {len(attr)} 字符"


def _make(tmp, good):
    d = os.path.join(tmp, "good" if good else "bad")
    os.makedirs(d, exist_ok=True)
    parity = {"runs": [{"T": t, "max_abs_err": e} for t, e in ((512, 3e-4), (2048, 8e-4), (8192, 2e-3))]}
    with open(os.path.join(d, "parity.json"), "w", encoding="utf-8") as f:
        json.dump(parity, f)
    with open(os.path.join(d, "oom.md"), "w", encoding="utf-8") as f:
        f.write("naive 在 T=16384 时 OOM（峰值 41.2 GB）；分块版同尺寸正常，峰值 3.1 GB。\n")
    if good:
        with open(os.path.join(d, "attribution.md"), "w", encoding="utf-8") as f:
            f.write(
                "瓶颈判断：T=8192 时分块版达到 62% 的 HBM 带宽上限，naive 仅 11%。"
                "证据：nsight 显示 naive 的显存流量集中在 S/P 的往返写读，"
                "而分块版在 M=1024 下把 K/V 重读放大压到 8×，吞吐随 M 单调上升。" * 2
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
