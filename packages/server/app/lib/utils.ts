import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function paramsFromUrl(url: string) {
    const searchParams = new URL(url).searchParams;
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

interface SearchFilters {
    path?: string;
    referrer?: string;
    deviceType?: string;
    country?: string;
    region?: string;
    city?: string;
    browserName?: string;
    browserVersion?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    eventName?: string;
}

export function getFiltersFromSearchParams(searchParams: URLSearchParams) {
    const filters: SearchFilters = {};

    if (searchParams.has("path")) {
        filters.path = searchParams.get("path") || "";
    }
    if (searchParams.has("referrer")) {
        filters.referrer = searchParams.get("referrer") || "";
    }
    if (searchParams.has("deviceType")) {
        filters.deviceType = searchParams.get("deviceType") || "";
    }
    if (searchParams.has("country")) {
        filters.country = searchParams.get("country") || "";
    }
    if (searchParams.has("region")) {
        filters.region = searchParams.get("region") || "";
    }
    if (searchParams.has("city")) {
        filters.city = searchParams.get("city") || "";
    }
    if (searchParams.has("browserName")) {
        filters.browserName = searchParams.get("browserName") || "";
    }
    if (searchParams.has("browserVersion")) {
        filters.browserVersion = searchParams.get("browserVersion") || "";
    }
    if (searchParams.has("utmSource")) {
        filters.utmSource = searchParams.get("utmSource") || "";
    }
    if (searchParams.has("utmMedium")) {
        filters.utmMedium = searchParams.get("utmMedium") || "";
    }
    if (searchParams.has("utmCampaign")) {
        filters.utmCampaign = searchParams.get("utmCampaign") || "";
    }
    if (searchParams.has("utmTerm")) {
        filters.utmTerm = searchParams.get("utmTerm") || "";
    }
    if (searchParams.has("utmContent")) {
        filters.utmContent = searchParams.get("utmContent") || "";
    }
    if (searchParams.has("eventName")) {
        filters.eventName = searchParams.get("eventName") || "";
    }

    return filters;
}

export function getUserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        // Fallback to UTC if browser doesn't support Intl API
        return "UTC";
    }
}

export function getIntervalType(interval: string): "DAY" | "HOUR" {
    switch (interval) {
        case "1h":
        case "3h":
        case "6h":
        case "12h":
        case "today":
        case "yesterday":
        case "1d":
            return "HOUR";
        case "7d":
        case "14d":
        case "30d":
        case "90d":
            return "DAY";
        default:
            return "DAY";
    }
}

export function getDateTimeRange(interval: string, tz: string) {
    let localDateTime = dayjs().utc();
    let localEndDateTime: dayjs.Dayjs | undefined;

    if (interval === "today") {
        localDateTime = localDateTime.tz(tz).startOf("day");
    } else if (interval === "yesterday") {
        localDateTime = localDateTime.tz(tz).startOf("day").subtract(1, "day");
        localEndDateTime = localDateTime.endOf("day").add(2, "ms");
    } else if (interval.endsWith("h")) {
        const hoursAgo = Number(interval.split("h")[0]);
        localDateTime = localDateTime.subtract(hoursAgo, "hour").startOf("hour");
    } else {
        const daysAgo = Number(interval.split("d")[0]);
        const intervalType = getIntervalType(interval);

        if (intervalType === "DAY") {
            localDateTime = localDateTime
                .subtract(daysAgo, "day")
                .tz(tz)
                .startOf("day");
        } else if (intervalType === "HOUR") {
            localDateTime = localDateTime
                .subtract(daysAgo, "day")
                .startOf("hour");
        }
    }

    if (!localEndDateTime) {
        localEndDateTime = dayjs().utc().tz(tz);
    }

    return {
        startDate: localDateTime.toDate(),
        endDate: localEndDateTime.toDate(),
    };
}

export function getPreviousPeriodDateRange(interval: string, tz: string) {
    const { startDate, endDate } = getDateTimeRange(interval, tz);
    if (interval === "today" || interval === "yesterday") {
        // Use dayjs subtract to handle DST transitions correctly
        // (DST days can be 23h or 25h, not always 24h)
        return {
            startDate: dayjs(startDate).tz(tz).subtract(1, "day").toDate(),
            endDate: dayjs(endDate).tz(tz).subtract(1, "day").toDate(),
        };
    }
    const periodMs = endDate.getTime() - startDate.getTime();
    return {
        startDate: new Date(startDate.getTime() - periodMs),
        endDate: new Date(endDate.getTime() - periodMs),
    };
}

export async function loadWithComparison<T>(
    request: Request,
    fetchData: (
        site: string,
        interval: string,
        tz: string,
        filters: SearchFilters,
        page: number,
        startDate?: Date,
        endDate?: Date,
    ) => Promise<T>,
) {
    const { interval, site, page = 1, compare } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);
    const pageNum = Number(page);

    const currentData = fetchData(site, interval, tz, filters, pageNum);

    let previousData = null;
    if (compare === "1") {
        const { startDate, endDate } = getPreviousPeriodDateRange(interval, tz);
        previousData = fetchData(
            site, interval, tz, filters, pageNum, startDate, endDate,
        );
    }

    const [current, previous] = await Promise.all([
        currentData,
        previousData ?? Promise.resolve(null),
    ]);

    return {
        countsByProperty: current,
        previousCountsByProperty: previous,
        page: pageNum,
    };
}

export function maskBrowserVersion(version?: string) {
    if (!version) return version;

    const majorEnd = version.indexOf(".");

    if (majorEnd != -1) {
        version =
            version.substring(0, majorEnd) +
            version.slice(majorEnd).replaceAll(/\.[^.]+/g, ".x");
    }

    return version;
}
