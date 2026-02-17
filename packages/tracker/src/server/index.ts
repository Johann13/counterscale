import { ServerClient } from "./client";
import { trackPageview as _trackPageview, trackEvent as _trackEvent } from "./track";
import type { ServerClientOpts, ServerTrackPageviewOpts, ServerTrackEventOpts } from "./types";

const GLOBALS = {
    client: undefined as ServerClient | undefined,
};

export function init(opts: ServerClientOpts) {
    if (GLOBALS.client) {
        return;
    }
    GLOBALS.client = new ServerClient(opts);
}

export function isInitialized() {
    return Boolean(GLOBALS.client);
}

export function getInitializedClient(): (typeof GLOBALS)["client"] {
    return GLOBALS.client;
}

export function trackPageview(opts: ServerTrackPageviewOpts) {
    if (!GLOBALS.client) {
        throw new Error("You must call init() before calling trackPageview().");
    }
    return _trackPageview(GLOBALS.client, opts);
}

export function trackEvent(opts: ServerTrackEventOpts) {
    if (!GLOBALS.client) {
        throw new Error("You must call init() before calling trackEvent().");
    }
    return _trackEvent(GLOBALS.client, opts);
}

export function cleanup() {
    if (!GLOBALS.client) {
        return; // no-op if not already initialized
    }
    GLOBALS.client.cleanup();
    GLOBALS.client = undefined;
}

export type { ServerClientOpts, ServerTrackPageviewOpts, ServerTrackEventOpts } from "./types";
export { ServerClient } from "./client";
