import { useState, memo } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
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

interface WorldMapProps {
    data: { code: string; count: number }[];
    onCountryClick?: (countryCode: string) => void;
}

function WorldMapComponent({ data, onCountryClick }: WorldMapProps) {
    const [tooltipContent, setTooltipContent] = useState<{
        name: string;
        count: number;
        x: number;
        y: number;
    } | null>(null);

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
                <ZoomableGroup>
                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const alpha2 =
                                    numericToAlpha2[geo.id] || "";
                                const count = countByCode[alpha2] || 0;
                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={getColor(alpha2)}
                                        stroke="hsl(var(--border))"
                                        strokeWidth={0.5}
                                        style={{
                                            default: { outline: "none" },
                                            hover: {
                                                outline: "none",
                                                fill: "#F46A3D",
                                                cursor: "pointer",
                                            },
                                            pressed: { outline: "none" },
                                        }}
                                        onMouseEnter={(evt) => {
                                            const name =
                                                geo.properties.name || "Unknown";
                                            setTooltipContent({
                                                name,
                                                count,
                                                x: evt.clientX,
                                                y: evt.clientY,
                                            });
                                        }}
                                        onMouseLeave={() => {
                                            setTooltipContent(null);
                                        }}
                                        onClick={() => {
                                            if (alpha2 && onCountryClick) {
                                                onCountryClick(alpha2);
                                            }
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>
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
                    <Card className="p-2 shadow-lg leading-normal">
                        <div className="font-semibold">
                            {tooltipContent.name}
                        </div>
                        <div>
                            {Intl.NumberFormat("en", {
                                notation: "compact",
                            }).format(tooltipContent.count)}{" "}
                            visitors
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

const WorldMap = memo(WorldMapComponent);
export default WorldMap;
