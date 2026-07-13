import { describe, it, expect } from "bun:test"
import {
  importSTJsonl,
  importOobaChat,
  importAgnaiChat,
  importCAIChat,
  importKoboldLiteChat,
  importRisuChat,
  flattenChubChat,
  detectChatFormat,
  importChat,
} from "../chat.importer"

describe("importSTJsonl", () => {
  it("skips metadata line and parses messages", () => {
    const lines = [
      '{"user_name":"User","character_name":"Alice"}',
      '{"name":"User","is_user":true,"send_date":"2024-01-01T00:00:00.000Z","mes":"Hello","extra":{}}',
      '{"name":"Alice","is_user":false,"send_date":"2024-01-01T00:00:01.000Z","mes":"Hi there","extra":{}}',
    ]
    const result = importSTJsonl(lines)

    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty("name", "User")
    expect(result[0]).toHaveProperty("is_user", true)
    expect(result[0]).toHaveProperty("mes", "Hello")
    expect(result[1]).toHaveProperty("name", "Alice")
    expect(result[1]).toHaveProperty("is_user", false)
    expect(result[1]).toHaveProperty("mes", "Hi there")
  })

  it("filters empty lines", () => {
    const lines = [
      '{"user_name":"User","character_name":"Alice"}',
      "",
      '{"name":"User","is_user":true,"send_date":"2024-01-01T00:00:00.000Z","mes":"Hello","extra":{}}',
      "  ",
    ]
    const result = importSTJsonl(lines)
    expect(result).toHaveLength(1)
  })
})

describe("importOobaChat", () => {
  it("converts data_visible pairs to messages", () => {
    const data = {
      data_visible: [
        ["Hey there", "Hello! How can I help?"],
        ["Tell me a joke", "Why did the chicken cross the road? To get to the other side!"],
      ],
    }
    const result = importOobaChat("User", "Alice", data)

    expect(result).toHaveLength(4)
    expect(result[0]).toMatchObject({ name: "User", is_user: true, mes: "Hey there" })
    expect(result[1]).toMatchObject({ name: "Alice", is_user: false, mes: "Hello! How can I help?" })
    expect(result[2]).toMatchObject({ name: "User", is_user: true, mes: "Tell me a joke" })
    expect(result[3]).toMatchObject({
      name: "Alice",
      is_user: false,
      mes: "Why did the chicken cross the road? To get to the other side!",
    })
  })

  it("returns empty array for missing data_visible", () => {
    expect(importOobaChat("User", "Alice", {})).toEqual([])
    expect(importOobaChat("User", "Alice", { data_visible: null })).toEqual([])
  })

  it("skips malformed pairs", () => {
    const data = {
      data_visible: [
        ["Valid pair", "Response"],
        ["Single"],
        [],
      ],
    }
    const result = importOobaChat("User", "Alice", data)
    expect(result).toHaveLength(2)
  })
})

describe("importAgnaiChat", () => {
  it("converts messages array to ChatMessages", () => {
    const data = {
      messages: [
        { userId: true, msg: "Hello" },
        { userId: false, msg: "Hi there" },
        { userId: true, msg: "How are you?" },
      ],
    }
    const result = importAgnaiChat("User", "Alice", data)

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ name: "User", is_user: true, mes: "Hello" })
    expect(result[1]).toMatchObject({ name: "Alice", is_user: false, mes: "Hi there" })
    expect(result[2]).toMatchObject({ name: "User", is_user: true, mes: "How are you?" })
  })

  it("returns empty array for missing messages", () => {
    expect(importAgnaiChat("User", "Alice", {})).toEqual([])
  })
})

describe("importCAIChat", () => {
  it("converts histories to ChatMessages", () => {
    const data = {
      histories: [
        {
          msgs: [
            { src: { is_human: true }, text: "Hello" },
            { src: { is_human: false }, text: "Hi there" },
          ],
        },
      ],
    }
    const result = importCAIChat("User", "Alice", data)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ name: "User", is_user: true, mes: "Hello" })
    expect(result[1]).toMatchObject({ name: "Alice", is_user: false, mes: "Hi there" })
  })

  it("returns empty array for missing histories", () => {
    expect(importCAIChat("User", "Alice", {})).toEqual([])
    expect(importCAIChat("User", "Alice", { histories: [] })).toEqual([])
  })

  it("imports only the first history", () => {
    const data = {
      histories: [
        {
          msgs: [
            { src: { is_human: true }, text: "First chat" },
          ],
        },
        {
          msgs: [
            { src: { is_human: true }, text: "Second chat" },
          ],
        },
      ],
    }
    const result = importCAIChat("User", "Alice", data)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ mes: "First chat" })
  })
})

