import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("クラス名を正しく結合すること", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("条件付きクラス名を正しく処理すること", () => {
    const result = cn("class1", true && "class2", false && "class3");
    expect(result).toBe("class1 class2");
  });

  it("配列形式のクラス名を正しく処理すること", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toBe("class1 class2");
  });

  it("オブジェクト形式のクラス名を正しく処理すること", () => {
    const result = cn({ class1: true, class2: false, class3: true });
    expect(result).toBe("class1 class3");
  });

  it("Tailwindのクラス競合を正しく解決すること（後勝ち）", () => {
    // p-4 と p-2 は競合する。後に指定された p-2 が優先されるべき。
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("複雑な組み合わせを正しく処理すること", () => {
    const result = cn(
      "text-red-500",
      true && "bg-blue-500",
      { "p-4": true, "m-2": false },
      ["hover:text-white"]
    );
    expect(result).toBe("text-red-500 bg-blue-500 p-4 hover:text-white");
  });

  it("undefined や null を無視すること", () => {
    const result = cn("class1", undefined, null, "class2");
    expect(result).toBe("class1 class2");
  });
});
