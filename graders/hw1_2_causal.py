"""1.2 · 因果性自检：改动位置 t 之后的 token，位置 t 的输出必须逐位不变。

产物契约：模型文件导出 `build_model()`，返回一个模块，forward(LongTensor[B,T]) → logits[B,T,V]。
"""

import argparse
import importlib.util
import sys

import torch

from _lib import need, report, run_self_test, self_test_requested


def judge(art):
    spec = importlib.util.spec_from_file_location("reader_model", art["model"])
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception as e:  # 读者文件本身跑不起来 → 无法判定
        return False, f"模型文件导入失败：{type(e).__name__}: {e}"
    build = getattr(mod, "build_model", None)
    if build is None:
        return False, "模型文件没有导出 build_model()"

    torch.manual_seed(0)
    try:
        model = build().eval()
    except Exception as e:
        return False, f"build_model() 调用失败：{type(e).__name__}: {e}"

    x = torch.randint(0, 8, (2, 12))
    cut = 7
    with torch.no_grad():
        y1 = model(x)
        x2 = x.clone()
        x2[:, cut:] = torch.randint(0, 8, (2, x.shape[1] - cut))
        y2 = model(x2)

    if tuple(y1.shape[:2]) != tuple(x.shape):
        return False, f"输出形状 {tuple(y1.shape)} 与输入 {tuple(x.shape)} 不匹配"

    leak = (y1[:, :cut] - y2[:, :cut]).abs().max().item()
    if leak >= 1e-6:
        return False, f"未来 token 影响了历史位置：最大绝对差 {leak:.3e}（causal mask 缺失或错位）"
    return True, f"因果性成立：前 {cut} 个位置对未来的扰动免疫（最大绝对差 {leak:.1e}）"


class _Block(torch.nn.Module):
    def __init__(self, d=16, causal=True):
        super().__init__()
        self.qkv = torch.nn.Linear(d, 3 * d)
        self.causal = causal
        self.d = d

    def forward(self, idx):
        x = torch.nn.functional.one_hot(idx, self.d).float()
        q, k, v = self.qkv(x).split(self.d, dim=2)
        att = q @ k.transpose(-2, -1) / self.d**0.5
        if self.causal:
            mask = torch.tril(torch.ones(att.shape[-2:], dtype=torch.bool))
            att = att.masked_fill(~mask, float("-inf"))
        return torch.softmax(att, dim=-1) @ v


def _write(tmp, causal):
    path = f"{tmp}/model_{'causal' if causal else 'bidir'}.py"
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"import sys; sys.path.insert(0, {repr(sys.path[0])})\n")
        f.write("from hw1_2_causal import _Block\n\n")
        f.write(f"def build_model():\n    return _Block(causal={causal})\n")
    return path


def make_good(tmp):
    return {"model": _write(tmp, True)}


def make_bad(tmp):
    return {"model": _write(tmp, False)}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    args = ap.parse_args()
    need(args.model, "模型文件")
    ok, msg = judge({"model": args.model})
    report(ok, msg)
