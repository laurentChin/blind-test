// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { TextEncoder, TextDecoder } from "util";
import "whatwg-fetch";

import '@testing-library/jest-dom';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// jsdom doesn't implement <dialog>'s showModal()/close() (long-standing gap),
// so give it a minimal open/close behavior sufficient for tests.
if (window.HTMLDialogElement) {
  if (!window.HTMLDialogElement.prototype.showModal) {
    window.HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  }
  if (!window.HTMLDialogElement.prototype.close) {
    window.HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  }
}

// Same gap for the Popover API: the toast region only needs the call to
// exist, tests assert on its content rather than on top-layer visibility.
if (!window.HTMLElement.prototype.togglePopover) {
  window.HTMLElement.prototype.togglePopover = function togglePopover(force) {
    return force;
  };
}

// jsdom doesn't implement <audio>/<video> playback (play()/pause() log a
// "Not implemented" error), so stub them out as no-ops for tests.
window.HTMLMediaElement.prototype.play = function play() {
  return Promise.resolve();
};
window.HTMLMediaElement.prototype.pause = function pause() {};
