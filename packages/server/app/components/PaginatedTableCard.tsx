import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import TableCard from "~/components/TableCard";

import { Card } from "./ui/card";
import PaginationButtons from "./PaginationButtons";
import { SearchFilters } from "~/lib/types";

interface PaginatedTableCardProps {
    siteId: string;
    interval: string;
    dataFetcher: any;
    columnHeaders: string[];
    filters?: SearchFilters;
    extraParams?: Record<string, string>;
    loaderUrl: string;
    onClick?: (key: string) => void;
    timezone?: string;
    labelFormatter?: (label: string) => string;
    headerExtra?: ReactNode;
}

const PaginatedTableCard = ({
    siteId,
    interval,
    dataFetcher,
    columnHeaders,
    filters,
    extraParams,
    loaderUrl,
    onClick,
    timezone,
    labelFormatter,
    headerExtra,
}: PaginatedTableCardProps) => {
    const countsByProperty = dataFetcher.data?.countsByProperty || [];
    const [page, setPage] = useState(1);

    useEffect(() => {
        const params = {
            site: siteId,
            interval,
            timezone,
            ...filters,
            ...extraParams,
            page,
        };

        dataFetcher.submit(params, {
            method: "get",
            action: loaderUrl,
        });
        // NOTE: dataFetcher is intentionally omitted from the useEffect dependency array
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaderUrl, siteId, interval, filters, extraParams, timezone, page]); //

    function handlePagination(page: number) {
        setPage(page);
    }

    const hasMore = countsByProperty.length === 10;
    return (
        <Card className={dataFetcher.state === "loading" ? "opacity-60" : ""}>
            {headerExtra && (
                <div className="flex justify-end px-4 pt-3">
                    {headerExtra}
                </div>
            )}
            {countsByProperty ? (
                <div className="grid grid-rows-[auto,40px] h-full">
                    <TableCard
                        countByProperty={countsByProperty}
                        columnHeaders={columnHeaders}
                        onClick={onClick}
                        labelFormatter={labelFormatter}
                    />
                    <PaginationButtons
                        page={page}
                        hasMore={hasMore}
                        handlePagination={handlePagination}
                    />
                </div>
            ) : null}
        </Card>
    );
};

export default PaginatedTableCard;
