import { useState, useMemo, memo } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    ZoomableGroup,
} from "react-simple-maps";
import { Card } from "./ui/card";

// ISO 3166-1 numeric -> ISO alpha-2 mapping
// TopoJSON (countries-110m.json) uses numeric IDs; analytics data uses alpha-2
const numericToAlpha2: Record<string, string> = {
    "004": "AF", "008": "AL", "010": "AQ", "012": "DZ", "024": "AO",
    "031": "AZ", "032": "AR", "036": "AU", "040": "AT", "044": "BS",
    "050": "BD", "051": "AM", "056": "BE", "064": "BT", "068": "BO",
    "070": "BA", "072": "BW", "076": "BR", "084": "BZ", "090": "SB",
    "096": "BN", "100": "BG", "104": "MM", "108": "BI", "112": "BY",
    "116": "KH", "120": "CM", "124": "CA", "140": "CF", "144": "LK",
    "148": "TD", "152": "CL", "156": "CN", "158": "TW", "170": "CO",
    "178": "CG", "180": "CD", "188": "CR", "191": "HR", "192": "CU",
    "196": "CY", "203": "CZ", "204": "BJ", "208": "DK", "214": "DO",
    "218": "EC", "222": "SV", "226": "GQ", "231": "ET", "232": "ER",
    "233": "EE", "238": "FK", "242": "FJ", "246": "FI", "250": "FR",
    "260": "TF", "262": "DJ", "266": "GA", "268": "GE", "270": "GM",
    "275": "PS", "276": "DE", "288": "GH", "296": "KI", "300": "GR",
    "304": "GL", "320": "GT", "324": "GN", "328": "GY", "332": "HT",
    "340": "HN", "348": "HU", "352": "IS", "356": "IN", "360": "ID",
    "364": "IR", "368": "IQ", "372": "IE", "376": "IL", "380": "IT",
    "384": "CI", "388": "JM", "392": "JP", "398": "KZ", "400": "JO",
    "404": "KE", "408": "KP", "410": "KR", "414": "KW", "417": "KG",
    "418": "LA", "422": "LB", "426": "LS", "428": "LV", "430": "LR",
    "434": "LY", "440": "LT", "442": "LU", "450": "MG", "454": "MW",
    "458": "MY", "466": "ML", "478": "MR", "484": "MX", "496": "MN",
    "498": "MD", "499": "ME", "504": "MA", "508": "MZ", "512": "OM",
    "516": "NA", "524": "NP", "528": "NL", "540": "NC", "548": "VU",
    "554": "NZ", "558": "NI", "562": "NE", "566": "NG", "578": "NO",
    "586": "PK", "591": "PA", "598": "PG", "600": "PY", "604": "PE",
    "608": "PH", "616": "PL", "620": "PT", "624": "GW", "626": "TL",
    "630": "PR", "634": "QA", "642": "RO", "643": "RU", "646": "RW",
    "682": "SA", "686": "SN", "688": "RS", "694": "SL", "703": "SK",
    "704": "VN", "705": "SI", "706": "SO", "710": "ZA", "716": "ZW",
    "724": "ES", "728": "SS", "729": "SD", "732": "EH", "740": "SR",
    "748": "SZ", "752": "SE", "756": "CH", "760": "SY", "762": "TJ",
    "764": "TH", "768": "TG", "780": "TT", "784": "AE", "788": "TN",
    "792": "TR", "795": "TM", "800": "UG", "804": "UA", "807": "MK",
    "818": "EG", "826": "GB", "834": "TZ", "840": "US", "854": "BF",
    "858": "UY", "860": "UZ", "862": "VE", "887": "YE", "894": "ZM",
};

const GEO_URL = "/countries-110m.json";

interface CityMarker {
    city: string;
    lat: number;
    lon: number;
    count: number;
}

interface ClusteredMarker {
    lat: number;
    lon: number;
    totalCount: number;
    entries: { name: string; count: number }[];
}

const CLUSTER_RADIUS = 8; // degrees at zoom=1

