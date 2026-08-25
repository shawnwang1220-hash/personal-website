import pymupdf

path = r'C:/Users/wdly0/Desktop/王天旭简历-20260820.pdf'
doc = pymupdf.open(path)
page = doc[0]
r = page.rect
print("page rect:", r)

# bottom half
clip = pymupdf.Rect(r.x0, (r.y0 + r.y1) / 2, r.x1, r.y1)
pix = page.get_pixmap(dpi=160, clip=clip)
out = r'C:/Users/wdly0/WorkBuddy/2026-08-21-14-25-47/resume_bottom.png'
pix.save(out)
print("saved bottom:", out, pix.width, "x", pix.height)

# full text in reading order (dict) gives some structure
print("\n=== FULL TEXT (raw) ===")
print(page.get_text("text"))

print("\n=== TEXT DICT (blocks) ===")
d = page.get_text("dict")
for block in d["blocks"]:
    if block.get("type") != 0:
        continue
    for line in block.get("lines", []):
        spans = line.get("spans", [])
        text = "".join(s["text"] for s in spans)
        if text.strip():
            print("[y%.0f] %s" % (spans[0]["bbox"][1], text.strip()))
