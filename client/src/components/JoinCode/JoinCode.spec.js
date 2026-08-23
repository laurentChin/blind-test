import React from "react";
import { render, fireEvent } from "@testing-library/react";

jest.mock("qrcode");

import { JoinCode } from "./JoinCode";

describe("<JoinCode />", () => {
  it("should display the QR code with the enlarge dialog closed", () => {
    const { container } = render(
      <JoinCode joinUrl="https://blind-test.example.com/session/abc" />
    );

    expect(container.querySelector(".qrcode")).toBeTruthy();
    expect(container.querySelector(".qrcode-dialog").open).toBeFalsy();
  });

  it("should open a dialog with the full join url when the QR code is clicked", () => {
    const { container, getByLabelText } = render(
      <JoinCode joinUrl="https://blind-test.example.com/session/abc" />
    );

    const dialog = container.querySelector(".qrcode-dialog");
    expect(dialog.open).toBeFalsy();

    fireEvent.click(
      getByLabelText("Enlarge the QR code and see the full join URL")
    );

    expect(dialog.open).toBeTruthy();
    expect(container.querySelector(".join-url-full").textContent).toBe(
      "https://blind-test.example.com/session/abc"
    );
  });

  it("should show a plain button instead of the QR thumbnail when variant='button', and still open the same dialog", () => {
    const { container, getByText } = render(
      <JoinCode
        joinUrl="https://blind-test.example.com/session/abc"
        variant="button"
      />
    );

    expect(container.querySelector(".qrcode")).toBeFalsy();

    const dialog = container.querySelector(".qrcode-dialog");
    expect(dialog.open).toBeFalsy();

    fireEvent.click(getByText("Show join code"));

    expect(dialog.open).toBeTruthy();
    expect(container.querySelector(".join-url-full").textContent).toBe(
      "https://blind-test.example.com/session/abc"
    );
  });
});
