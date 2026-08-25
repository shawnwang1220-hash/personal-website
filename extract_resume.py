import glob, fitz, sys

files = glob.glob(r'C:/Users/wdly0/Desktop/*简历*.pdf')
if not files:
    print("NO PDF FOUND")
    sys.exit(1)
path = files[0]
print("FILE:", path)
doc = fitz.open(path)
print("PAGES:", doc.page_count)
for i, page in enumerate(doc):
    print(f"\n===== PAGE {i+1} =====")
    # blocks with coordinates help reconstruct layout
    blocks = page.get_text("blocks")
    blocks = [b for b in blocks if b[4].strip()]
    # sort top-to-bottom, then left-to-right
    blocks.sort(key=lambda b: (round(b[1]), b[0]))
    for b in blocks:
        txt = b[4].strip()
        if txt:
            print(txt)
