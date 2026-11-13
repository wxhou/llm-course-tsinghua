"""5.3 · FINAL 交付验收：环境、轨迹、self-judge 对比报告、judge 校准报告。

交付目录约定：
  env/            —— 可验证环境（至少含 schema.json 与 tasks.jsonl）
  traj.json       —— 至少一条可回放轨迹
  compare.md      —— self-judge 前后通过率的对比数字
  calibration.md  —— judge 的混淆矩阵或等价指标（precision/recall/准确率）
"""

import argparse
import json
import os
import re

from _lib import need, report, run_self_test, self_test_requested

PCT = re.compile(r"\d+(?:\.\d+)?\s*%")


def _text(p):
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()


def judge(art):
    d = art["artifacts"]
    env = os.path.join(d, "env")
    for name in ("schema.json", "tasks.jsonl"):
        p = os.path.join(env, name)
        if not os.path.exists(p):
            return False, f"env/ 缺少 {name}"

    traj_p = os.path.join(d, "traj.json")
    if not os.path.exists(traj_p):
        return False, "缺少 traj.json"
    with open(traj_p, encoding="utf-8") as f:
        try:
            traj = json.load(f)
        except json.JSONDecodeError as e:
            return False, f"traj.json 不是合法 JSON：{e}"
    steps = traj.get("steps") if isinstance(traj, dict) else None
    if not isinstance(steps, list) or not steps:
        return False, "traj.json 没有 steps"

    compare_p = os.path.join(d, "compare.md")
    if not os.path.exists(compare_p):
        return False, "缺少 compare.md"
    compare = _text(compare_p)
    if "self-judge" not in compare.lower():
        return False, "compare.md 没有出现 self-judge 对比"
    if len(PCT.findall(compare)) < 2:
        return False, "compare.md 没有给出前后两组通过率数字（至少两个百分比）"

    cal_p = os.path.join(d, "calibration.md")
    if not os.path.exists(cal_p):
        return False, "缺少 calibration.md"
    cal = _text(cal_p)
    if not re.search(r"混淆矩阵|precision|recall|精确率|召回率|准确率", cal, re.IGNORECASE):
        return False, "calibration.md 没有给出 judge 的校准指标"

    return True, f"环境齐备、轨迹 {len(steps)} 步、对比含 {len(PCT.findall(compare))} 个通过率数字、校准报告齐备"


def _make(tmp, good):
    d = os.path.join(tmp, "good" if good else "bad")
    os.makedirs(os.path.join(d, "env"), exist_ok=True)
    with open(os.path.join(d, "env", "schema.json"), "w", encoding="utf-8") as f:
        json.dump({"name": "arith-env", "max_steps": 8}, f)
    with open(os.path.join(d, "env", "tasks.jsonl"), "w", encoding="utf-8") as f:
        f.write(json.dumps({"id": "t0", "prompt": "2+2=?", "gold": 4}) + "\n")
    with open(os.path.join(d, "traj.json"), "w", encoding="utf-8") as f:
        json.dump({"max_steps": 2, "initial_observation": "2+2=?", "steps": [
            {"step": 0, "action": "submit(3)", "observation": "wrong", "reward": 0.0, "done": False},
            {"step": 1, "action": "submit(4)", "observation": "correct", "reward": 1.0, "done": True},
        ]}, f)
    body = (
        "不用 self-judge 时通过率 41.5%，接入 harness 的 self-judge 后通过率 68.0%。"
        if good
        else "不用 self-judge 时表现一般，接入后明显变好，但没留下具体数字。"
    )
    with open(os.path.join(d, "compare.md"), "w", encoding="utf-8") as f:
        f.write(body + "\n")
    with open(os.path.join(d, "calibration.md"), "w", encoding="utf-8") as f:
        f.write("混淆矩阵：TP=61, FP=7, TN=120, FN=12；judge 的精确率 0.90，召回率 0.84。\n")
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
