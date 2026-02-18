import { useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
    getFiltersFromSearchParams,
    loadWithComparison,
} from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

function extractCities(
    countsByRegionCity: [string, number][],
    regionFilter: string | undefined,
    page: number,
): [string, number][] {
    const cityCounts: [string, number][] = [];
    for (const [packed, count] of countsByRegionCity) {
        const separatorIndex = packed.indexOf("|");
        const region = packed.substring(0, separatorIndex);
        const city = packed.substring(separatorIndex + 1);
        if (!city) continue;
        if (regionFilter && region !== regionFilter) continue;
        cityCounts.push([city, count]);
    }
    cityCounts.sort((a, b) => b[1] - a[1]);
    const pageSize = 10;
    const start = (page - 1) * pageSize;
    return cityCounts.slice(start, start + pageSize);
}

export async function loader({ context, request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const filters = getFiltersFromSearchParams(url.searchParams);

    return loadWithComparison(
        request,
        async (site, interval, tz, _filters, page, startDate, endDate) => {
            const raw = await context.analyticsEngine.getCountByRegionCity(
                site, interval, tz, filters, 200, startDate, endDate,
            );
            return extractCities(raw, filters.region, page);
        },
    );
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
