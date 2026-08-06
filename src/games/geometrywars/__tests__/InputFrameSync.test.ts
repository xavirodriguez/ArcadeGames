import * as fs from "fs";
import * as path from "path";

describe("InputFrame Sync Quality Gate", () => {
  it("should ensure packages/network/src/NetTypes.ts and server/src/NetTypes.ts declare structurally identical InputFrame interfaces", () => {
    // 1. Resolve absolute paths relative to this file
    const clientPath = path.resolve(__dirname, "../../../../packages/network/src/NetTypes.ts");
    const serverPath = path.resolve(__dirname, "../../../../server/src/NetTypes.ts");

    expect(fs.existsSync(clientPath)).toBe(true);
    expect(fs.existsSync(serverPath)).toBe(true);

    const clientContent = fs.readFileSync(clientPath, "utf-8");
    const serverContent = fs.readFileSync(serverPath, "utf-8");

    // 2. Extract the "InputFrame" interface block from both files
    const extractInterfaceBlock = (content: string): string => {
      const match = content.match(/export\s+interface\s+InputFrame\s*\{([\s\S]*?)\}/);
      if (!match) {
        throw new Error("Could not find 'export interface InputFrame' block");
      }
      return match[1];
    };

    const clientBlock = extractInterfaceBlock(clientContent);
    const serverBlock = extractInterfaceBlock(serverContent);

    // 3. Clean up comments, annotations, whitespace and newlines for robust comparison
    const cleanBlock = (block: string): string => {
      return block
        .replace(/\/\*\*[\s\S]*?\*\//g, "") // remove JSDoc comments
        .replace(/\/\/.*$/gm, "")          // remove single-line comments
        .replace(/\s+/g, " ")               // collapse whitespace
        .trim();
    };

    const clientCleaned = cleanBlock(clientBlock);
    const serverCleaned = cleanBlock(serverBlock);

    // 4. Assert structural identity
    expect(clientCleaned).toBe(serverCleaned);
  });
});
