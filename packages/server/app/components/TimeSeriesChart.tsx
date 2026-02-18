import {
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ComposedChart,
} from "recharts";

import { useMemo, useState } from "react";
import { useLocalStorage } from "~/hooks/useLocalStorage";

import { Card } from "./ui/card";

interface TimeSeriesChartProps {
    data: Array<{
        date: string;
        views: number;
        visitors: number;
        bounceRate: number;
    }>;
    intervalType?: string;
}

interface Visibility {
    views: boolean;
    visitors: boolean;
    bounceRate: boolean;
}

function dateStringToLocalDateObj(dateString: string): Date {
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date;
}

function CustomTooltip(props: any) {
    const { active, payload, label, visible } = props;

    const date = dateStringToLocalDateObj(label);

    const formattedDate = date.toLocaleString("en-us", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZoneName: "short",
    });
    if (active && payload && payload.length) {
        // Build a map from dataKey to value for easy lookup
        const dataMap: Record<string, number> = {};
        for (const entry of payload) {
            dataMap[entry.dataKey] = entry.value;
        }

        return (
            <Card className="p-2 shadow-lg leading-normal">
                <div className="font-semibold">{formattedDate}</div>
                {visible.visitors && dataMap.visitors !== undefined && (
                    <div className="before:content-['•'] before:text-border before:font-bold">
                        {" "}
                        {`${dataMap.visitors} visitors`}
                    </div>
                )}
                {visible.views && dataMap.views !== undefined && (
                    <div className="before:content-['•'] before:text-barchart before:font-bold">
                        {" "}
                        {`${dataMap.views} views`}
                    </div>
                )}
                {visible.bounceRate && dataMap.bounceRate !== undefined && (
                    <div className="before:content-['•'] before:text-paldarkgrey before:font-bold">
                        {" "}
                        {`${dataMap.bounceRate}% bounce rate`}
                    </div>
                )}
            </Card>
        );
    } else {
        return null;
    }
}

const legendItems: Array<{
    key: keyof Visibility;
    label: string;
    color: string;
}> = [
    { key: "visitors", label: "Visitors", color: "#f96d3e" },
    { key: "views", label: "Views", color: "#F99C35" },
    { key: "bounceRate", label: "Bounce Rate", color: "#56726C" },
];

export default function TimeSeriesChart({
    data,
    intervalType,
}: TimeSeriesChartProps) {
    const [visible, setVisible] = useLocalStorage<Visibility>(
        "cs:timeseriesVisible",
        {
            views: true,
            visitors: true,
            bounceRate: true,
        },
    );

    function toggleSeries(key: keyof Visibility) {
        setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    function xAxisDateFormatter(date: string): string {
        const dateObj = dateStringToLocalDateObj(date);

        switch (intervalType) {
            case "DAY":
                return dateObj.toLocaleDateString("en-us", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                });
            case "HOUR":
                return dateObj.toLocaleTimeString("en-us", {
                    hour: "numeric",
                    minute: "numeric",
                });
            default:
                throw new Error("Invalid interval type");
        }
    }

    const yAxisCountTicks = useMemo(() => {
        const MAX_TICKS_TO_SHOW = 4;

        // Determine max value from whichever count series are visible
        let maxCount = 0;
        if (visible.views) {
            maxCount = Math.max(maxCount, ...data.map((item) => item.views));
        }
        if (visible.visitors) {
            maxCount = Math.max(
                maxCount,
                ...data.map((item) => item.visitors),
            );
        }

        if (maxCount === 0) {
            return [1, 2, 3, 4];
        }

        // determine the magnitude of maxCount to set rounding
        const magnitude = Math.floor(Math.log10(maxCount));
        const roundTo = Math.pow(10, Math.max(0, magnitude - 1));

        const numTicks = Math.min(MAX_TICKS_TO_SHOW, maxCount);
        const ticks = [];

        // calculate increment and round it up to the nearest roundTo
        let increment = Math.floor(maxCount / numTicks);
        increment = Math.ceil(increment / roundTo) * roundTo;

        // skip 0 and go 1 further
        for (let i = 1; i <= numTicks + 1; i++) {
            const tick = i * increment;

            ticks.push(tick);
        }

        return ticks;
    }, [data, visible.views, visible.visitors]);

    // omit first and last
    const xAxisTicks = useMemo(
        () => data.slice(1, -1).map((entry) => entry.date),
        [data],
    );

    // chart doesn't really work no data points, so just bail out
    if (data.length === 0) {
        return null;
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex justify-end gap-4 px-2 pb-2">
                {legendItems.map(({ key, label, color }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => toggleSeries(key)}
                        className="flex items-center gap-1.5 text-sm cursor-pointer transition-opacity"
                        style={{ opacity: visible[key] ? 1 : 0.4 }}
                    >
                        <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        {label}
                    </button>
                ))}
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={100}>
                    <ComposedChart
                        width={500}
                        height={400}
                        data={data}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tickMargin={8}
                            ticks={xAxisTicks}
                            tickFormatter={xAxisDateFormatter}
                            tick={{ fill: "grey", fontSize: 14 }}
                        />

                        <YAxis
                            yAxisId="count"
                            dataKey="views"
                            domain={[0, Math.max(...yAxisCountTicks)]}
                            tickLine={false}
                            tickMargin={5}
                            ticks={yAxisCountTicks}
                            tick={{ fill: "grey", fontSize: 14 }}
                        />
                        <YAxis
                            yAxisId="bounceRate"
                            dataKey="bounceRate"
                            domain={[0, 120]}
                            hide={true}
                        />

                        <Tooltip
                            content={<CustomTooltip visible={visible} />}
                        />

                        {/* NOTE: colors defined in globals.css/tailwind.config.js */}
                        {visible.views && (
                            <Area
                                yAxisId="count"
                                dataKey="views"
                                stroke="#F46A3D"
                                strokeWidth="2"
                                fill="#F99C35"
                            />
                        )}
                        {visible.visitors && (
                            <Area
                                yAxisId="count"
                                dataKey="visitors"
                                stroke="#F46A3D"
                                strokeWidth="2"
                                fill="#f96d3e"
                            />
                        )}
                        {visible.bounceRate && (
                            <Line
                                yAxisId="bounceRate"
                                dataKey="bounceRate"
                                stroke="#56726C"
                                strokeWidth="2"
                                dot={false}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
