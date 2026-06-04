import { describe, expect, it } from "vitest";
import { parseEnvelope, parsePaginated } from "./envelope";

describe("parseEnvelope", () => {
  it("parses standard success envelope", () => {
    const result = parseEnvelope<{ id: string }>({
      data: { id: "1" },
      meta: { requestId: "req-1" },
      error: null,
    });
    expect(result.data.id).toBe("1");
    expect(result.meta.requestId).toBe("req-1");
  });

  it("parses legacy success envelope", () => {
    const result = parseEnvelope<string[]>({
      success: true,
      data: ["a"],
      timestamp: "2020-01-01",
    });
    expect(result.data).toEqual(["a"]);
  });
});

describe("parsePaginated", () => {
  it("reads pagination from meta.pagination", () => {
    const result = parsePaginated<{ id: string }>({
      data: [{ id: "1" }],
      meta: {
        requestId: "r1",
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
      error: null,
    });
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it("maps legacy items+meta wire shape", () => {
    const result = parsePaginated<{ id: string }>({
      items: [{ id: "2" }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    expect(result.items[0].id).toBe("2");
  });
});

