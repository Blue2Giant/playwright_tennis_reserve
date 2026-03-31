# download_and_diversify.py
# pip install requests pillow imagehash tqdm scikit-learn numpy

import os, re, csv, hashlib
from io import BytesIO
import requests
from PIL import Image
from tqdm import tqdm
import numpy as np
import imagehash
from sklearn.cluster import KMeans

OUT_DIR = "style_images"
TARGET_N = 300
TIMEOUT = 20

os.makedirs(OUT_DIR, exist_ok=True)

def load_urls(path):
    urls = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: 
                continue
            # allow csv "url,..." too
            if "," in line and line.startswith("http"):
                urls.append(line.split(",")[0].strip())
            elif line.startswith("http"):
                urls.append(line)
    # de-dup while keeping order
    seen = set()
    uniq = []
    for u in urls:
        if u not in seen:
            uniq.append(u); seen.add(u)
    return uniq

def fetch_image(url):
    r = requests.get(url, timeout=TIMEOUT, headers={"User-Agent":"Mozilla/5.0"})
    r.raise_for_status()
    img = Image.open(BytesIO(r.content)).convert("RGB")
    return img, r.content

def sha1_bytes(b):
    return hashlib.sha1(b).hexdigest()

def save_image(img, filename):
    img.save(filename, quality=95)

def image_feature(img):
    # simple style-ish feature: resized pixels + color stats
    small = img.resize((96, 96))
    arr = np.asarray(small).astype(np.float32) / 255.0
    mean = arr.mean(axis=(0,1))
    std  = arr.std(axis=(0,1))
    feat = np.concatenate([mean, std, arr.reshape(-1)])
    return feat

def main(urls_txt):
    urls = load_urls(urls_txt)

    # step1: download candidates
    rows = []
    phash_seen = {}
    byte_seen = set()

    for url in tqdm(urls, desc="Downloading"):
        try:
            img, content = fetch_image(url)
            if img.width < 256 or img.height < 256:
                continue

            h1 = sha1_bytes(content)
            if h1 in byte_seen:
                continue
            byte_seen.add(h1)

            ph = str(imagehash.phash(img))
            # strict de-dup by pHash (can loosen by distance if you want)
            if ph in phash_seen:
                continue
            phash_seen[ph] = url

            rows.append({"url": url, "img": img, "sha1": h1, "phash": ph})
        except Exception:
            continue

    if len(rows) == 0:
        raise RuntimeError("No images downloaded. Check your URL list / network / permissions.")

    # step2: diversify by clustering
    feats = []
    for r in tqdm(rows, desc="Featurizing"):
        feats.append(image_feature(r["img"]))
    feats = np.stack(feats)

    k = min(40, len(rows))  # 40 clusters gives decent variety
    km = KMeans(n_clusters=k, random_state=0, n_init="auto").fit(feats)
    labels = km.labels_

    # round-robin pick from each cluster to maximize diversity
    buckets = {}
    for i, lab in enumerate(labels):
        buckets.setdefault(lab, []).append(i)

    picked = []
    # shuffle inside buckets
    for lab in buckets:
        np.random.shuffle(buckets[lab])

    while len(picked) < min(TARGET_N, len(rows)):
        progressed = False
        for lab in list(buckets.keys()):
            if buckets[lab]:
                picked.append(buckets[lab].pop())
                progressed = True
                if len(picked) >= min(TARGET_N, len(rows)):
                    break
        if not progressed:
            break

    # step3: save
    meta_path = os.path.join(OUT_DIR, "meta.csv")
    with open(meta_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["filename","url","sha1","phash","w","h"])
        for idx, i in enumerate(tqdm(picked, desc="Saving")):
            r = rows[i]
            img = r["img"]
            # optional: normalize size (keep aspect)
            img2 = img.copy()
            img2.thumbnail((1024, 1024))
            fn = f"{idx:04d}.jpg"
            fp = os.path.join(OUT_DIR, fn)
            save_image(img2, fp)
            w.writerow([fn, r["url"], r["sha1"], r["phash"], img2.width, img2.height])

    print(f"Saved {len(picked)} images to {OUT_DIR}/ and metadata to {meta_path}")

if __name__ == "__main__":
    # usage: python download_and_diversify.py urls.txt
    import sys
    if len(sys.argv) < 2:
        print("Usage: python download_and_diversify.py urls.txt")
        raise SystemExit(1)
    main(sys.argv[1])
