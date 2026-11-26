import React from "react";
import { render, screen } from "@testing-library/react";

import LogoApp, { APP_NAME } from "@design-systems/LogoApp/LogoApp";

describe("LogoApp", () => {
  it("is named after the app", () => {
    render(<LogoApp />);

    expect(
      screen.getByRole("img", { name: `Logo ${APP_NAME}` }),
    ).toBeInTheDocument();
  });

  it("serves the mark as an image, so it is not duplicated in the DOM", () => {
    const { container } = render(<LogoApp />);
    const logo = container.querySelector("img");

    expect(logo).toBeInTheDocument();
    expect(logo.getAttribute("src")).toBeTruthy();
  });

  it("is decorative when an empty alt is passed", () => {
    render(<LogoApp alt="" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByAltText("")).toBeInTheDocument();
  });

  it("takes an explicit accessible name over the app name", () => {
    render(<LogoApp alt="Retour à l'accueil" />);

    expect(
      screen.getByRole("img", { name: "Retour à l'accueil" }),
    ).toBeInTheDocument();
  });

  it("binds no size of its own: the host element owns it", () => {
    const { container } = render(<LogoApp />);
    const logo = container.querySelector("img");

    expect(logo).toHaveClass("logo-app");
    expect(logo).not.toHaveAttribute("width");
    expect(logo).not.toHaveAttribute("height");
    expect(logo.style.length).toBe(0);
  });
});
