import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { ApiSuccessSchema, ApiErrorSchema, PaginatedSchema } from "@/shared/schemas/api";

describe("ApiSuccessSchema", () => {
  it("parses valid success response", () => {
    const schema = ApiSuccessSchema(z.object({ name: z.string() }));
    const result = schema.safeParse({
      success: true,
      data: { name: "test" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.name).toBe("test");
    }
  });

  it("rejects non-success response", () => {
    const schema = ApiSuccessSchema(z.object({ name: z.string() }));
    const result = schema.safeParse({
      success: false,
      data: { name: "test" },
    });
    expect(result.success).toBe(false);
  });
});

describe("ApiErrorSchema", () => {
  it("parses valid error response", () => {
    const result = ApiErrorSchema.safeParse({
      success: false,
      error: {
        message: "Something went wrong",
        code: "INTERNAL_ERROR",
        details: { field: "name" },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.error.message).toBe("Something went wrong");
      expect(result.data.error.code).toBe("INTERNAL_ERROR");
    }
  });

  it("parses error without optional fields", () => {
    const result = ApiErrorSchema.safeParse({
      success: false,
      error: {
        message: "Simple error",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-error success field", () => {
    const result = ApiErrorSchema.safeParse({
      success: true,
      error: {
        message: "Should fail",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("PaginatedSchema", () => {
  it("parses valid paginated response", () => {
    const schema = PaginatedSchema(z.object({ id: z.string(), name: z.string() }));
    const result = schema.safeParse({
      items: [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ],
      total: 20,
      page: 1,
      perPage: 10,
      totalPages: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items.length).toBe(2);
      expect(result.data.total).toBe(20);
      expect(result.data.page).toBe(1);
    }
  });

  it("rejects missing fields", () => {
    const schema = PaginatedSchema(z.object({ id: z.string() }));
    const result = schema.safeParse({
      items: [{ id: "1" }],
      total: 1,
    });
    expect(result.success).toBe(false);
  });
});
