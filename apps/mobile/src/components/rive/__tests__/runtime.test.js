import { listenForEvents } from "../runtime";

describe("listenForEvents", () => {
  it("listens and stops where the player has events", () => {
    const view = { onEventListener: jest.fn(), removeEventListeners: jest.fn() };
    const onEvent = () => {};
    const stop = listenForEvents(view, onEvent);
    expect(view.onEventListener).toHaveBeenCalledWith(onEvent);
    stop();
    expect(view.removeEventListeners).toHaveBeenCalled();
  });

  it("returns null instead of throwing where the player has no events", () => {
    const fail = () => {
      throw new Error("Events are not supported by the new iOS runtime");
    };
    const view = { onEventListener: fail, removeEventListeners: fail };
    expect(listenForEvents(view, () => {})).toBeNull();
  });

  it("stops quietly when the view has already gone", () => {
    const view = {
      onEventListener: () => {},
      removeEventListeners: () => {
        throw new Error("gone");
      },
    };
    expect(() => listenForEvents(view, () => {})()).not.toThrow();
  });
});
