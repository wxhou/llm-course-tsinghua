"""2.4 · benchmark 纪律：脚本里四项计时纪律是否齐备（静态检查）。

四项：计时前 synchronize、预热 ≥3 次、CUDA event 计时、显存峰值用 max_memory_allocated 统计。
这是静态检查——它证明你写了这些纪律，不证明你的数字可信；数字本身要对得上 2.3 的对拍与 OOM 分界。
"""

import argparse
import re

from _lib import need, report, run_self_test, self_test_requested

WARMUP = re.compile(r"warmup\w*\D{0,24}?(\d+)", re.IGNORECASE)


def judge(art):
    with open(art["script"], encoding="utf-8", errors="replace") as f:
        src = f.read()
    if not src.strip():
        return False, "benchmark 脚本为空"

    missing = []
    if "synchronize" not in src:
        missing.append("计时前 synchronize")
    m = WARMUP.search(src)
    if not m:
        missing.append("显式预热轮数（warmup = N，N ≥ 3）")
    elif int(m.group(1)) < 3:
        return False, f"预热 {m.group(1)} 轮少于 3 轮，首个计时点含冷启动开销"
    if "Event" not in src:
        missing.append("CUDA event 计时（torch.cuda.Event）")
    if "max_memory_allocated" not in src and "memory_allocated" not in src:
        missing.append("显存峰值统计（max_memory_allocated）")

    if missing:
        return False, "缺少 " + "、".join(missing)
    return True, "四项纪律齐备：synchronize / warmup≥3 / CUDA event / 显存峰值"


GOOD_SRC = '''
import torch, torch.nn.functional as F
n_warmup = 5
n_iter = 50
x = torch.randn(4096, 64, device="cuda", dtype=torch.float16)
for _ in range(n_warmup):
    F.softmax(x, dim=-1)
torch.cuda.synchronize()
start = torch.cuda.Event(enable_timing=True)
end = torch.cuda.Event(enable_timing=True)
start.record()
for _ in range(n_iter):
    F.softmax(x, dim=-1)
end.record()
torch.cuda.synchronize()
print("ms", start.elapsed_time(end) / n_iter)
print("peak MB", torch.cuda.max_memory_allocated() / 1e6)
'''

BAD_SRC = '''
import torch, torch.nn.functional as F
n_warmup = 5
x = torch.randn(4096, 64, device="cuda", dtype=torch.float16)
start = torch.cuda.Event(enable_timing=True)
end = torch.cuda.Event(enable_timing=True)
start.record()
for _ in range(50):
    F.softmax(x, dim=-1)
end.record()
print("ms", start.elapsed_time(end) / 50)
print("peak MB", torch.cuda.max_memory_allocated() / 1e6)
'''


def _write(tmp, src, name):
    path = f"{tmp}/{name}.py"
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    return path


def make_good(tmp):
    return {"script": _write(tmp, GOOD_SRC, "bench_good")}


def make_bad(tmp):
    return {"script": _write(tmp, BAD_SRC, "bench_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--script", required=True)
    args = ap.parse_args()
    need(args.script, "benchmark 脚本")
    ok, msg = judge({"script": args.script})
    report(ok, msg)
