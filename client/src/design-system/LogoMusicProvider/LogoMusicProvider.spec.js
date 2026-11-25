import React from "react";
import { render, screen } from "@testing-library/react";

import LogoMusicProvider, { MUSIC_PROVIDER_IDS } from "@design-systems/LogoMusicProvider/LogoMusicProvider";

describe("LogoMusicProvider", () => {
  it("exposes the four providers of the Figma component set", () => {
    expect(MUSIC_PROVIDER_IDS).toEqual([
      "spotify",
      "deezer",
      "appleMusic",
      "youtubeMusic",
    ]);
  });

  it.each([
    ["spotify", "Logo Spotify"],
    ["deezer", "Logo Deezer"],
    ["appleMusic", "Logo Apple Music"],
    ["youtubeMusic", "Logo YouTube Music"],
  ])("names the %s logo after its provider", (provider, name) => {
    render(<LogoMusicProvider provider={provider} />);

    expect(screen.getByRole("img", { name })).toBeInTheDocument();
  });

  it.each(MUSIC_PROVIDER_IDS)("gives %s its own asset", (provider) => {
    const { container } = render(<LogoMusicProvider provider={provider} />);
    const logo = container.querySelector("img");

    expect(logo).toHaveAttribute("data-provider", provider);
    expect(logo.getAttribute("src")).toBeTruthy();
  });

  it("renders a different asset for every provider", () => {
    const sources = MUSIC_PROVIDER_IDS.map((provider) => {
      const { container } = render(<LogoMusicProvider provider={provider} />);
      return container.querySelector("img").getAttribute("src");
    });

    expect(new Set(sources).size).toBe(MUSIC_PROVIDER_IDS.length);
  });

  it("is decorative when an empty alt is passed", () => {
    render(<LogoMusicProvider provider="spotify" alt="" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByAltText("")).toBeInTheDocument();
  });

  it("takes an explicit accessible name over the provider name", () => {
    render(<LogoMusicProvider provider="deezer" alt="Connected to Deezer" />);

    expect(
      screen.getByRole("img", { name: "Connected to Deezer" }),
    ).toBeInTheDocument();
  });
});
