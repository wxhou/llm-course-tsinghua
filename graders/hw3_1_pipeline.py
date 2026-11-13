"""3.1 · 数据管线统计自洽：过滤只减不增，且各项减少量之和等于总减少量。

产物：stats.json = {"before_tokens": N, "after_tokens": M, "dedup_removed": d, "rule_hits": {"规则名": 命中数}}。
去重与各规则命中互斥计数（同一条文档只记首个命中的规则），因此 d + Σrule_hits 必须正好等于 N − M。
"""

import argparse
import json

from _lib import need, report, run_self_test, self_test_requested


def judge(art):
    with open(art["stats"], encoding="utf-8") as f:
        s = json.load(f)
    try:
        before = int(s["before_tokens"])
        after = int(s["after_tokens"])
        dedup = int(s["dedup_removed"])
        hits = s["rule_hits"]
    except (KeyError, TypeError, ValueError) as e:
        return False, f"stats.json 字段缺失或类型不对：{e!r}"
    if not isinstance(hits, dict):
        return False, "rule_hits 应是 {规则名: 命中数} 的对象"
    try:
        total_hits = sum(int(v) for v in hits.values())
    except (TypeError, ValueError):
        return False, "rule_hits 里含有非整数的命中数"

    if before <= 0:
        return False, f"过滤前 token 数为 {before}，统计没有意义"
    if after > before:
        return False, f"过滤后 {after:,} 多于过滤前 {before:,}（管线在加数据？）"
    removed = before - after
    if dedup + total_hits != removed:
        return False, (
            f"账不平：去重 {dedup:,} + 规则命中 {total_hits:,} = {dedup + total_hits:,}，"
            f"但总减少 {removed:,}（差 {removed - dedup - total_hits:+,}）"
        )
    return True, f"{before:,} → {after:,}（-{removed:,}），去重 {dedup:,} + 规则 {total_hits:,}，账目自洽"


def _write(tmp, data, name):
    path = f"{tmp}/{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return path


GOOD = {
    "before_tokens": 1_000_000,
    "after_tokens": 812_000,
    "dedup_removed": 41_000,
    "rule_hits": {"去样板": 33_500, "去重复行": 52_000, "长度过滤": 61_500},
}


def make_good(tmp):
    return {"stats": _write(tmp, GOOD, "pipe_good")}


def make_bad(tmp):
    bad = json.loads(json.dumps(GOOD))
    bad["rule_hits"]["去样板"] += 1_200  # 典型错误：规则重叠计数，同一文档被算两次
    return {"stats": _write(tmp, bad, "pipe_bad")}


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--stats", required=True)
    args = ap.parse_args()
    need(args.stats, "stats.json")
    ok, msg = judge({"stats": args.stats})
    report(ok, msg)
