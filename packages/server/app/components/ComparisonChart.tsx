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
import { Card } from "./ui/card";

interface Visibility {
    views: boolean;
    visitors: boolean;
    bounceRate: boolean;
}

interface DataPoint {
    date: string;
    views: number;
    visitors: number;
    bounceRate: number;
}

interface ComparisonChartProps {
    currentData: DataPoint[];
    previousData: DataPoint[];
    intervalType?: string;
}

interface MergedPoint {
    label: string;
    currentDate: string;
    previousDate: string;
    curViews: number;
    curVisitors: number;
    curBounceRate: number;
    prevViews: number;
    prevVisitors: number;
    prevBounceRate: number;
}

function dateStringToLocalDateObj(dateString: string): Date {
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date;
}

function formatDate(dateString: string): string {
    if (!dateString) return "";
    const date = dateStringToLocalDateObj(dateString);
    return date.toLocaleString("en-us", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZoneName: "short",
    });
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

function ComparisonTooltip(props: any) {
    const { active, payload, visible } = props;

    if (active && payload && payload.length) {
        const point = payload[0]?.payload as MergedPoint;
        if (!point) return null;

        return (
            <Card className="p-2 shadow-lg leading-normal text-sm">
                <div className="font-semibold mb-1">
                    {formatDate(point.currentDate)}
                </div>
                {visible.visitors && (
                    <div>
                        <span className="before:content-['•'] before:text-[#f96d3e] before:font-bold">
                            {" "}
                            {point.curVisitors} visitors
                        </span>
                        <span className="text-muted-foreground">
                            {" "}
                            (prev: {point.prevVisitors})
                        </span>
                    </div>
                )}
                {visible.views && (
                    <div>
                        <span className="before:content-['•'] before:text-[#F99C35] before:font-bold">
                            {" "}
                            {point.curViews} views
                        </span>
                        <span className="text-muted-foreground">
                            {" "}
                            (prev: {point.prevViews})
                        </span>
                    </div>
                )}
                {visible.bounceRate && (
                    <div>
                        <span className="before:content-['•'] before:text-[#56726C] before:font-bold">
                            {" "}
                            {point.curBounceRate}% bounce rate
                        </span>
                        <span className="text-muted-foreground">
                            {" "}
                            (prev: {point.prevBounceRate}%)
                        </span>
                    </div>
                )}
                {point.previousDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                        vs {formatDate(point.previousDate)}
                    </div>
                )}
            </Card>
        );
    }
    return null;
}

