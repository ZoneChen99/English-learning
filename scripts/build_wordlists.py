# 词库生成器：解析 KyleBing TSV + JSON，输出前端词书 JSON。
# 运行：python scripts/build_wordlists.py   （在 D:/work/English learning 目录下）
import json
import os
import re

ROOT = os.getcwd()
TSV_DIR = os.path.join(ROOT, ".src", "cet", "tsv")
JSON_DIR = os.path.join(ROOT, ".src", "cet", "json")
OUT = os.path.join(ROOT, "public", "data")
os.makedirs(OUT, exist_ok=True)

# TSV 词书（含音标/例句/真题，数据最富）
TSV_BOOKS = [
    ("cet4", "英语四级", "CET-4", "cet4.tsv"),
    ("cet6", "英语六级", "CET-6", "cet6.tsv"),
    ("ky", "考研英语", "考研", "ky.tsv"),
    ("toefl", "托福", "TOEFL", "toefl.tsv"),
    ("ielts", "雅思", "IELTS", "ielts.tsv"),
]
# JSON 词书（词+释义+短语，无音标例句 → 用 TSV 字典富化）
JSON_BOOKS = [
    ("junior", "初中英语", "初中", "1-初中-顺序.json"),
    ("senior", "高中英语", "高中", "2-高中-顺序.json"),
    ("sat", "SAT 词汇", "SAT", "7-SAT-顺序.json"),
]
HF_COUNT = 600  # 四级高频取前 N（按真题出现次数）

SEP_SENSE = "¦"
SEP_KV = "::"
EXAM_RE = re.compile(r"CET-?4", re.IGNORECASE)

# 词书展示顺序（首页/词书列表排列）
DISPLAY_ORDER = ["junior", "senior", "cet4-hf", "cet4", "cet6", "ky", "toefl", "ielts", "sat"]


def parse_senses(field):
    out = []
    if not field:
        return out
    for s in field.split(SEP_SENSE):
        parts = s.split(SEP_KV)
        if len(parts) >= 2:
            out.append(
                {
                    "pos": (parts[0] or "").strip(),
                    "cn": (parts[1] or "").strip(),
                    "en": (parts[2].strip() if len(parts) > 2 else ""),
                }
            )
    return out


def parse_examples(field):
    out = []
    if not field:
        return out
    for s in field.split(SEP_SENSE):
        parts = s.split(SEP_KV)
        en = parts[0].strip() if parts else ""
        zh = parts[1].strip() if len(parts) > 1 else ""
        if len(en) > 3:
            out.append({"en": en, "zh": zh})
    return out[:3]


def parse_line(line):
    cols = line.split("\t")
    if len(cols) < 6:
        return None
    word = (cols[0] or "").strip()
    if not word:
        return None
    uk = (cols[1] or "").split(";")[0].strip()
    phonetic = uk or (cols[2] or "").strip()
    s3 = parse_senses(cols[3])
    s6 = parse_senses(cols[6]) if len(cols) > 6 else []
    pos = s3[0]["pos"] if s3 else (s6[0]["pos"] if s6 else "")
    cn = []
    for s in s3 + s6:
        for part in s["cn"].split("；"):
            part = part.strip()
            if part:
                cn.append(part)
    en = []
    for s in s3 + s6:
        for part in s["en"].split(";"):
            part = part.strip()
            if part:
                en.append(part)
    translation = "；".join(dict.fromkeys(cn))
    definition = "; ".join(dict.fromkeys(en))
    examples = parse_examples(cols[5])
    return {
        "word": word,
        "phonetic": phonetic,
        "pos": pos,
        "definition": definition,
        "translation": translation,
        "examples": examples if examples else None,
    }


def load_tsv(path):
    """返回 (entries, raw_lines)，raw_lines[i] 与 entries[i] 一一对应（用于真题频次统计）"""
    entries, raws = [], []
    seen = set()
    with open(path, encoding="utf-8") as f:
        text = f.read()
    for line in text.split("\n"):
        if not line.strip():
            continue
        w = parse_line(line)
        if not w:
            continue
        k = w["word"].lower()
        if k in seen:
            continue
        seen.add(k)
        entries.append(w)
        raws.append(line)
    return entries, raws


