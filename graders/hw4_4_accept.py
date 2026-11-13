"""4.4 · PA4 交付验收：三条训练路线产物、统一评测、人工检视记录。

交付目录约定：
  sft/ dpo/ grpo/   —— 每条路线各有 checkpoint 或训练记录（目录非空）
  eval.json         —— {"holdout_size": N, "routes": {"sft": acc, "dpo": acc, "grpo": acc}}
  review.md         —— 人工检视 ≥20 条（每条一行，以 "-" 或编号开头）
"""

import argparse
import json
import os
import re

from _lib import need, report, run_self_test, self_test_requested

ROUTES = ("sft", "dpo", "grpo")
MIN_REVIEW = 20
ITEM = re.compile(r"^\s*(?:[-*]|\d+[.)])\s+\S")


def judge(art):
    d = art["artifacts"]
    for route in ROUTES:
        p = os.path.join(d, route)
        if not os.path.isdir(p):
            return False, f"缺少 {route}/ 目录"
        if not any(os.scandir(p)):
            return False, f"{route}/ 是空目录（没有 checkpoint 或训练记录）"

    eval_p = os.path.join(d, "eval.json")
    if not os.path.exists(eval_p):
        return False, "缺少 eval.json"
    with open(eval_p, encoding="utf-8") as f:
        try:
            ev = json.load(f)
        except json.JSONDecodeError as e:
            return False, f"eval.json 不是合法 JSON：{e}"
    routes = ev.get("routes") if isinstance(ev, dict) else None
    if not isinstance(routes, dict):
        return False, "eval.json 缺少 routes 对象"
    for route in ROUTES:
        if route not in routes:
            return False, f"eval.json 缺少 {route} 的评测结果"
        try:
            acc = float(routes[route])
        except (TypeError, ValueError):
            return False, f"{route} 的评测值不是数字：{routes[route]!r}"
        if not 0.0 <= acc <= 1.0:
            return False, f"{route} 的准确率 {acc} 不在 [0,1] 内"
    try:
        holdout = int(ev.get("holdout_size", 0))
    except (TypeError, ValueError):
        holdout = 0
    if holdout <= 0:
        return False, "eval.json 没有报告留出集大小 holdout_size"

    review_p = os.path.join(d, "review.md")
    if not os.path.exists(review_p):
        return False, "缺少 review.md"
    with open(review_p, encoding="utf-8", errors="replace") as f:
        items = [ln for ln in f.read().splitlines() if ITEM.match(ln)]
    if len(items) < MIN_REVIEW:
        return False, f"人工检视只有 {len(items)} 条（需 ≥{MIN_REVIEW}）"

    return True, f"三条路线齐备；留出集 {holdout} 条；人工检视 {len(items)} 条"


def _make(tmp, good):
    d = os.path.join(tmp, "good" if good else "bad")
    for route in ROUTES:
        p = os.path.join(d, route)
        os.makedirs(p, exist_ok=True)
        if good or route != "grpo":
            with open(os.path.join(p, "train_log.jsonl"), "w", encoding="utf-8") as f:
                f.write('{"step": 1, "loss": 2.1}\n{"step": 2, "loss": 1.8}\n')
    with open(os.path.join(d, "eval.json"), "w", encoding="utf-8") as f:
        json.dump({"holdout_size": 200, "routes": {"sft": 0.61, "dpo": 0.66, "grpo": 0.71}}, f)
    with open(os.path.join(d, "review.md"), "w", encoding="utf-8") as f:
        f.write("# 人工检视\n" + "\n".join(f"- 第 {i} 条：回答切题，推理链完整。" for i in range(1, 25)) + "\n")
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
