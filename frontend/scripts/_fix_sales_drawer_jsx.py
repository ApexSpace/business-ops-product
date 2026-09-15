from pathlib import Path

p = Path(
    r"S:\Programming\FreeLProj\business-ops-product\frontend\features\sales\components\sales-workspace.tsx"
)
text = p.read_text(encoding="utf-8")

text2 = text.replace(
    ") : (\n          {selectedId && sale && saleDetailProps ? (\n          saleEditMode ? (",
    ") : selectedId && sale && saleDetailProps ? (\n          saleEditMode ? (",
    1,
)
text2 = text2.replace(
    "          )\n        ) : null}\n        )}\n      </DrawerShell>",
    "          )\n        ) : null}\n      </DrawerShell>",
    1,
)

if text2 == text:
    # try alternate closing pattern
    text2 = text.replace(
        ") : (\n          {selectedId && sale && saleDetailProps ? (",
        ") : selectedId && sale && saleDetailProps ? (",
        1,
    )
    text2 = text2.replace("\n        ) : null}\n        )}\n", "\n        ) : null}\n", 1)

print("changed", text2 != text)
lines = text2.splitlines()
for i in range(797, 850):
    if i < len(lines):
        print(f"{i+1}:{lines[i]}")

p.write_text(text2, encoding="utf-8")
