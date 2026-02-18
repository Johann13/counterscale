import { useFetcher } from "react-router";

import type { LoaderFunctionArgs } from "react-router";

import { loadWithComparison } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

export async function loader({ context, request }: LoaderFunctionArgs) {
    return loadWithComparison(request, (site, interval, tz, filters, page, startDate, endDate) =>
        context.analyticsEngine.getVisitorCountByColumn(
            site, "utmCampaign", interval, tz, filters, page, 10, startDate, endDate,
        ),
    );
}

export const UtmCampaignCard = ({
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
            columnHeaders={["UTM Campaign", "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/utm-campaign"
            filters={filters}
            onClick={(utmCampaign) =>
                onFilterChange({ ...filters, utmCampaign })
            }
            timezone={timezone}
        />
    );
};
