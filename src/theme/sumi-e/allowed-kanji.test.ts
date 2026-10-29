import fs from "node:fs";
import path from "node:path";

const ALLOWED_FILE = path.join(__dirname, "allowed-kanji.txt");
const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

function loadAllowed(): Set<string> {
  const text = fs.readFileSync(ALLOWED_FILE, "utf8");
  const set = new Set<string>();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    for (const ch of t) {
      if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch)) set.add(ch);
    }
  }
  return set;
}

describe("allowed-kanji", () => {
  it("every CJK literal under src/ is in allowed-kanji.txt", () => {
    const allowed = loadAllowed();
    const srcRoot = path.join(__dirname, "..", "..");
    const offenders: string[] = [];
    function walk(dir: string): void {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) {
          if (["node_modules", "dist", "__tests__", "test"].includes(name)) continue;
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(name) || name.includes(".test.")) continue;
        const content = fs.readFileSync(full, "utf8");
        let m: RegExpExecArray | null;
        CJK_RE.lastIndex = 0;
        while ((m = CJK_RE.exec(content)) !== null) {
          if (!allowed.has(m[0])) offenders.push(`${path.relative(srcRoot, full)}: ${m[0]}`);
        }
      }
    }
    walk(srcRoot);
    expect(offenders).toEqual([]);
  });
});
