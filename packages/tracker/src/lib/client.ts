import { autoTrackPageviews } from "./track";
import { autoTrackClicks } from "./clicks";
import type { BaseClientConfig } from "../shared/types";

export type ClientOpts = BaseClientConfig & {
    autoTrackPageviews?: boolean;
    autoTrackClicks?: boolean;
};

export class Client {
    siteId: string;
    reporterUrl: string;
    reportOnLocalhost = false;

    _cleanupAutoTrackPageviews?: () => void;
    _cleanupAutoTrackClicks?: () => void;

    constructor(opts: ClientOpts) {
        this.siteId = opts.siteId;
        this.reporterUrl = opts.reporterUrl;

        if (opts.reportOnLocalhost) {
            this.reportOnLocalhost = opts.reportOnLocalhost;
        }

        // default to true
        if (opts.autoTrackPageviews === undefined || opts.autoTrackPageviews) {
            // Use setTimeout to ensure this runs after the constructor
            // This helps with testing and avoids issues with async trackPageview
            setTimeout(() => {
                this._cleanupAutoTrackPageviews = autoTrackPageviews(this);
            }, 0);
        }

        if (opts.autoTrackClicks) {
            setTimeout(() => {
                this._cleanupAutoTrackClicks = autoTrackClicks(this);
            }, 0);
        }
    }

    cleanup() {
        if (this._cleanupAutoTrackPageviews) {
            this._cleanupAutoTrackPageviews();
        }
        if (this._cleanupAutoTrackClicks) {
            this._cleanupAutoTrackClicks();
        }
    }
}
