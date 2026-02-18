import { useFetcher } from "react-router";

import type { LoaderFunctionArgs } from "react-router";

import { loadWithComparison } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

export async function loader({ context, request }: LoaderFunctionArgs) {
    return loadWithComparison(request, (site, interval, tz, filters, page, startDate, endDate) =>
        context.analyticsEngine.getVisitorCountByColumn(
            site, "deviceType", interval, tz, filters, page, 10, startDate, endDate,
        ),
    );
}

export const DeviceCard = ({
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
            columnHeaders={["Device", "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/device"
            filters={filters}
            onClick={(deviceType) => onFilterChange({ ...filters, deviceType })}
            timezone={timezone}
            labelFormatter={(label) =>
                label.charAt(0).toUpperCase() + label.slice(1)
            }
            enableChart={true}
        />
    );
};
