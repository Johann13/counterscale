import { useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getFiltersFromSearchParams, paramsFromUrl } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

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

    // Extract city names, optionally filtering to a target region
    const cityCounts: [string, number][] = [];
    for (const [packed, count] of countsByRegionCity) {
        const separatorIndex = packed.indexOf("|");
        const region = packed.substring(0, separatorIndex);
        const city = packed.substring(separatorIndex + 1);
        if (!city) continue;
        if (filters.region && region !== filters.region) continue;
        cityCounts.push([city, count]);
    }

    // Sort by count descending
    cityCounts.sort((a, b) => b[1] - a[1]);

    // Server-side pagination (10 per page)
    const pageNum = Number(page);
    const pageSize = 10;
    const start = (pageNum - 1) * pageSize;
    const paged = cityCounts.slice(start, start + pageSize);

    return {
        countsByProperty: paged,
        page: pageNum,
    };
}

export const CityCard = ({
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
    const header = filters?.region ? `${filters.region} Cities` : "City";

    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={[header, "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/city"
            filters={filters}
            onClick={(city) =>
                onFilterChange({ ...filters, city })
            }
            timezone={timezone}
        />
    );
};
