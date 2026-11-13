"""1.5 · 训练 smoke：用迷你配置真跑两遍，看 loss 是否下降且同种子可复现。

产物契约：训练脚本支持 `--steps N --seed S`，每步打印一行含 `step=<i>` 与 `loss=<v>`，正常退出。
本检查只做 CPU 分钟级 smoke，不替代 PA1 的真实训练交付。
"""

import argparse
import os
import re
import subprocess
import sys

from _lib import need, report, run_self_test, self_test_requested

LINE = re.compile(r"step[=:\s]+(\d+).*?loss[=:\s]+([-+0-9.eE]+)")
TIMEOUT = 300
SMOKE_STEPS = 40
DROP_RATIO = 0.7


def _run(script):
    try:
        p = subprocess.run(
            [sys.executable, script, "--steps", str(SMOKE_STEPS), "--seed", "0"],
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
            cwd=os.path.dirname(os.path.abspath(script)) or ".",
        )
    except subprocess.TimeoutExpired:
        return None, f"训练脚本 {TIMEOUT}s 未结束（smoke 应在分钟级跑完）"
    if p.returncode != 0:
        tail = (p.stderr or p.stdout).strip().splitlines()[-1:] or ["（无输出）"]
        return None, f"训练脚本退出码 {p.returncode}：{tail[0][:160]}"
    losses = [float(v) for _, v in LINE.findall(p.stdout)]
    return losses, None


def judge(art):
    first, err = _run(art["script"])
    if err:
        return False, err
    if len(first) < 20:
        return False, f"只解析到 {len(first)} 条 loss 记录（需 ≥20，检查输出是否含 `step=<i> loss=<v>`）"

    head = sum(first[:5]) / 5
    tail = sum(first[-5:]) / 5
    if head <= 0:
        return False, f"初始 loss 非正（{head:.4g}），无法判断下降"
    if tail > head * DROP_RATIO:
        return False, f"{SMOKE_STEPS} 步内 loss 只从 {head:.4f} 到 {tail:.4f}，下降不足 {(1 - DROP_RATIO):.0%}"

    second, err = _run(art["script"])
    if err:
        return False, err
    if abs(second[-1] - first[-1]) > 1e-4:
        return False, f"同种子重跑结果不同：末步 loss {first[-1]:.6f} vs {second[-1]:.6f}（seed 未固定？）"

    return True, f"{len(first)} 步 loss {head:.4f}→{tail:.4f}；同种子重跑一致"


GOOD_SRC = """
import argparse
import math
ap = argparse.ArgumentParser()
ap.add_argument('--steps', type=int, default=200)
ap.add_argument('--seed', type=int, default=0)
a = ap.parse_args()
loss = 4.0
for i in range(a.steps):
    loss = 3.0 * math.exp(-i / 25.0) + 0.4
    print(f'step={i} loss={loss:.6f}')
"""

BAD_SRC = """
import argparse
ap = argparse.ArgumentParser()
ap.add_argument('--steps', type=int, default=200)
ap.add_argument('--seed', type=int, default=0)
a = ap.parse_args()
for i in range(a.steps):
    print(f'step={i} loss=4.000000')
"""


def _write(tmp, src, name):
    path = f"{tmp}/{name}.py"
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    return path


def make_good(tmp):
    return {"script": _write(tmp, GOOD_SRC, "train_good")}


def make_bad(tmp):
    return {"script": _write(tmp, BAD_SRC, "train_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True)
    args = ap.parse_args()
    need(args.script, "训练脚本")
    ok, msg = judge({"script": args.script})
    report(ok, msg)
