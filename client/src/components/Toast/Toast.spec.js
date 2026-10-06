import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast, TOAST_DURATION } from "./Toast";

const Trigger = () => {
  const showToast = useToast();

  return (
    <>
      <button onClick={() => showToast("First message")}>first</button>
      <button onClick={() => showToast("Second message")}>second</button>
      <button
        onClick={() => showToast("Sticky message", { persistent: true })}
      >
        sticky
      </button>
    </>
  );
};

describe("<ToastProvider />", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should display a toast in a status region when showToast is called", () => {
    const { getByText, getByRole } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    fireEvent.click(getByText("first"));

    expect(getByRole("status")).toHaveTextContent("First message");
  });

  it("should stack several toasts", () => {
    const { getByText, getAllByRole } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    fireEvent.click(getByText("first"));
    fireEvent.click(getByText("second"));

    expect(getAllByRole("listitem")).toHaveLength(2);
  });

  it("should dismiss a toast on its own after a delay", () => {
    const { getByText, queryByText } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    fireEvent.click(getByText("first"));
    act(() => jest.advanceTimersByTime(TOAST_DURATION));

    expect(queryByText("First message")).not.toBeInTheDocument();
  });

  it("should keep a persistent toast until it is dismissed by hand", () => {
    const { getByText, getByLabelText, queryByText } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    fireEvent.click(getByText("sticky"));
    act(() => jest.advanceTimersByTime(TOAST_DURATION * 10));

    expect(getByText("Sticky message")).toBeInTheDocument();

    fireEvent.click(getByLabelText("Dismiss"));

    expect(queryByText("Sticky message")).not.toBeInTheDocument();
  });

  it("should not restart a toast's timer when another one shows up", () => {
    const { getByText, queryByText } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    fireEvent.click(getByText("first"));
    act(() => jest.advanceTimersByTime(TOAST_DURATION - 1000));
    fireEvent.click(getByText("second"));
    act(() => jest.advanceTimersByTime(1000));

    expect(queryByText("First message")).not.toBeInTheDocument();
    expect(getByText("Second message")).toBeInTheDocument();
  });

  it("should dismiss a toast when its dismiss button is clicked", () => {
    const { getByText, getByLabelText, queryByText } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    fireEvent.click(getByText("first"));
    fireEvent.click(getByLabelText("Dismiss"));

    expect(queryByText("First message")).not.toBeInTheDocument();
  });

  it("should open the popover only while there is a toast to show", () => {
    const togglePopover = jest.spyOn(
      window.HTMLElement.prototype,
      "togglePopover"
    );
    const { getByText, getByLabelText } = render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    fireEvent.click(getByText("first"));
    expect(togglePopover).toHaveBeenLastCalledWith(true);

    fireEvent.click(getByLabelText("Dismiss"));
    expect(togglePopover).toHaveBeenLastCalledWith(false);

    togglePopover.mockRestore();
  });
});
