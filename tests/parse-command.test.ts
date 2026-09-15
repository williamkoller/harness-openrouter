import { describe, expect, test } from "bun:test";
import { parseCommand } from "../src/cli/parse-command";

describe("parseCommand", () => {
  test("returns null for non-slash lines", () => {
    expect(parseCommand("hello")).toBeNull();
    expect(parseCommand("")).toBeNull();
  });

  test("parses name and args", () => {
    expect(parseCommand("/model deepseek/deepseek-r1")).toEqual({
      name: "model",
      args: ["deepseek/deepseek-r1"],
    });
  });

  test("lowercases the command name", () => {
    expect(parseCommand("/HELP")?.name).toBe("help");
  });

  test("handles whitespace and empty args", () => {
    expect(parseCommand("  /reasoning  ")).toEqual({ name: "reasoning", args: [] });
  });
});