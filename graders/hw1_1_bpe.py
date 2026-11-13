"""1.1 · 校验读者训练的 BPE 词表：可逆性与压缩率。

产物：minbpe 风格的 vocab.json（id → latin-1 字符串）与 merges.txt（每行 "a b"）。
判定：用该词表对样例文本编码再解码必须逐字还原；token 数须少于字符数；词表大小须等于训练目标。
"""

import argparse
import json
import os
import sys

from _lib import need, report, run_self_test, self_test_requested, write


def load(vocab_path, merges_path):
    with open(vocab_path, encoding="utf-8") as f:
        vocab = json.load(f)
    if isinstance(vocab, dict):
        tokens = list(vocab.values())
    else:
        tokens = list(vocab)
    with open(merges_path, encoding="utf-8") as f:
        merges = [tuple(line.split()) for line in f.read().splitlines() if line.strip()]
    return tokens, merges


def encode(text, merges):
    parts = list(text.encode("utf-8").decode("latin-1"))
    for a, b in merges:
        i = 0
        while i < len(parts) - 1:
            if parts[i] == a and parts[i + 1] == b:
                parts[i : i + 2] = [a + b]
            else:
                i += 1
    return parts


def judge(art):
    tokens, merges = load(art["vocab"], art["merges"])
    with open(art["sample"], encoding="utf-8") as f:
        text = f.read().strip()
    if not text:
        return False, "样例文本为空"

    size = len(tokens)
    if size != art["vocab_size"]:
        return False, f"词表大小 {size} 与训练目标 {art['vocab_size']} 不一致"

    present = set(tokens)
    missing_bytes = [b for b in range(256) if chr(b) not in present]
    if missing_bytes:
        return False, f"词表缺少 {len(missing_bytes)} 个字节 token（字节级 BPE 必须覆盖全部 256 个字节）"

    unknown = [t for t in merges if any(ch not in present for ch in t)]
    if unknown:
        return False, f"merges 里有 {len(unknown)} 条引用了词表中不存在的 token"

    parts = encode(text, merges)
    restored = "".join(parts).encode("latin-1").decode("utf-8", errors="replace")
    if restored != text:
        return False, "编码再解码未能逐字还原（词表与 merges 不匹配或合并过程有误）"

    if len(parts) >= len(text):
        return False, f"没有压缩：{len(text)} 字符编成 {len(parts)} 个 token"

    ratio = len(text) / len(parts)
    return True, f"可逆 ✅ 压缩 {len(text)} 字符 → {len(parts)} token（{ratio:.2f}×），词表 {size}"


def _train(tmp, text, target):
    """在 self-test 里现场训练一个极小的 BPE，作为「合法产物」的样本。"""
    merges = []
    counts = {}
    for a, b in zip(text, text[1:]):
        counts[(a, b)] = counts.get((a, b), 0) + 1
    while len(set(text)) + len(merges) < target:
        if not counts:
            break
        pair = max(counts, key=counts.get)
        if counts[pair] < 2:
            break
        merges.append(pair)
        joiner = "".join(pair)
        text = text.replace(pair[0] + pair[1], joiner)
        counts = {}
        for a, b in zip(text, text[1:]):
            counts[(a, b)] = counts.get((a, b), 0) + 1
    vocab = [chr(b) for b in range(256)] + [m[0] + m[1] for m in merges if len(m[0] + m[1]) > 1]
    return vocab, merges


SAMPLE = "the cat sat on the mat. the cat saw the other cat. " * 6


def make_good(tmp):
    vocab, merges = _train(tmp, SAMPLE, 120)
    target = len(vocab)
    vocab_path = write(
        os.path.join(tmp, "vocab.json"),
        json.dumps({str(i): t for i, t in enumerate(vocab)}, ensure_ascii=False),
    )
    merges_path = write(os.path.join(tmp, "merges.txt"), "\n".join(f"{a} {b}" for a, b in merges))
    sample_path = write(os.path.join(tmp, "sample.txt"), "the cat sat on the mat.")
    return {"vocab": vocab_path, "merges": merges_path, "sample": sample_path, "vocab_size": target}


def make_bad(tmp):
    """真实失败模式：词表漏掉部分字节 token（手工裁剪词表或存错格式），字节级覆盖被破坏。"""
    art = make_good(tmp)
    with open(art["vocab"], encoding="utf-8") as f:
        vocab = json.load(f)
    dropped = [k for k, v in vocab.items() if len(v) == 1 and ord(v) % 97 == 0]
    for k in dropped:
        del vocab[k]
    write(art["vocab"], json.dumps(vocab, ensure_ascii=False))
    art["vocab_size"] = len(vocab)
    return art


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--vocab", required=True)
    ap.add_argument("--merges", required=True)
    ap.add_argument("--sample", required=True)
    ap.add_argument("--vocab-size", type=int, default=2048)
    args = ap.parse_args()
    need(args.vocab, "vocab.json")
    need(args.merges, "merges.txt")
    need(args.sample, "样例文本")
    ok, msg = judge(
        {"vocab": args.vocab, "merges": args.merges, "sample": args.sample, "vocab_size": args.vocab_size}
    )
    report(ok, msg)
