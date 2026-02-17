import type { Client } from "./client";
import { trackEvent } from "./track";

const MAX_WALK_DEPTH = 5;
const MAX_TEXT_LENGTH = 150;

function findClickTarget(
    target: EventTarget | null,
): HTMLElement | null {
    let el = target as HTMLElement | null;
    let depth = 0;

    while (el && depth < MAX_WALK_DEPTH) {
        if (el.tagName === "A" || el.tagName === "BUTTON") {
            return el;
        }
        if (el.getAttribute?.("role") === "button") {
            return el;
        }
        el = el.parentElement;
        depth++;
    }

    return null;
}

function getClickEventData(
    el: HTMLElement,
): { eventName: string; eventData: string } | null {
    if (el.tagName === "A") {
        const anchor = el as HTMLAnchorElement;
        const href = anchor.getAttribute("href");
        if (!href) return null;

        let data: string;
        try {
            const linkUrl = new URL(href, window.location.origin);
            if (linkUrl.origin === window.location.origin) {
                // Same-origin: use relative path
                data = linkUrl.pathname + linkUrl.search + linkUrl.hash;
            } else {
                // External: use full URL
                data = linkUrl.href;
            }
        } catch {
            data = href;
        }

        return { eventName: "click:link", eventData: data };
    }

    // <button> or [role="button"]
    const text = (el.textContent || "").trim().substring(0, MAX_TEXT_LENGTH);
    return { eventName: "click:button", eventData: text };
}

export function autoTrackClicks(client: Client): () => void {
    function handler(event: Event) {
        const target = findClickTarget(event.target);
        if (!target) return;

        const data = getClickEventData(target);
        if (!data) return;

        trackEvent(client, data.eventName, { data: data.eventData });
    }

    document.addEventListener("click", handler, { capture: true });

    return () => {
        document.removeEventListener("click", handler, { capture: true });
    };
}
