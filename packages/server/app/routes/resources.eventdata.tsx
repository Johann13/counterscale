import type { LoaderFunctionArgs } from "react-router";

import { paramsFromUrl } from "~/lib/utils";
import { requireAuth } from "~/lib/auth";

export async function loader({ context, request }: LoaderFunctionArgs) {
    await requireAuth(request, context.cloudflare.env);
    const { analyticsEngine } = context;

    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const eventName = url.searchParams.get("eventName") || "";

    return {
        countsByProperty: await analyticsEngine.getEventDataCounts(
            site,
            eventName,
            interval,
            tz,
            Number(page),
        ),
        page: Number(page),
    };
}
