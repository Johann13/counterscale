// @vitest-environment jsdom
import {
    vi,
    test,
    describe,
    beforeEach,
    afterEach,
    expect,
    Mock,
} from "vitest";
import "vitest-dom/extend-expect";

import { loader } from "../resources.region";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/Region route", () => {
    let fetch: Mock;

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("returns all regions without country filter", async () => {
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob18: "California|San Francisco", count: "50" },
                        { blob18: "Bavaria|Munich", count: "20" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/region?site=test",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["California", 50],
                    ["Bavaria", 20],
                ],
                page: 1,
                previousCountsByProperty: null,
            });
        });

        test("aggregates packed blob18 data by region", async () => {
            fetch.mockResolvedValueOnce(
                createFetchResponse({
                    data: [
                        { blob18: "California|San Francisco", count: "50" },
                        { blob18: "California|Los Angeles", count: "30" },
                        { blob18: "New York|New York City", count: "25" },
                    ],
                }),
            );

            const response = await loader({
                ...getDefaultContext(),
                // @ts-expect-error we don't need to provide all the properties of the request object
                request: {
                    url: "http://localhost:3000/resources/region?site=test&country=US",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["California", 80],
                    ["New York", 25],
                ],
                page: 1,
                previousCountsByProperty: null,
            });
        });
    });
});
