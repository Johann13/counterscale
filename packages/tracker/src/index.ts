import { Client } from "./lib/client";
import type { ClientOpts } from "./lib/client";

import { trackPageview as _trackPageview, trackEvent as _trackEvent } from "./lib/track";
import type { TrackPageviewOpts, TrackEventOpts } from "./lib/track";

const GLOBALS = {
    client: undefined as Client | undefined,
};

export function init(opts: ClientOpts) {
    if (GLOBALS.client) {
        return;
    }
    GLOBALS.client = new Client(opts);
}

export function isInitialized() {
    return Boolean(GLOBALS.client);
}

export function getInitializedClient(): typeof GLOBALS["client"] {
    return GLOBALS.client 
}

export function trackPageview(opts?: TrackPageviewOpts) {
    if (!GLOBALS.client) {
        throw new Error(
            "You must call Counterscale.initialize() before calling Counterscale.trackPageview().",
        );
    }
    _trackPageview(GLOBALS.client, opts);
}

export function trackEvent(eventName: string, opts?: TrackEventOpts) {
    if (!GLOBALS.client) {
        throw new Error(
            "You must call Counterscale.initialize() before calling Counterscale.trackEvent().",
        );
    }
    _trackEvent(GLOBALS.client, eventName, opts);
}

export function cleanup() {
    if (!GLOBALS.client) {
        return; // no-op if not already initialized (TODO: warn?)
    }
    GLOBALS.client.cleanup();
    GLOBALS.client = undefined;
}
