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

import { loader } from "../resources.city";
import { createFetchResponse, getDefaultContext } from "./testutils";

describe("Resources/City route", () => {
    let fetch: Mock;

    beforeEach(() => {
        fetch = global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loader", () => {
        test("returns all cities without filters", async () => {
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
                    url: "http://localhost:3000/resources/city?site=test",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["San Francisco", 50],
                    ["Munich", 20],
                ],
                page: 1,
            });
        });

        test("filters by region and extracts city names", async () => {
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
                    url: "http://localhost:3000/resources/city?site=test&country=US&region=California",
                },
            });

            const json = await response;
            expect(json).toEqual({
                countsByProperty: [
                    ["San Francisco", 50],
                    ["Los Angeles", 30],
                ],
                page: 1,
            });
        });
    });
});
