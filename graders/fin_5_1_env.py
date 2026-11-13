"""5.1 · 环境契约：schema 必填字段、题目数量与唯一 id、verifier 可定位、数据泄露审计。

环境目录约定：
  schema.json   —— {"name", "action_space", "observation_space", "max_steps", "verifier"}
  tasks.jsonl   —— 10–20 行，每行 {"id", "prompt", "gold"}，id 互不相同
  LEAKAGE.md    —— 数据泄露审计说明
"""

import argparse
import json
import os

from _lib import need, report, run_self_test, self_test_requested

FIELDS = ("name", "action_space", "observation_space", "max_steps", "verifier")
MIN_TASKS, MAX_TASKS = 10, 20


def judge(art):
    d = art["env"]
    schema_p = os.path.join(d, "schema.json")
    tasks_p = os.path.join(d, "tasks.jsonl")
    leak_p = os.path.join(d, "LEAKAGE.md")
    for p in (schema_p, tasks_p, leak_p):
        if not os.path.exists(p):
            return False, f"环境目录缺少 {os.path.basename(p)}"

    with open(schema_p, encoding="utf-8") as f:
        try:
            schema = json.load(f)
        except json.JSONDecodeError as e:
            return False, f"schema.json 不是合法 JSON：{e}"
    if not isinstance(schema, dict):
        return False, "schema.json 应是对象"
    missing = [k for k in FIELDS if k not in schema]
    if missing:
        return False, f"schema 缺少字段：{', '.join(missing)}"
    try:
        if int(schema["max_steps"]) <= 0:
            return False, "max_steps 必须为正"
    except (TypeError, ValueError):
        return False, f"max_steps 不是整数：{schema['max_steps']!r}"

    verifier = os.path.join(d, str(schema["verifier"]))
    if not os.path.exists(verifier):
        return False, f"schema.verifier 指向的文件不存在：{schema['verifier']}"

    ids, n = set(), 0
    with open(tasks_p, encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            if not line.strip():
                continue
            try:
                t = json.loads(line)
            except json.JSONDecodeError as e:
                return False, f"tasks.jsonl 第 {i} 行不是合法 JSON：{e}"
            for k in ("id", "prompt", "gold"):
                if k not in t:
                    return False, f"tasks.jsonl 第 {i} 行缺少 {k}"
            if t["id"] in ids:
                return False, f"任务 id 重复：{t['id']!r}"
            ids.add(t["id"])
            n += 1
    if not MIN_TASKS <= n <= MAX_TASKS:
        return False, f"题目数量 {n} 不在 {MIN_TASKS}–{MAX_TASKS} 之间"

    with open(leak_p, encoding="utf-8", errors="replace") as f:
        leak = f.read().strip()
    if len(leak) < 50:
        return False, "LEAKAGE.md 太短，没有实质的泄露审计说明"

    return True, f"schema 齐备；{n} 道题、id 唯一；verifier 存在；泄露审计 {len(leak)} 字符"


def _make(tmp, good):
    d = os.path.join(tmp, "good" if good else "bad")
    os.makedirs(os.path.join(d, "tasks"), exist_ok=True)
    with open(os.path.join(d, "schema.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "name": "arith-env",
                "action_space": "submit(answer: str)",
                "observation_space": "prompt: str",
                "max_steps": 8,
                "verifier": "tasks/verify.py",
            },
            f,
        )
    with open(os.path.join(d, "tasks", "verify.py"), "w", encoding="utf-8") as f:
        f.write("import sys\nsys.exit(0)\n")
    n = 15 if good else 25
    with open(os.path.join(d, "tasks.jsonl"), "w", encoding="utf-8") as f:
        for i in range(n):
            f.write(json.dumps({"id": f"t{i:02d}", "prompt": f"{i}+1=?", "gold": i + 1}) + "\n")
    with open(os.path.join(d, "LEAKAGE.md"), "w", encoding="utf-8") as f:
        f.write("题目全部由模板程序生成，gold 由同一程序计算；训练集与评测集按 (a,b) 区间不相交切分，无泄露。\n")
    return {"env": d}


def make_good(tmp):
    return _make(tmp, True)


def make_bad(tmp):
    return _make(tmp, False)


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", required=True)
    args = ap.parse_args()
    need(args.env, "环境目录")
    ok, msg = judge({"env": args.env})
    report(ok, msg)
