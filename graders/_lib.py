"""grader 公共约定：退出码即判定（0 通过 / 1 不通过 / 2 无法判定），单行输出 `PASS|FAIL|ERROR: 原因`。

每个 grader 用 `python graders/<name>.py --self-test` 自证其判定逻辑：进程内造一份合法产物断言判为通过，
再造一份损坏产物断言判为不通过——这样没人需要先交出产物就能确认判定有效。
"""

import os
import sys
import tempfile

EXIT_PASS, EXIT_FAIL, EXIT_ERROR = 0, 1, 2


def report(ok, msg):
    print(("PASS: " if ok else "FAIL: ") + msg)
    sys.exit(EXIT_PASS if ok else EXIT_FAIL)


def error(msg):
    print("ERROR: " + msg)
    sys.exit(EXIT_ERROR)


def need(path, what):
    """产物缺失属于「无法判定」，不是「不通过」——两者对读者意味着不同动作。"""
    if not path:
        error(f"未提供{what}路径")
    if not os.path.exists(path):
        error(f"找不到{what}：{path}")
    return path


def self_test_requested():
    return "--self-test" in sys.argv


def run_self_test(judge, make_good, make_bad):
    with tempfile.TemporaryDirectory() as tmp:
        good = judge(make_good(tmp))
        if not (isinstance(good, tuple) and good[0]):
            print(f"self-test 失败：合法产物被判为不通过（{good}）")
            sys.exit(EXIT_FAIL)
        bad = judge(make_bad(tmp))
        if not (isinstance(bad, tuple) and not bad[0]):
            print(f"self-test 失败：损坏产物被判为通过（{bad}）")
            sys.exit(EXIT_FAIL)
        print("PASS: self-test —— 合法产物通过、损坏产物不通过")
        sys.exit(EXIT_PASS)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path
