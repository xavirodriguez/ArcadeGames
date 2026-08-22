import * as fs from "fs";
import * as path from "path";

describe("Network InputFrame Contract Parity", () => {
  it("guarantees identical structural definition of InputFrame between client network package and server package", () => {
    const clientNetTypesPath = path.resolve(__dirname, "../../../packages/network/src/NetTypes.ts");
    const serverNetTypesPath = path.resolve(__dirname, "../../../server/src/NetTypes.ts");

    expect(fs.existsSync(clientNetTypesPath)).toBe(true);
    expect(fs.existsSync(serverNetTypesPath)).toBe(true);

    const clientContent = fs.readFileSync(clientNetTypesPath, "utf-8");
    const serverContent = fs.readFileSync(serverNetTypesPath, "utf-8");

    const extractInputFrameInterface = (fileContent: string): string => {
      const match = fileContent.match(/export\s+interface\s+InputFrame\s*\{([^}]+)\}/);
      if (!match) {
        throw new Error("Could not locate 'export interface InputFrame' block");
      }
      return match[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("/*") && !line.startsWith("*") && !line.startsWith("//"))
        .sort()
        .join("\n");
    };

    const clientFields = extractInputFrameInterface(clientContent);
    const serverFields = extractInputFrameInterface(serverContent);

    expect(clientFields).toBe(serverFields);
  });
});
