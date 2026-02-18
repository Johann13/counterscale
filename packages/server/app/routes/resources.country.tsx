import { useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { loadWithComparison } from "~/lib/utils";
import PaginatedTableCard from "~/components/PaginatedTableCard";
import { SearchFilters } from "~/lib/types";

function convertCountryCodesToNames(
    countByCountry: [string, number][],
): [[string, string], number][] {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    return countByCountry.map((row) => {
        let countryName;
        try {
            countryName = regionNames.of(row[0])!;
        } catch {
            countryName = "(unknown)";
        }
        return [[row[0], countryName], row[1]];
    });
}

export async function loader({ context, request }: LoaderFunctionArgs) {
    const result = await loadWithComparison(
        request,
        (site, interval, tz, filters, page, startDate, endDate) =>
            context.analyticsEngine.getVisitorCountByColumn(
                site, "country", interval, tz, filters, page, 10, startDate, endDate,
            ),
    );

    return {
        ...result,
        countsByProperty: convertCountryCodesToNames(result.countsByProperty),
        previousCountsByProperty: result.previousCountsByProperty
            ? convertCountryCodesToNames(result.previousCountsByProperty)
            : null,
    };
}

export const CountryCard = ({
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
            columnHeaders={["Country", "Visitors"]}
            dataFetcher={useFetcher<typeof loader>()}
            loaderUrl="/resources/country"
            filters={filters}
            onClick={(country) => onFilterChange({ ...filters, country })}
            timezone={timezone}
            enableChart={true}
        />
    );
};