export default function ComparisonChart({
    currentData,
    previousData,
    intervalType,
}: ComparisonChartProps) {
    const [visible, setVisible] = useState<Visibility>({
        views: true,
        visitors: true,
        bounceRate: true,
    });

    function toggleSeries(key: keyof Visibility) {
        setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    const mergedData = useMemo(() => {
        const maxLen = Math.max(currentData.length, previousData.length);
        const result: MergedPoint[] = [];

        for (let i = 0; i < maxLen; i++) {
            const cur = currentData[i];
            const prev = previousData[i];

            result.push({
                label: cur?.date ?? prev?.date ?? String(i),
                currentDate: cur?.date ?? "",
                previousDate: prev?.date ?? "",
                curViews: cur?.views ?? 0,
                curVisitors: cur?.visitors ?? 0,
                curBounceRate: cur?.bounceRate ?? 0,
                prevViews: prev?.views ?? 0,
                prevVisitors: prev?.visitors ?? 0,
                prevBounceRate: prev?.bounceRate ?? 0,
            });
        }

        return result;
    }, [currentData, previousData]);

    function xAxisDateFormatter(date: string): string {
        if (!date) return "";
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
                return date;
        }
    }

    const yAxisCountTicks = useMemo(() => {
        const MAX_TICKS_TO_SHOW = 4;

        let maxCount = 0;
        if (visible.views) {
            maxCount = Math.max(
                maxCount,
                ...mergedData.map((d) => d.curViews),
                ...mergedData.map((d) => d.prevViews),
            );
        }
        if (visible.visitors) {
            maxCount = Math.max(
                maxCount,
                ...mergedData.map((d) => d.curVisitors),
                ...mergedData.map((d) => d.prevVisitors),
            );
        }

        if (maxCount === 0) return [1, 2, 3, 4];

        const magnitude = Math.floor(Math.log10(maxCount));
        const roundTo = Math.pow(10, Math.max(0, magnitude - 1));
        const numTicks = Math.min(MAX_TICKS_TO_SHOW, maxCount);
        const ticks = [];
        let increment = Math.floor(maxCount / numTicks);
        increment = Math.ceil(increment / roundTo) * roundTo;

        for (let i = 1; i <= numTicks + 1; i++) {
            ticks.push(i * increment);
        }

        return ticks;
    }, [mergedData, visible.views, visible.visitors]);

    const xAxisTicks = useMemo(
        () => mergedData.slice(1, -1).map((entry) => entry.label),
        [mergedData],
    );

    if (currentData.length === 0 && previousData.length === 0) {
        return null;
    }

    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex gap-4 px-2 pb-2">
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
                        data={mergedData}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="label"
                            tickMargin={8}
                            ticks={xAxisTicks}
                            tickFormatter={xAxisDateFormatter}
                            tick={{ fill: "grey", fontSize: 14 }}
                        />
                        <YAxis
                            yAxisId="count"
                            dataKey="curViews"
                            domain={[0, Math.max(...yAxisCountTicks)]}
                            tickLine={false}
                            tickMargin={5}
                            ticks={yAxisCountTicks}
                            tick={{ fill: "grey", fontSize: 14 }}
                        />
                        <YAxis
                            yAxisId="bounceRate"
                            dataKey="curBounceRate"
                            domain={[0, 120]}
                            hide={true}
                        />
                        <Tooltip
                            content={
                                <ComparisonTooltip visible={visible} />
                            }
                        />

                        {/* Current period: solid areas (same style as TimeSeriesChart) */}
                        {visible.views && (
                            <Area
                                yAxisId="count"
                                dataKey="curViews"
                                stroke="#F46A3D"
                                strokeWidth={2}
                                fill="#F99C35"
                            />
                        )}
                        {visible.visitors && (
                            <Area
                                yAxisId="count"
                                dataKey="curVisitors"
                                stroke="#F46A3D"
                                strokeWidth={2}
                                fill="#f96d3e"
                            />
                        )}
                        {visible.bounceRate && (
                            <Line
                                yAxisId="bounceRate"
                                dataKey="curBounceRate"
                                stroke="#56726C"
                                strokeWidth={2}
                                dot={false}
                            />
                        )}

                        {/* Previous period: solid areas with lighter/muted colors */}
                        {visible.views && (
                            <Area
                                yAxisId="count"
                                dataKey="prevViews"
                                stroke="#F9CC90"
                                strokeWidth={2}
                                fill="#F9CC90"
                                fillOpacity={0.3}
                            />
                        )}
                        {visible.visitors && (
                            <Area
                                yAxisId="count"
                                dataKey="prevVisitors"
                                stroke="#F9A98A"
                                strokeWidth={2}
                                fill="#F9A98A"
                                fillOpacity={0.3}
                            />
                        )}
                        {visible.bounceRate && (
                            <Line
                                yAxisId="bounceRate"
                                dataKey="prevBounceRate"
                                stroke="#9BB0AA"
                                strokeWidth={2}
                                dot={false}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <div className="flex gap-4 px-2 pt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-0.5 bg-foreground" />
                    Current period
                </div>
                <div className="flex items-center gap-1.5">
                    <span
                        className="inline-block w-4 h-0.5"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(to right, gray 0, gray 3px, transparent 3px, transparent 6px)",
                        }}
                    />
                    Previous period
                </div>
            </div>
        </div>
    );
}
