import * as fs from "fs";
import * as path from "path";

describe("Network InputFrame Contract Parity Gate", () => {
  it("packages/network/src/NetTypes.ts and server/src/NetTypes.ts must have identical InputFrame interfaces", () => {
    const clientNetTypesPath = path.resolve(__dirname, "../NetTypes.ts");
    const serverNetTypesPath = path.resolve(__dirname, "../../../../server/src/NetTypes.ts");

    expect(fs.existsSync(clientNetTypesPath)).toBe(true);
    expect(fs.existsSync(serverNetTypesPath)).toBe(true);

    const clientContent = fs.readFileSync(clientNetTypesPath, "utf-8");
    const serverContent = fs.readFileSync(serverNetTypesPath, "utf-8");

    const extractInputFrameBlock = (content: string) => {
      const match = content.match(/export\s+interface\s+InputFrame\s*\{([^}]+)\}/);
      if (!match) {
        throw new Error("Could not find 'export interface InputFrame' block in NetTypes.ts");
      }
      return match[1]
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*"))
        .sort()
        .join("\n");
    };

    const clientBlock = extractInputFrameBlock(clientContent);
    const serverBlock = extractInputFrameBlock(serverContent);

    expect(clientBlock).toEqual(serverBlock);
  });
});
