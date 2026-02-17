import { useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getFiltersFromSearchParams, paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

function getCountryName(code: string): string {
    try {
        const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
        return regionNames.of(code) || code;
    } catch {
        return code;
    }
}

export async function loader({ context, request }: LoaderFunctionArgs) {
    const { analyticsEngine } = context;
    const { interval, site, page = 1 } = paramsFromUrl(request.url);
    const url = new URL(request.url);
    const tz = url.searchParams.get("timezone") || "UTC";
    const filters = getFiltersFromSearchParams(url.searchParams);

    const countsByRegionCity = await analyticsEngine.getCountByRegionCity(
        site,
        interval,
        tz,
        filters,
    );

    // Aggregate by region: split "region|city" and sum counts per region
    const regionCounts = new Map<string, number>();
    for (const [packed, count] of countsByRegionCity) {
        const [region] = packed.split("|");
        if (!region) continue;
        regionCounts.set(region, (regionCounts.get(region) || 0) + count);
    }

    // Sort by count descending
    const sorted = [...regionCounts.entries()].sort((a, b) => b[1] - a[1]);

    // Server-side pagination (10 per page)
    const pageNum = Number(page);
    const pageSize = 10;
    const start = (pageNum - 1) * pageSize;
    const paged = sorted.slice(start, start + pageSize);

    return {
        countsByProperty: paged,
        page: pageNum,
    };
}

export const RegionCard = ({
    siteId,
    interval,
    filters,
    onFilterChange,
    timezone,
}: {
    siteId: string;
    interval: string;
    filters: SearchFilters;
    onFilterChange: (filters: SearchFilters) => void;
    timezone: string;
}) => {
    const header = filters?.country
        ? `${getCountryName(filters.country)} Regions`
        : "Region";

    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={[header, "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/region"
            filters={filters}
            onClick={(region) =>
                onFilterChange({ ...filters, region })
            }
            timezone={timezone}
        />
    );
};