def write_book(bid, name, short, words):
    payload = {"id": bid, "name": name, "short": short, "count": len(words), "words": words}
    with open(os.path.join(OUT, f"{bid}.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    return {"id": bid, "name": name, "short": short, "count": len(words)}


def main():
    meta = {}  # bid -> manifest item
    index = {}  # lowerWord -> bookId（首见词书）
    combined = {}  # lowerWord -> 富化词条（来自 5 本 TSV）

    # 1) TSV 词书（数据最富，优先入索引/富化字典）
    tsv_entries = {}  # bid -> entries
    for bid, name, short, fname in TSV_BOOKS:
        src = os.path.join(TSV_DIR, fname)
        if not os.path.exists(src):
            print(f"[skip] 找不到源文件：{src}")
            continue
        entries, _raws = load_tsv(src)
        tsv_entries[bid] = entries
        meta[bid] = write_book(bid, name, short, entries)
        for w in entries:
            k = w["word"].lower()
            if k not in combined:
                combined[k] = w
            if k not in index:
                index[k] = bid
        print(f"[write] {bid}.json -> {len(entries)} 词")

    # 2) 四级高频：按真题出现次数排序取前 N（cet4 TSV 含 'CET4' 真题引用）
    if "cet4" in tsv_entries:
        src = os.path.join(TSV_DIR, "cet4.tsv")
        entries, raws = load_tsv(src)
        ranked = sorted(zip(entries, raws), key=lambda er: -len(EXAM_RE.findall(er[1])))
        hf = [e for e, _r in ranked[:HF_COUNT]]
        meta["cet4-hf"] = write_book("cet4-hf", "四级高频", "高频", hf)
        # 这些词已在 cet4 索引中，不重复写入
        print(f"[write] cet4-hf.json -> {len(hf)} 词（按真题频次）")

    # 3) JSON 词书（初中/高中/SAT），用 combined 富化音标/例句/释义
    for bid, name, short, fname in JSON_BOOKS:
        src = os.path.join(JSON_DIR, fname)
        if not os.path.exists(src):
            print(f"[skip] 找不到源文件：{src}")
            continue
        with open(src, encoding="utf-8") as f:
            arr = json.load(f)
        words = []
        seen = set()
        enriched = 0
        for item in arr:
            w = (item.get("word") or "").strip()
            if not w:
                continue
            k = w.lower()
            if k in seen:
                continue
            seen.add(k)
            trs = item.get("translations") or []
            pos = (trs[0].get("type") or "").strip() if trs else ""
            cn = "；".join(
                dict.fromkeys(
                    t.get("translation", "").strip()
                    for t in trs
                    if t.get("translation", "").strip()
                )
            )
            base = combined.get(k)
            if base:
                entry = {
                    "word": w,
                    "phonetic": base["phonetic"],
                    "pos": base["pos"] or pos,
                    "definition": base["definition"],
                    "translation": base["translation"] or cn,
                    "examples": base["examples"],
                }
                enriched += 1
            else:
                entry = {
                    "word": w,
                    "phonetic": "",
                    "pos": pos,
                    "definition": "",
                    "translation": cn,
                    "examples": None,
                }
            words.append(entry)
        meta[bid] = write_book(bid, name, short, words)
        for w in words:
            k = w["word"].lower()
            if k not in index:
                index[k] = bid
        print(f"[write] {bid}.json -> {len(words)} 词（富化 {enriched}）")

    # 4) manifest 按展示顺序输出
    manifest = [meta[b] for b in DISPLAY_ORDER if b in meta]
    with open(os.path.join(OUT, "books.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT, "words-index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, sort_keys=True)
    print(f"[write] words-index.json -> {len(index)} 词条")
    print("[done] " + ", ".join(f"{m['id']}({m['count']})" for m in manifest))


if __name__ == "__main__":
    main()