function clusterMarkers(markers: CityMarker[], zoom: number): ClusteredMarker[] {
    if (markers.length === 0) return [];

    const sorted = [...markers].sort((a, b) => b.count - a.count);
    const threshold = CLUSTER_RADIUS / zoom;
    const clusters: ClusteredMarker[] = [];

    for (const marker of sorted) {
        let merged = false;
        for (const cluster of clusters) {
            const dLat = cluster.lat - marker.lat;
            const dLon = cluster.lon - marker.lon;
            const dist = Math.sqrt(dLat * dLat + dLon * dLon);
            if (dist < threshold) {
                // Weighted centroid
                const totalCount = cluster.totalCount + marker.count;
                cluster.lat =
                    (cluster.lat * cluster.totalCount + marker.lat * marker.count) /
                    totalCount;
                cluster.lon =
                    (cluster.lon * cluster.totalCount + marker.lon * marker.count) /
                    totalCount;
                cluster.totalCount = totalCount;
                cluster.entries.push({ name: marker.city, count: marker.count });
                merged = true;
                break;
            }
        }
        if (!merged) {
            clusters.push({
                lat: marker.lat,
                lon: marker.lon,
                totalCount: marker.count,
                entries: [{ name: marker.city, count: marker.count }],
            });
        }
    }

    return clusters;
}

type MapMode = "countries" | "cities";

interface WorldMapProps {
    data: { code: string; count: number }[];
    cityMarkers?: CityMarker[];
    mode?: MapMode;
    onCountryClick?: (countryCode: string) => void;
    onCityClick?: (city: string) => void;
}

