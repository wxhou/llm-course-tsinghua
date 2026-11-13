"""5.2 · 轨迹可回放：步数连续、每步可重放、终止条件自洽。

轨迹文件约定（JSON）：
  {"max_steps": N, "initial_observation": "…",
   "steps": [{"step": 0, "action": "…", "observation": "…", "reward": 0.0, "done": false}, …]}
可回放的含义：从 initial_observation 出发、按顺序重放 action 即可复现同一串 observation。
"""

import argparse
import json

from _lib import need, report, run_self_test, self_test_requested


def judge(art):
    with open(art["traj"], encoding="utf-8") as f:
        try:
            traj = json.load(f)
        except json.JSONDecodeError as e:
            return False, f"轨迹不是合法 JSON：{e}"
    if not isinstance(traj, dict):
        return False, "轨迹应是对象"
    if not str(traj.get("initial_observation", "")).strip():
        return False, "缺少非空的 initial_observation（没有起点无法回放）"
    try:
        max_steps = int(traj["max_steps"])
    except (KeyError, TypeError, ValueError):
        return False, "缺少整数 max_steps"

    steps = traj.get("steps")
    if not isinstance(steps, list) or not steps:
        return False, "steps 为空"
    if len(steps) > max_steps:
        return False, f"轨迹有 {len(steps)} 步，超过 max_steps={max_steps}"

    for i, s in enumerate(steps):
        if not isinstance(s, dict):
            return False, f"steps[{i}] 不是对象"
        if s.get("step") != i:
            return False, f"steps[{i}] 的 step={s.get('step')!r}，应为 {i}（步号必须从 0 连续）"
        if not str(s.get("action", "")).strip():
            return False, f"steps[{i}] 没有 action，无法重放"
        if "observation" not in s:
            return False, f"steps[{i}] 没有 observation，无法核对重放结果"
        if "reward" not in s:
            return False, f"steps[{i}] 没有 reward"
        if s.get("done") and i != len(steps) - 1:
            return False, f"steps[{i}] 标记 done 却不是最后一步（提前终止与记录不符）"

    last = steps[-1]
    if not last.get("done") and len(steps) != max_steps:
        return False, f"轨迹未结束（done=false）却只有 {len(steps)} 步，max_steps={max_steps}"

    return True, f"{len(steps)} 步可回放；终止于 {'done' if last.get('done') else 'max_steps'}"


def _make(tmp, good):
    steps = [
        {"step": 0, "action": "submit(3)", "observation": "wrong: 3", "reward": 0.0, "done": False},
        {"step": 1, "action": "submit(4)", "observation": "correct: 4", "reward": 1.0, "done": True},
    ]
    if not good:
        steps[1]["done"] = False
        steps[0]["done"] = True  # 中间步被标记终止
        steps[1]["step"] = 1
    path = f"{tmp}/traj_{'good' if good else 'bad'}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"max_steps": 2, "initial_observation": "2+2=?", "steps": steps}, f, ensure_ascii=False)
    return {"traj": path}


def make_good(tmp):
    return _make(tmp, True)


def make_bad(tmp):
    return _make(tmp, False)


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--traj", required=True)
    args = ap.parse_args()
    need(args.traj, "轨迹文件")
    ok, msg = judge({"traj": args.traj})
    report(ok, msg)
