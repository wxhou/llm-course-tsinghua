"""1.4 · 形状与参数账：模型能前向、输出形状与输入一致、自报参数量等于实际参数量。

产物契约：模型文件导出 `build_model()`（forward(LongTensor[B,T]) → [B,T,V]）与 `count_params(model)` → int。
"""

import argparse
import importlib.util

import torch

from _lib import need, report, run_self_test, self_test_requested


def judge(art):
    spec = importlib.util.spec_from_file_location("reader_shape_model", art["model"])
    mod = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(mod)
    except Exception as e:
        return False, f"模型文件导入失败：{type(e).__name__}: {e}"
    build = getattr(mod, "build_model", None)
    count = getattr(mod, "count_params", None)
    if build is None:
        return False, "模型文件没有导出 build_model()"
    if count is None:
        return False, "模型文件没有导出 count_params(model)"

    torch.manual_seed(0)
    try:
        model = build().eval()
    except Exception as e:
        return False, f"build_model() 调用失败：{type(e).__name__}: {e}"

    vocab = None
    for b, t in ((1, 5), (3, 17), (2, 32)):
        x = torch.randint(0, 8, (b, t))
        with torch.no_grad():
            y = model(x)
        if y.dim() != 3:
            return False, f"输出应为 3 维 [B,T,V]，实际 {tuple(y.shape)}"
        if tuple(y.shape[:2]) != (b, t):
            return False, f"输出前两维 {(y.shape[0], y.shape[1])} 与输入 {(b, t)} 不一致（reshape 破坏了序列维度？）"
        if vocab is None:
            vocab = y.shape[-1]
        elif y.shape[-1] != vocab:
            return False, f"词表维度随输入变化：{vocab} → {y.shape[-1]}"

    actual = sum(p.numel() for p in model.parameters())
    try:
        reported = int(count(model))
    except Exception as e:
        return False, f"count_params 调用失败：{type(e).__name__}: {e}"
    if reported != actual:
        return False, f"自报参数量 {reported:,} 与实际 {actual:,} 不一致（差 {reported - actual:+,}）"

    again = build()
    if int(count(again)) != reported:
        return False, "同一配置两次构建的参数量不同（存在随机初始化之外的形状依赖）"

    return True, f"形状 [B,T]→[B,T,{vocab}] 稳定；参数量 {actual:,} 自洽"


class _Model(torch.nn.Module):
    def __init__(self, vocab=32, d=16, layers=2):
        super().__init__()
        self.emb = torch.nn.Embedding(vocab, d)
        self.blocks = torch.nn.ModuleList([torch.nn.Linear(d, d) for _ in range(layers)])
        self.head = torch.nn.Linear(d, vocab, bias=False)

    def forward(self, idx):
        h = self.emb(idx)
        for blk in self.blocks:
            h = h + torch.tanh(blk(h))
        return self.head(h)


def _write(tmp, count_body, name):
    path = f"{tmp}/{name}.py"
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"import sys; sys.path.insert(0, {repr(__import__('sys').path[0])})\n")
        f.write("from hw1_4_shapes import _Model\n\n")
        f.write("def build_model():\n    return _Model()\n\n")
        f.write("def count_params(model):\n")
        f.write(count_body)
    return path


GOOD = "    return sum(p.numel() for p in model.parameters())\n"
BAD = "    return sum(p.numel() for p in model.parameters()) + model.emb.num_embeddings\n"


def make_good(tmp):
    return {"model": _write(tmp, GOOD, "shape_good")}


def make_bad(tmp):
    return {"model": _write(tmp, BAD, "shape_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    args = ap.parse_args()
    need(args.model, "模型文件")
    ok, msg = judge({"model": args.model})
    report(ok, msg)
