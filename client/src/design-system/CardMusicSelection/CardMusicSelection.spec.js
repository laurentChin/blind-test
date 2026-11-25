import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CardMusicSelection from "./CardMusicSelection";
import { MUSIC_PROVIDER_IDS } from "../LogoMusicProvider/LogoMusicProvider";

describe("CardMusicSelection", () => {
  it("is a button named after the provider", () => {
    render(<CardMusicSelection provider="spotify" />);

    const card = screen.getByRole("button", { name: "Spotify" });

    expect(card).toHaveAttribute("type", "button");
    expect(card).toHaveAttribute("data-provider", "spotify");
  });

  it.each([
    ["spotify", "Spotify"],
    ["deezer", "Deezer"],
    ["appleMusic", "Apple Music"],
    ["youtubeMusic", "YouTube"],
  ])("writes the name of %s on the card", (provider, name) => {
    render(<CardMusicSelection provider={provider} />);

    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("shortens YouTube Music, which would wrap, and keeps its logo named in full", () => {
    const { container } = render(
      <CardMusicSelection provider="youtubeMusic" />,
    );

    expect(screen.getByRole("button", { name: "YouTube" })).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute(
      "data-provider",
      "youtubeMusic",
    );
  });

  it("takes an explicit label over the provider name", () => {
    render(<CardMusicSelection provider="appleMusic" label="Ma musique" />);

    expect(
      screen.getByRole("button", { name: "Ma musique" }),
    ).toBeInTheDocument();
  });

  it("leaves the logo out of the accessible name, which the label carries", () => {
    const { container } = render(<CardMusicSelection provider="deezer" />);

    const logo = container.querySelector("img");

    expect(logo).toHaveAttribute("alt", "");
    expect(logo).toHaveAttribute("data-provider", "deezer");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("is not pressed until it is selected", () => {
    const { rerender } = render(<CardMusicSelection provider="spotify" />);

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");

    rerender(<CardMusicSelection provider="spotify" selected />);

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("calls back when clicked", async () => {
    const onClick = jest.fn();
    render(<CardMusicSelection provider="deezer" onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Deezer" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is reachable and activable with the keyboard", async () => {
    const onClick = jest.fn();
    render(<CardMusicSelection provider="spotify" onClick={onClick} />);

    await userEvent.tab();

    expect(screen.getByRole("button")).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("stays silent when disabled", async () => {
    const onClick = jest.fn();
    render(
      <CardMusicSelection provider="spotify" onClick={onClick} disabled />,
    );

    const card = screen.getByRole("button");

    expect(card).toBeDisabled();

    await userEvent.click(card);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps its own semantics when a caller spreads props", () => {
    render(
      <CardMusicSelection
        provider="spotify"
        selected
        type="submit"
        aria-pressed={false}
      />,
    );

    const card = screen.getByRole("button");

    expect(card).toHaveAttribute("type", "button");
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  it("accepts every provider of the design system", () => {
    MUSIC_PROVIDER_IDS.forEach((provider) => {
      const { container } = render(<CardMusicSelection provider={provider} />);

      expect(container.querySelector("button")).toHaveAttribute(
        "data-provider",
        provider,
      );
    });
  });
});