function WorldMapComponent({
    data,
    cityMarkers,
    mode = "countries",
    onCountryClick,
    onCityClick,
}: WorldMapProps) {
    const [tooltipContent, setTooltipContent] = useState<{
        entries: { name: string; count: number }[];
        totalCount: number;
        x: number;
        y: number;
    } | null>(null);
    const [zoom, setZoom] = useState(1);

    const clusters = useMemo(
        () => clusterMarkers(cityMarkers ?? [], zoom),
        [cityMarkers, zoom],
    );

    // Build a lookup from alpha-2 code to count
    const countByCode: Record<string, number> = {};
    let maxCount = 0;
    for (const { code, count } of data) {
        countByCode[code] = count;
        if (count > maxCount) maxCount = count;
    }

    function getColor(code: string): string {
        const count = countByCode[code];
        if (!count) return "hsl(var(--muted))";

        // Logarithmic scale for better color distribution
        const intensity = Math.log(count + 1) / Math.log(maxCount + 1);
        // Interpolate from a light muted orange to the primary orange
        const r = Math.round(200 + (244 - 200) * intensity);
        const g = Math.round(180 + (106 - 180) * intensity);
        const b = Math.round(140 + (61 - 140) * intensity);
        return `rgb(${r}, ${g}, ${b})`;
    }

    return (
        <div className="relative aspect-[2/1] w-full">
            <ComposableMap
                projectionConfig={{ scale: 147, center: [0, 10] }}
                className="w-full h-full"
            >
                <ZoomableGroup
                    maxZoom={20}
                    onMoveEnd={({ zoom: z }) => setZoom(z)}
                >
                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const alpha2 =
                                    numericToAlpha2[geo.id] || "";
                                const count = countByCode[alpha2] || 0;
                                const showChoropleth = mode === "countries";
                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={
                                            showChoropleth
                                                ? getColor(alpha2)
                                                : "hsl(var(--muted))"
                                        }
                                        stroke="hsl(var(--border))"
                                        strokeWidth={0.5}
                                        style={{
                                            default: { outline: "none" },
                                            hover: {
                                                outline: "none",
                                                fill: showChoropleth
                                                    ? "#F46A3D"
                                                    : "hsl(var(--muted))",
                                                cursor: showChoropleth
                                                    ? "pointer"
                                                    : "default",
                                            },
                                            pressed: { outline: "none" },
                                        }}
                                        onMouseEnter={(evt) => {
                                            if (!showChoropleth) return;
                                            const name =
                                                geo.properties.name || "Unknown";
                                            setTooltipContent({
                                                entries: [{ name, count }],
                                                totalCount: count,
                                                x: evt.clientX,
                                                y: evt.clientY,
                                            });
                                        }}
                                        onMouseLeave={() => {
                                            setTooltipContent(null);
                                        }}
                                        onClick={() => {
                                            if (
                                                showChoropleth &&
                                                alpha2 &&
                                                onCountryClick
                                            ) {
                                                onCountryClick(alpha2);
                                            }
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>
                    {mode === "cities" &&
                        (() => {
                            const maxMarkerCount = clusters.reduce(
                                (max, c) => Math.max(max, c.totalCount),
                                1,
                            );
                            return clusters.map((cluster, i) => {
                                const isSingle = cluster.entries.length === 1;
                                const baseRadius =
                                    2 +
                                    (6 * Math.log(cluster.totalCount + 1)) /
                                        Math.log(maxMarkerCount + 1);
                                const radius = baseRadius / Math.pow(zoom, 0.7);
                                const opacity = isSingle ? 0.7 : 0.85;
                                return (
                                    <Marker
                                        key={`cluster-${i}-${cluster.lat}-${cluster.lon}`}
                                        coordinates={[
                                            cluster.lon,
                                            cluster.lat,
                                        ]}
                                    >
                                        <circle
                                            r={radius}
                                            fill={`rgba(244, 106, 61, ${opacity})`}
                                            stroke="#fff"
                                            strokeWidth={0.5 / Math.pow(zoom, 0.7)}
                                            style={{ cursor: "pointer" }}
                                            onMouseEnter={(evt) => {
                                                setTooltipContent({
                                                    entries: cluster.entries,
                                                    totalCount: cluster.totalCount,
                                                    x: evt.clientX,
                                                    y: evt.clientY,
                                                });
                                            }}
                                            onMouseLeave={() => {
                                                setTooltipContent(null);
                                            }}
                                            onClick={() => {
                                                if (isSingle && onCityClick) {
                                                    onCityClick(cluster.entries[0].name);
                                                }
                                            }}
                                        />
                                        {!isSingle && (
                                            <text
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                style={{
                                                    fontSize: `${Math.max(3 / Math.pow(zoom, 0.7), radius * 0.9)}px`,
                                                    fill: "#fff",
                                                    fontWeight: 600,
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                {cluster.entries.length}
                                            </text>
                                        )}
                                    </Marker>
                                );
                            });
                        })()}
                </ZoomableGroup>
            </ComposableMap>
            {tooltipContent && (
                <div
                    className="pointer-events-none fixed z-50"
                    style={{
                        left: tooltipContent.x + 10,
                        top: tooltipContent.y - 40,
                    }}
                >
                    <Card className="p-2 shadow-lg leading-normal max-h-48 overflow-y-auto">
                        {tooltipContent.entries.length === 1 ? (
                            <>
                                <div className="font-semibold">
                                    {tooltipContent.entries[0].name}
                                </div>
                                <div>
                                    {Intl.NumberFormat("en", {
                                        notation: "compact",
                                    }).format(tooltipContent.totalCount)}{" "}
                                    visitors
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="font-semibold mb-1">
                                    {tooltipContent.entries.length} cities &middot;{" "}
                                    {Intl.NumberFormat("en", {
                                        notation: "compact",
                                    }).format(tooltipContent.totalCount)}{" "}
                                    visitors
                                </div>
                                {tooltipContent.entries
                                    .sort((a, b) => b.count - a.count)
                                    .slice(0, 10)
                                    .map((entry) => (
                                        <div
                                            key={entry.name}
                                            className="text-sm flex justify-between gap-3"
                                        >
                                            <span>{entry.name}</span>
                                            <span className="text-muted-foreground">
                                                {Intl.NumberFormat("en", {
                                                    notation: "compact",
                                                }).format(entry.count)}
                                            </span>
                                        </div>
                                    ))}
                                {tooltipContent.entries.length > 10 && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                        +{tooltipContent.entries.length - 10} more
                                    </div>
                                )}
                            </>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}

const WorldMap = memo(WorldMapComponent);
export default WorldMap;
