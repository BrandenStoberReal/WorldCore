import { searchSerpApi } from "./serpapi"
import { searchSearXNG } from "./searxng"
import { searchTavily } from "./tavily"
import { searchGoogle } from "./google"
import { searchBing } from "./bing"
import { searchDuckDuckGo } from "./duckduckgo"
import { searchBrave } from "./brave"
import { secretManager } from "@/server/services/secrets.service"
import type { SearchProvider } from "@/shared/types/search"
import type { SecretKey } from "@/shared/types/secret"
import { ApiError } from "@/server/errors"

export async function search(
  query: string,
  provider: SearchProvider,
): Promise<Array<Record<string, unknown>>> {
  switch (provider) {
    case "serpapi": {
      const secret = await secretManager.read("serpapi_key" as SecretKey)
      if (!secret) throw new ApiError("MISSING_SECRET", "serpapi_key not configured", 500)
      return searchSerpApi(query, secret.value)
    }
    case "searxng": {
      const secret = await secretManager.read("searxng_url" as SecretKey)
      if (!secret) throw new ApiError("MISSING_SECRET", "searxng_url not configured", 500)
      return searchSearXNG(query, secret.value)
    }
    case "tavily": {
      const secret = await secretManager.read("tavily_key" as SecretKey)
      if (!secret) throw new ApiError("MISSING_SECRET", "tavily_key not configured", 500)
      return searchTavily(query, secret.value)
    }
    case "google": {
      const secret = await secretManager.read("google_translate_key" as SecretKey)
      if (!secret) throw new ApiError("MISSING_SECRET", "google_translate_key not configured", 500)
      return searchGoogle(query, secret.value)
    }
    case "bing": {
      const secret = await secretManager.read("bing_translate_key" as SecretKey)
      if (!secret) throw new ApiError("MISSING_SECRET", "bing_translate_key not configured", 500)
      return searchBing(query, secret.value)
    }
    case "duckduckgo":
      return searchDuckDuckGo(query)
    case "brave": {
      const secret = await secretManager.read("tavily_key" as SecretKey)
      if (!secret) throw new ApiError("MISSING_SECRET", "brave key not configured", 500)
      return searchBrave(query, secret.value)
    }
    default:
      throw new ApiError("UNKNOWN_PROVIDER", `Unknown search provider: ${provider}`, 400)
  }
}