describe("importKoboldLiteChat", () => {
  it("converts INPUT/OUTPUT actions to ChatMessages", () => {
    const data = {
      savedsettings: { chatname: "Test Chat" },
      actions: [
        { type: "INPUT", token: "Hello" },
        { type: "OUTPUT", token: "Hi there" },
        { type: "INPUT", token: "How are you?" },
        { type: "OUTPUT", token: "I'm great!" },
      ],
    }
    const result = importKoboldLiteChat("User", "Alice", data)

    expect(result).toHaveLength(4)
    expect(result[0]).toMatchObject({ name: "User", is_user: true, mes: "Hello" })
    expect(result[1]).toMatchObject({ name: "Alice", is_user: false, mes: "Hi there" })
    expect(result[2]).toMatchObject({ name: "User", is_user: true, mes: "How are you?" })
    expect(result[3]).toMatchObject({ name: "Alice", is_user: false, mes: "I'm great!" })
  })

  it("skips actions without type or token", () => {
    const data = {
      actions: [
        { type: "INPUT", token: "Valid" },
        { type: "UNKNOWN", token: "Ignored" },
        { type: "INPUT" },
        { token: "No type" },
      ],
    }
    const result = importKoboldLiteChat("User", "Alice", data)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ mes: "Valid" })
  })

  it("returns empty array for missing actions", () => {
    expect(importKoboldLiteChat("User", "Alice", {})).toEqual([])
  })
})

describe("importRisuChat", () => {
  it("converts risuChat messages", () => {
    const data = {
      type: "risuChat",
      data: {
        message: [
          { role: "user", name: "User", data: "Hello", time: "2024-01-01T00:00:00.000Z" },
          { role: "char", name: "Alice", data: "Hi there", time: "2024-01-01T00:00:01.000Z" },
          { role: "self", name: "User", data: "How are you?", time: "2024-01-01T00:00:02.000Z" },
        ],
      },
    }
    const result = importRisuChat("User", "Alice", data)

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ name: "User", is_user: true, mes: "Hello" })
    expect(result[1]).toMatchObject({ name: "Alice", is_user: false, mes: "Hi there" })
    expect(result[2]).toMatchObject({ name: "User", is_user: true, mes: "How are you?" })
  })

  it("falls back to provided names when name is missing", () => {
    const data = {
      type: "risuChat",
      data: {
        message: [
          { role: "user", data: "Hello" },
          { role: "char", data: "Hi there" },
        ],
      },
    }
    const result = importRisuChat("User", "Alice", data)

    expect(result[0]).toMatchObject({ name: "User", is_user: true })
    expect(result[1]).toMatchObject({ name: "Alice", is_user: false })
  })

  it("returns empty array for missing data", () => {
    expect(importRisuChat("User", "Alice", { type: "risuChat" })).toEqual([])
    expect(
      importRisuChat("User", "Alice", { type: "risuChat", data: {} }),
    ).toEqual([])
  })
})

describe("flattenChubChat", () => {
  it("flattens standard Chub messages", () => {
    const lines = [
      '{"name":"User","is_user":true,"send_date":"2024-01-01T00:00:00.000Z","mes":"Hello","extra":{}}',
      '{"name":"Alice","is_user":false,"send_date":"2024-01-01T00:00:01.000Z","mes":"Hi there","extra":{}}',
    ]
    const result = flattenChubChat("User", "Alice", lines)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ name: "User", is_user: true, mes: "Hello" })
    expect(result[1]).toMatchObject({ name: "Alice", is_user: false, mes: "Hi there" })
  })

  it("flattens nested message objects", () => {
    const lines = [
      '{"name":"User","is_user":true,"message":{"message":"Nested hello"},"extra":{}}',
    ]
    const result = flattenChubChat("User", "Alice", lines)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ mes: "Nested hello" })
  })

  it("flattens nested swipes", () => {
    const lines = [
      '{"name":"Alice","is_user":false,"mes":"Hi","extra":{},"swipes":[{"message":"Swipe 1"},{"message":"Swipe 2"}]}',
    ]
    const result = flattenChubChat("User", "Alice", lines)

    expect(result).toHaveLength(1)
    expect(result[0]!.swipes).toEqual(["Swipe 1", "Swipe 2"])
  })

  it("falls back to provided names when name is missing", () => {
    const lines = [
      '{"is_user":true,"mes":"Hello"}',
      '{"is_user":false,"mes":"Hi there"}',
    ]
    const result = flattenChubChat("User", "Alice", lines)

    expect(result[0]).toMatchObject({ name: "User", is_user: true })
    expect(result[1]).toMatchObject({ name: "Alice", is_user: false })
  })

  it("filters empty lines", () => {
    const lines = [
      '{"name":"User","is_user":true,"mes":"Hello","extra":{}}',
      "",
      "  ",
      '{"name":"Alice","is_user":false,"mes":"Hi there","extra":{}}',
    ]
    const result = flattenChubChat("User", "Alice", lines)
    expect(result).toHaveLength(2)
  })
})

