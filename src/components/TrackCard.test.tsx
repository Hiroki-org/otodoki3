import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrackCard } from "./TrackCard";
import type { Track } from "../types/track-pool";

// Mock next/image
vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  default: ({ fill, unoptimized, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ""} />;
  },
}));

// Mock AudioProgressBar
vi.mock("./AudioProgressBar", () => ({
  AudioProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="audio-progress-bar" data-progress={progress} />
  ),
}));

const mockTrack: Track = {
  type: "track",
  track_id: "track-1",
  track_name: "Test Track",
  artist_name: "Test Artist",
  preview_url: "https://example.com/preview.mp3",
  artwork_url: "https://example.com/artwork.jpg",
  track_view_url: "https://music.apple.com/track/1",
  popularity: 50,
};

describe("TrackCard", () => {
  it("トラック名とアーティスト名が正しく表示される", () => {
    render(<TrackCard track={mockTrack} />);
    expect(screen.getByText("Test Track")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  it("有効なアートワークURLがある場合、画像が表示される", () => {
    render(<TrackCard track={mockTrack} />);
    const image = screen.getByAltText("Test Track - Test Artist");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/artwork.jpg");
  });

  it("アートワークURLが無効または空の場合、フォールバックアイコンが表示される", () => {
    const trackWithoutArtwork: Track = { ...mockTrack, artwork_url: undefined };
    render(<TrackCard track={trackWithoutArtwork} />);

    // 画像は表示されない
    expect(screen.queryByAltText("Test Track - Test Artist")).not.toBeInTheDocument();
    // フォールバックのコンテナが表示されていることを確認 (role="presentation"を持つdiv内のMusicアイコン)
    // Musicアイコンはlucide-reactなのでSVGとして描画されるが、ここでは親divを探すのが簡単
    const fallbackContainer = screen.getByRole("presentation");
    expect(fallbackContainer).toBeInTheDocument();
  });

  it("Apple MusicのURLがある場合、リンクボタンが表示される", () => {
    render(<TrackCard track={mockTrack} />);
    const link = screen.getByLabelText("Apple Musicで開く");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://music.apple.com/track/1");
  });

  it("Apple MusicのURLがない場合、リンクボタンが表示されない", () => {
    const trackWithoutLink: Track = { ...mockTrack, track_view_url: undefined };
    render(<TrackCard track={trackWithoutLink} />);
    expect(screen.queryByLabelText("Apple Musicで開く")).not.toBeInTheDocument();
  });

  it("プログレスバーが指定された場合、表示される", () => {
    render(<TrackCard track={mockTrack} progress={50} />);
    const progressBar = screen.getByTestId("audio-progress-bar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("data-progress", "50");
  });
});
