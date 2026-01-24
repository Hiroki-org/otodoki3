import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AudioProgressBar } from "./AudioProgressBar";

describe("AudioProgressBar", () => {
  it("正常系: プログレスが0%から100%の間で正しくレンダリングされる", () => {
    const { container } = render(<AudioProgressBar progress={50} />);
    // div > div (inner bar)
    const innerBar = container.firstChild?.firstChild as HTMLElement;
    expect(innerBar).toHaveStyle({ width: "50%" });
  });

  it("正常系: 0%で正しくレンダリングされる", () => {
    const { container } = render(<AudioProgressBar progress={0} />);
    const innerBar = container.firstChild?.firstChild as HTMLElement;
    expect(innerBar).toHaveStyle({ width: "0%" });
  });

  it("正常系: 100%で正しくレンダリングされる", () => {
    const { container } = render(<AudioProgressBar progress={100} />);
    const innerBar = container.firstChild?.firstChild as HTMLElement;
    expect(innerBar).toHaveStyle({ width: "100%" });
  });

  it("エッジケース: 0未満の値は0にクランプされる", () => {
    const { container } = render(<AudioProgressBar progress={-10} />);
    const innerBar = container.firstChild?.firstChild as HTMLElement;
    expect(innerBar).toHaveStyle({ width: "0%" });
  });

  it("エッジケース: 100を超える値は100にクランプされる", () => {
    const { container } = render(<AudioProgressBar progress={150} />);
    const innerBar = container.firstChild?.firstChild as HTMLElement;
    expect(innerBar).toHaveStyle({ width: "100%" });
  });

  it("エッジケース: NaNや無限大の場合は0として扱われる", () => {
    const { container: containerNan } = render(<AudioProgressBar progress={NaN} />);
    expect((containerNan.firstChild?.firstChild as HTMLElement)).toHaveStyle({ width: "0%" });

    const { container: containerInf } = render(<AudioProgressBar progress={Infinity} />);
    expect((containerInf.firstChild?.firstChild as HTMLElement)).toHaveStyle({ width: "0%" });
  });
});
