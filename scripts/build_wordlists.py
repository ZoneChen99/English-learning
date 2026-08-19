# 词库生成器（Python 版）：解析 KyleBing 正序 TSV，输出前端词书 JSON。
# 运行：python scripts/build_wordlists.py   （在 D:/work/English learning 目录下）
import json
import os

ROOT = os.getcwd()
SRC_DIR = os.path.join(ROOT, ".src", "cet", "tsv")  # ASCII 命名副本
OUT = os.path.join(ROOT, "public", "data")
os.makedirs(OUT, exist_ok=True)

# (id, 名称, 简称, 源文件名)
BOOKS = [
    ("cet4", "英语四级", "CET-4", "cet4.tsv"),
    ("cet6", "英语六级", "CET-6", "cet6.tsv"),
    ("ky", "考研英语", "考研", "ky.tsv"),
    ("toefl", "托福", "TOEFL", "toefl.tsv"),
    ("ielts", "雅思", "IELTS", "ielts.tsv"),
]

SEP_SENSE = "¦"  # 分隔多个义项/例句（broken bar）
SEP_KV = "::"


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
    s6 = parse_senses(cols[6])
    pos = s3[0]["pos"] if s3 else (s6[0]["pos"] if s6 else "")
    # 按「；」拆细各义项再做整体去重，避免重复释义
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


def main():
    manifest = []
    for bid, name, short, fname in BOOKS:
        src = os.path.join(SRC_DIR, fname)
        if not os.path.exists(src):
            print(f"[skip] 找不到源文件：{src}")
            continue
        with open(src, encoding="utf-8") as f:
            text = f.read()
        seen = set()
        words = []
        skipped = 0
        for line in text.split("\n"):
            if not line.strip():
                continue
            w = parse_line(line)
            if not w:
                skipped += 1
                continue
            key = w["word"].lower()
            if key in seen:
                continue
            seen.add(key)
            words.append(w)
        payload = {"id": bid, "name": name, "short": short, "count": len(words), "words": words}
        with open(os.path.join(OUT, f"{bid}.json"), "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
        manifest.append({"id": bid, "name": name, "short": short, "count": len(words)})
        print(f"[write] {bid}.json -> {len(words)} 词（跳过 {skipped} 行）")
    with open(os.path.join(OUT, "books.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("[done] " + ", ".join(f"{m['id']}({m['count']})" for m in manifest))


if __name__ == "__main__":
    main()
