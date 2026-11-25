import React from "react";
import { render, screen } from "@testing-library/react";

import LogoAppLockup, {
  LOCKUP_ORIENTATIONS,
} from "@design-systems/LogoAppLockup/LogoAppLockup";

describe("LogoAppLockup", () => {
  it("exposes the two orientations of the Figma component set", () => {
    expect(LOCKUP_ORIENTATIONS).toEqual(["vertical", "horizontal"]);
  });

  it("is named after the app, without repeating that it is a logo", () => {
    render(<LogoAppLockup />);

    expect(screen.getByRole("img", { name: "C-KOI" })).toBeInTheDocument();
  });

  it("names the mark and the wordmark once, as a single image", () => {
    render(<LogoAppLockup />);

    // Two <img> elements inside, but one name: the children are decorative and
    // the container carries the role.
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("renders the mark through LogoApp rather than a copy of it", () => {
    const { container } = render(<LogoAppLockup />);

    expect(container.querySelector(".logo-app")).toBeInTheDocument();
    expect(
      container.querySelector(".logo-app-lockup-wordmark"),
    ).toBeInTheDocument();
  });

  it.each(LOCKUP_ORIENTATIONS)("lays out the %s orientation", (orientation) => {
    const { container } = render(<LogoAppLockup orientation={orientation} />);

    expect(container.firstChild).toHaveAttribute(
      "data-orientation",
      orientation,
    );
  });

  it("stacks the name under the mark by default", () => {
    const { container } = render(<LogoAppLockup />);

    expect(container.firstChild).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
  });

  it("leaves the accessibility tree when an empty alt is passed", () => {
    const { container } = render(<LogoAppLockup alt="" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("takes an explicit accessible name over the app name", () => {
    render(<LogoAppLockup alt="Retour à l'accueil" />);

    expect(
      screen.getByRole("img", { name: "Retour à l'accueil" }),
    ).toBeInTheDocument();
  });

  it("binds no size of its own: the host element owns it", () => {
    const { container } = render(<LogoAppLockup />);
    const lockup = container.firstChild;

    expect(lockup).toHaveClass("logo-app-lockup");
    expect(lockup.style.length).toBe(0);
    container.querySelectorAll("img").forEach((image) => {
      expect(image).not.toHaveAttribute("width");
      expect(image).not.toHaveAttribute("height");
    });
  });
});
