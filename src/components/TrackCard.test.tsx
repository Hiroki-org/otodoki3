import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrackCard } from "./TrackCard";
import type { Track } from "../types/track-pool";

// Mock next/image
vi.mock("next/image", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  default: ({ fill, unoptimized, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock AudioProgressBar to avoid testing implementation details of child
vi.mock("./AudioProgressBar", () => ({
  AudioProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="audio-progress-bar" data-progress={progress} />
  ),
}));

const mockTrack: Track = {
  type: "track",
  track_id: 12345,
  track_name: "Test Song",
  artist_name: "Test Artist",
  preview_url: "https://example.com/preview",
  artwork_url: "https://example.com/artwork.jpg",
  track_view_url: "https://music.apple.com/test",
};

describe("TrackCard", () => {
  it("正常系: トラック情報（タイトル、アーティスト）が表示される", () => {
    render(<TrackCard track={mockTrack} />);

    expect(screen.getByText("Test Song")).toBeInTheDocument();
    expect(screen.getByText("Test Artist")).toBeInTheDocument();
  });

  it("正常系: アートワークが表示される", () => {
    render(<TrackCard track={mockTrack} />);

    const image = screen.getByRole("img", { name: "Test Song - Test Artist" });
    expect(image).toHaveAttribute("src", "https://example.com/artwork.jpg");
  });

  it("正常系: Apple Musicへのリンクが表示される", () => {
    render(<TrackCard track={mockTrack} />);

    const link = screen.getByLabelText("Apple Musicで開く");
    expect(link).toHaveAttribute("href", "https://music.apple.com/test");
  });

  it("正常系: プログレスバーが表示される", () => {
    render(<TrackCard track={mockTrack} progress={50} />);

    const progressBar = screen.getByTestId("audio-progress-bar");
    expect(progressBar).toHaveAttribute("data-progress", "50");
  });

  it("エッジケース: アートワークがない場合はプレースホルダーが表示される", () => {
    const trackNoArtwork = { ...mockTrack, artwork_url: undefined };
    render(<TrackCard track={trackNoArtwork} />);

    const mainImage = screen.queryByRole("img", { name: "Test Song - Test Artist" });
    expect(mainImage).not.toBeInTheDocument();

    const placeholder = screen.getByRole("presentation");
    expect(placeholder).toBeInTheDocument();
  });

  it("エッジケース: Apple Musicリンクがない場合はボタンが表示されない", () => {
    const trackNoLink = { ...mockTrack, track_view_url: undefined };
    render(<TrackCard track={trackNoLink} />);

    const link = screen.queryByLabelText("Apple Musicで開く");
    expect(link).not.toBeInTheDocument();
  });
});
