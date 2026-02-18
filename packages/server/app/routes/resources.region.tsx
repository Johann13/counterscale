import { useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { loadWithComparison } from "~/lib/utils";
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

function aggregateByRegion(
    countsByRegionCity: [string, number][],
    page: number,
): [string, number][] {
    const regionCounts = new Map<string, number>();
    for (const [packed, count] of countsByRegionCity) {
        const [region] = packed.split("|");
        if (!region) continue;
        regionCounts.set(region, (regionCounts.get(region) || 0) + count);
    }
    const sorted = [...regionCounts.entries()].sort((a, b) => b[1] - a[1]);
    const pageSize = 10;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
}

export async function loader({ context, request }: LoaderFunctionArgs) {
    return loadWithComparison(
        request,
        async (site, interval, tz, filters, page, startDate, endDate) => {
            const raw = await context.analyticsEngine.getCountByRegionCity(
                site, interval, tz, filters, 200, startDate, endDate,
            );
            return aggregateByRegion(raw, page);
        },
    );
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
