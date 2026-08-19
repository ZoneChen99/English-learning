#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为 vlog 文稿生成字幕时间戳（start/end，单位秒），并写入关联视频引用。

设计原则：
- 幂等：若句子已有 start/end 则保留，不覆盖（便于人工校准后重跑）。
- 可复现：按句序均匀分配时间轴（每句 6s 内容 + 0.5s 间隔）。
- 自校验：运行后校验时间戳单调递增、end>start、video 字段合法。

注意：这里的时间戳是基于"句序"的估算占位，用于驱动字幕跟随与点句跳转的
机制验证。接入真实视频后，应使用按真实语音对齐的时间戳（可手工替换或通过
字幕文件解析注入，本脚本不破坏已有手工校准值）。
"""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data", "vlogs")

# 公开可嵌入的 YouTube 测试视频（Big Buck Bunny），仅用于验证播放器跟随/跳转机制。
# 接入真实 vlog 时，将对应条目的 video 改为 {provider:"youtube"|"bilibili", id:"真实ID"}。
DEMO_VIDEO = {"provider": "youtube", "id": "aqz-KE-bpKQ"}

# 仅为 beijing 关联 demo 视频；其余两篇保持无视频（纯文稿模式）。
VIDEO_FOR = {
    "beijing": DEMO_VIDEO,
    "shanghai": None,
    "safe-china": None,
}

SENTENCE_DURATION = 6.0
GAP = 0.5


def process(name: str, video: dict | None):
    path = os.path.join(DATA_DIR, f"{name}.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    sentences = data["sentences"]
    t = 0.0
    for s in sentences:
        if "start" not in s or "end" not in s:
            s["start"] = round(t, 2)
            s["end"] = round(t + SENTENCE_DURATION, 2)
            t += SENTENCE_DURATION + GAP
        else:
            # 已有手工校准值，沿用并续接时间轴
            t = s["end"] + GAP

    if video:
        data["video"] = video
    else:
        data.pop("video", None)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[write] {name}: {len(sentences)} 句, video={data.get('video')}")


def validate():
    ok = True
    for name in VIDEO_FOR:
        path = os.path.join(DATA_DIR, f"{name}.json")
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        prev_end = -1.0
        for i, s in enumerate(data["sentences"]):
            if "start" not in s or "end" not in s:
                print(f"[FAIL] {name}#{i} 缺少时间戳"); ok = False; continue
            if not (s["end"] > s["start"]):
                print(f"[FAIL] {name}#{i} end<=start"); ok = False
            if s["start"] < prev_end - 0.01:
                print(f"[FAIL] {name}#{i} 时间戳未单调"); ok = False
            prev_end = s["end"]
        if "video" in data:
            v = data["video"]
            if v.get("provider") not in ("youtube", "bilibili"):
                print(f"[FAIL] {name} provider 非法"); ok = False
            if not v.get("id"):
                print(f"[FAIL] {name} video.id 为空"); ok = False
    if ok:
        print("[validate] 全部时间戳与视频引用校验通过 ✅")
    else:
        raise SystemExit("[validate] 校验未通过 ❌")


if __name__ == "__main__":
    for n, v in VIDEO_FOR.items():
        process(n, v)
    validate()
