"""5.3 · judge 校准报告：留出集上的混淆矩阵、一致率与判定阈值必须自洽。

报告约定（calibration.json）：
  {"judge_model": "…", "n_samples": 30, "threshold": 0.5,
   "confusion": {"tp": 12, "fp": 4, "tn": 10, "fn": 4}, "agreement": 0.7333}
agreement 按 (tp + tn) / n_samples 计算，与混淆矩阵一致才说明这张表是真数出来的。
"""

import argparse
import json

from _lib import need, report, run_self_test, self_test_requested


def judge(art):
    with open(art["calib"], encoding="utf-8") as f:
        try:
            calib = json.load(f)
        except json.JSONDecodeError as e:
            return False, f"校准报告不是合法 JSON：{e}"
    if not isinstance(calib, dict):
        return False, "校准报告应是对象"

    if not str(calib.get("judge_model", "")).strip():
        return False, "缺少 judge_model（换了模型或提示词，校准表就作废）"

    n = calib.get("n_samples")
    if not isinstance(n, int) or isinstance(n, bool):
        return False, "n_samples 应是整数"
    if n < 20:
        return False, f"n_samples={n} 太小，校准结果不可信（至少 20）"

    thr = calib.get("threshold")
    if not isinstance(thr, (int, float)) or isinstance(thr, bool) or not 0 < thr < 1:
        return False, f"threshold={thr!r} 应落在开区间 (0, 1)"

    conf = calib.get("confusion")
    if not isinstance(conf, dict):
        return False, "缺少 confusion（tp/fp/tn/fn 四格）"
    for k in ("tp", "fp", "tn", "fn"):
        v = conf.get(k)
        if not isinstance(v, int) or isinstance(v, bool) or v < 0:
            return False, f"confusion.{k}={v!r} 应是非负整数"
    total = sum(conf[k] for k in ("tp", "fp", "tn", "fn"))
    if total != n:
        return False, f"混淆矩阵四格合计 {total}，与 n_samples={n} 对不上"

    agreement = calib.get("agreement")
    if not isinstance(agreement, (int, float)) or isinstance(agreement, bool):
        return False, "缺少 agreement（一致率）"
    expected = (conf["tp"] + conf["tn"]) / n
    if abs(agreement - expected) > 0.01:
        return False, f"agreement={agreement}，但混淆矩阵算出来是 {expected:.4f}（对不上，像是手填的）"

    return True, f"n={n}，一致率 {agreement:.3f}，阈值 {thr}；混淆矩阵与样本数自洽"


def _make(tmp, good):
    calib = {
        "judge_model": "judge-a",
        "n_samples": 30,
        "threshold": 0.5,
        "confusion": {"tp": 12, "fp": 4, "tn": 10, "fn": 4},
        "agreement": 0.7333,
    }
    if not good:
        calib["agreement"] = 0.95  # 与 (tp+tn)/n 对不上
    path = f"{tmp}/calibration_{'good' if good else 'bad'}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(calib, f, ensure_ascii=False)
    return {"calib": path}


def make_good(tmp):
    return _make(tmp, True)


def make_bad(tmp):
    return _make(tmp, False)


if __name__ == "__main__":
    if self_test_requested():
        run_self_test(judge, make_good, make_bad)
    ap = argparse.ArgumentParser()
    ap.add_argument("--calib", required=True)
    args = ap.parse_args()
    need(args.calib, "校准报告")
    ok, msg = judge({"calib": args.calib})
    report(ok, msg)
