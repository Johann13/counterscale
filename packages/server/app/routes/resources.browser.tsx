import { useFetcher } from "react-router";

import type { LoaderFunctionArgs } from "react-router";

import { loadWithComparison } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

export async function loader({ context, request }: LoaderFunctionArgs) {
    return loadWithComparison(request, (site, interval, tz, filters, page, startDate, endDate) =>
        context.analyticsEngine.getVisitorCountByColumn(
            site, "browserName", interval, tz, filters, page, 10, startDate, endDate,
        ),
    );
}

export const BrowserCard = ({
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
    return (
        <PaginatedTableCard
            siteId={siteId}
            interval={interval}
            columnHeaders={["Browser", "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/browser"
            filters={filters}
            onClick={(browserName) =>
                onFilterChange({ ...filters, browserName })
            }
            timezone={timezone}
            enableChart={true}
        />
    );
};
