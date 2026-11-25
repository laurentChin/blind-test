import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render } from "@testing-library/react";

import Icon, { ICON_NAMES, ICON_SIZES } from "./Icon";

const ASSETS_DIR = path.join(__dirname, "assets");

const renderIcon = (props) => {
  const { container } = render(<Icon {...props} />);
  return container.querySelector("svg");
};

describe("Icon", () => {
  it("exposes the twelve icons of the Figma file", () => {
    expect(ICON_NAMES).toEqual([
      "add",
      "check",
      "chevron-left",
      "chevron-right",
      "close",
      "pause",
      "play",
      "search",
      "settings",
      "share",
      "skip",
      "warning",
    ]);
  });

  it.each(ICON_NAMES)("renders %s as an svg", (name) => {
    const icon = renderIcon({ name });

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("icon");
    expect(icon).toHaveAttribute("data-name", name);
  });

  it("gives every name its own asset", () => {
    const assets = ICON_NAMES.map(
      (name) => renderIcon({ name }).dataset.asset,
    );

    expect(new Set(assets).size).toBe(ICON_NAMES.length);
  });

  it("stays out of the accessibility tree, the host naming the action", () => {
    expect(renderIcon({ name: "close" })).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("renders at the icon size by default", () => {
    expect(renderIcon({ name: "play" })).toHaveAttribute("data-size", "xs");
  });

  it.each(ICON_SIZES)("renders at the %s size when asked for it", (size) => {
    expect(renderIcon({ name: "warning", size })).toHaveAttribute(
      "data-size",
      size,
    );
  });
});

// The component only sizes the shape: its color comes from the asset filling
// itself with the text color of the parent, which no rendering test can see
// through the SVGR stub. These read the assets themselves instead.
describe("Icon assets", () => {
  it("holds one asset per name, and no orphan", () => {
    const files = fs
      .readdirSync(ASSETS_DIR)
      .filter((file) => file.endsWith(".svg"))
      .sort();

    expect(files).toEqual(ICON_NAMES.map((name) => `${name}.svg`).sort());
  });

  it.each(ICON_NAMES)("fills %s with the text color of its parent", (name) => {
    const asset = fs.readFileSync(path.join(ASSETS_DIR, `${name}.svg`), "utf8");

    expect(asset).toContain('fill="currentColor"');
    // A hard-coded fill would ignore the token of the hosting component.
    expect(asset).not.toMatch(/fill="#[0-9a-f]{3,8}"/i);
  });

  it.each(ICON_NAMES)("draws %s on the 30 × 30 Figma grid", (name) => {
    const asset = fs.readFileSync(path.join(ASSETS_DIR, `${name}.svg`), "utf8");

    expect(asset).toContain('viewBox="0 0 30 30"');
  });
});