describe("detectChatFormat", () => {
  it("detects oobabooga format", () => {
    const content = JSON.stringify({ data_visible: [["msg", "reply"]] })
    expect(detectChatFormat(content)).toBe("json-ooba")
  })

  it("detects Agnai format", () => {
    const content = JSON.stringify({ messages: [{ userId: true, msg: "Hello" }] })
    expect(detectChatFormat(content)).toBe("json-agnai")
  })

  it("detects CAI Tools format", () => {
    const content = JSON.stringify({ histories: [{ msgs: [] }] })
    expect(detectChatFormat(content)).toBe("json-cai")
  })

  it("detects Kobold Lite format", () => {
    const content = JSON.stringify({ actions: [{ type: "INPUT", token: "msg" }] })
    expect(detectChatFormat(content)).toBe("json-kobold")
  })

  it("detects RisuAI format", () => {
    const content = JSON.stringify({ type: "risuChat", data: {} })
    expect(detectChatFormat(content)).toBe("json-risu")
  })

  it("detects ST JSONL format", () => {
    const content =
      '{"user_name":"User","character_name":"Alice"}\n{"name":"User","is_user":true,"mes":"Hello","extra":{}}'
    expect(detectChatFormat(content)).toBe("jsonl")
  })

  it("detects JSONL with chat_metadata", () => {
    const content =
      '{"chat_metadata":true}\n{"name":"User","is_user":true,"mes":"Hello","extra":{}}'
    expect(detectChatFormat(content)).toBe("jsonl")
  })

  it("defaults to Chub format for single-line JSONL", () => {
    const content = '{"name":"User","is_user":true,"mes":"Hello","extra":{}}'
    expect(detectChatFormat(content)).toBe("json-chub")
  })

  it("defaults to Chub format for unrecognized JSON", () => {
    const content = JSON.stringify({ foo: "bar" })
    expect(detectChatFormat(content)).toBe("json-chub")
  })
})

describe("importChat", () => {
  it("dispatches to oobabooga importer", () => {
    const content = JSON.stringify({ data_visible: [["Hello", "Hi"]] })
    const result = importChat(content, "User", "Alice")
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ name: "User", mes: "Hello" })
  })

  it("dispatches to Agnai importer", () => {
    const content = JSON.stringify({ messages: [{ userId: true, msg: "Hello" }] })
    const result = importChat(content, "User", "Alice")
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: "User", mes: "Hello" })
  })

  it("dispatches to CAI importer", () => {
    const content = JSON.stringify({ histories: [{ msgs: [{ src: { is_human: true }, text: "Hello" }] }] })
    const result = importChat(content, "User", "Alice")
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: "User", mes: "Hello" })
  })

  it("dispatches to Kobold Lite importer", () => {
    const content = JSON.stringify({ actions: [{ type: "INPUT", token: "Hello" }] })
    const result = importChat(content, "User", "Alice")
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: "User", mes: "Hello" })
  })

  it("dispatches to Risu importer", () => {
    const content = JSON.stringify({ type: "risuChat", data: { message: [{ role: "user", data: "Hello" }] } })
    const result = importChat(content, "User", "Alice")
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: "User", mes: "Hello" })
  })

  it("dispatches to ST JSONL importer", () => {
    const content =
      '{"user_name":"User","character_name":"Alice"}\n{"name":"User","is_user":true,"send_date":"2024-01-01T00:00:00.000Z","mes":"Hello","extra":{}}'
    const result = importChat(content, "User", "Alice")
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: "User", mes: "Hello" })
  })

  it("dispatches to Chub importer as fallback", () => {
    const content = '{"name":"User","is_user":true,"mes":"Hello","extra":{}}'
    const result = importChat(content, "User", "Alice")
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: "User", mes: "Hello" })
  })
})
