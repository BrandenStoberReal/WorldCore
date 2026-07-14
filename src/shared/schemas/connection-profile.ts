import { z } from "zod"

export const ConnectionProfileSchema = z.object({
  id: z.string(),
  name: z.string(),

  // API Connection
  api: z.string(),                    // API type: 'openai', 'text-completions', etc.
  model: z.string(),                  // Model name
  apiUrl: z.string().optional(),      // Server URL endpoint
  secretId: z.string().optional(),    // API key reference ID

  // Presets & Templates
  preset: z.string().optional(),      // Settings preset name
  instruct: z.string().optional(),    // Instruct template name
  context: z.string().optional(),     // Context template name
  sysprompt: z.string().optional(),   // System prompt name
  syspromptState: z.boolean().optional(), // System prompt enabled
  instructState: z.boolean().optional(),  // Instruct mode enabled

  // Generation Settings
  stopStrings: z.string().optional(),     // Custom stopping strings
  startReplyWith: z.string().optional(),  // Start reply with text
  reasoningTemplate: z.string().optional(), // Reasoning formatting template
  promptPostProcessing: z.string().optional(), // Prompt post-processing method

  // Text Completion Specific
  tokenizer: z.string().optional(),   // Tokenizer selection

  // Other
  proxy: z.string().optional(),       // Proxy preset name
  regexPreset: z.string().optional(), // Regex preset ID
  exclude: z.array(z.string()).optional(), // Commands to exclude from profile

  // Metadata
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type ConnectionProfile = z.infer<typeof ConnectionProfileSchema>

export const ConnectionProfileCreateInputSchema = ConnectionProfileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type ConnectionProfileCreateInput = z.infer<typeof ConnectionProfileCreateInputSchema>

export const ConnectionProfileUpdateInputSchema = ConnectionProfileCreateInputSchema.partial()

export type ConnectionProfileUpdateInput = z.infer<typeof ConnectionProfileUpdateInputSchema>
