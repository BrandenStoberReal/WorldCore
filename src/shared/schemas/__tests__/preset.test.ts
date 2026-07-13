import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { PresetSchema } from "@/shared/schemas/preset";

const readFixture = (path: string) => JSON.parse(readFileSync(path, "utf-8"));

describe("Preset parsing - all categories", () => {
  it("parses openai preset", () => {
    const fixture = readFixture("tests/fixtures/presets/openai.json");
    const result = PresetSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("openai");
      expect(result.data.data.temperature).toBe(0.7);
      expect(result.data.data.max_tokens).toBe(400);
    }
  });

  it("parses kobold preset", () => {
    const fixture = readFixture("tests/fixtures/presets/kobold.json");
    const result = PresetSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("kobold");
      expect(result.data.data.temp).toBe(0.8);
      expect(result.data.data.top_k).toBe(50);
    }
  });

  it("parses textgenerationwebui preset", () => {
    const fixture = readFixture("tests/fixtures/presets/textgen.json");
    const result = PresetSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("textgenerationwebui");
      expect(result.data.data.rep_pen).toBe(1.2);
    }
  });

  it("parses novel preset", () => {
    const fixture = readFixture("tests/fixtures/presets/novel.json");
    const result = PresetSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("novel");
      expect(result.data.data.max_length).toBe(150);
    }
  });

  it("parses instruct preset", () => {
    const fixture = readFixture("tests/fixtures/presets/instruct.json");
    const result = PresetSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("instruct");
      expect(result.data.data.input_sequence).toBe("### Human:\n");
      expect(result.data.data.output_sequence).toBe("### Assistant:\n");
    }
  });

  it("parses context preset", () => {
    const fixture = readFixture("tests/fixtures/presets/context.json");
    const result = PresetSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("context");
      expect(result.data.data.story_string).toContain("{{#description}}");
    }
  });

  it("parses sysprompt preset", () => {
    const fixture = readFixture("tests/fixtures/presets/sysprompt.json");
    const result = PresetSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("sysprompt");
      expect(result.data.data.name).toBe("Default System Prompt");
    }
  });

  it("parses reasoning preset", () => {
    const fixture = readFixture("tests/fixtures/presets/reasoning.json");
    const result = PresetSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("reasoning");
      expect(result.data.data.name).toBe("Default Reasoning");
    }
  });

  it("rejects invalid category", () => {
    const result = PresetSchema.safeParse({
      category: "invalid_category",
      data: {},
    });
    expect(result.success).toBe(false);
  });
});
