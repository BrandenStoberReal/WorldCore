import { errorGuard } from "@/server/middleware/errorGuard"
import {
  getSSOSettingsSafe,
  saveSSOSettings,
  getAuthentikAuthUrl,
  createSSOCallbackResponse,
  handleAutheliaAuth,
  verifyBasicAuth,
} from "@/server/auth/sso.service"
import { setSessionCookie, clearSessionCookie } from "@/server/auth/session"
import { SSOProviderSchema } from "@/shared/schemas/sso"
import type { SSOProvider } from "@/shared/types/sso"

function getRedirectUrl(req: Request): string {
  return req.headers.get("X-Forwarded-Host")
    ? `https://${req.headers.get("X-Forwarded-Host")}`
    : `http://${req.headers.get("Host") ?? "localhost:3000"}`
}

export const ssoRoutes = {
  login: errorGuard(async (req: Request): Promise<Response> => {
    const settings = await getSSOSettingsSafe()
    if (!settings.enabled) {
      return Response.json(
        { error: { code: "SSO_DISABLED", message: "SSO is not enabled" } },
        { status: 400 },
      )
    }

    const url = new URL(req.url)
    const provider = url.searchParams.get("provider")
    if (!provider) {
      return Response.json(
        { error: { code: "MISSING_PROVIDER", message: "SSO provider required" } },
        { status: 400 },
      )
    }

    const parsedProvider = SSOProviderSchema.safeParse(provider)
    if (!parsedProvider.success) {
      return Response.json(
        { error: { code: "INVALID_PROVIDER", message: "Invalid SSO provider" } },
        { status: 400 },
      )
    }

    const providerValue = parsedProvider.data as SSOProvider

    if (providerValue === "authentik") {
      const authUrl = getAuthentikAuthUrl(settings, getRedirectUrl(req))
      return Response.redirect(authUrl, 302)
    }

    if (providerValue === "authelia") {
      return Response.json({
        ok: true,
        message: "Authelia authentication is header-based. Ensure your reverse proxy is configured.",
      })
    }

    if (providerValue === "basicauth") {
      return Response.json({
        ok: true,
        message: "Basic Auth is header-based. Send Authorization header with your requests.",
      })
    }

    return Response.json(
      { error: { code: "UNSUPPORTED_PROVIDER", message: "Unsupported SSO provider" } },
      { status: 400 },
    )
  }),

  callback: errorGuard(async (req: Request): Promise<Response> => {
    const settings = await getSSOSettingsSafe()
    if (!settings.enabled) {
      return Response.json(
        { error: { code: "SSO_DISABLED", message: "SSO is not enabled" } },
        { status: 400 },
      )
    }

    const body = (await req.json()) as Record<string, unknown>
    const provider = body.provider as string | undefined
    if (!provider) {
      return Response.json(
        { error: { code: "MISSING_PROVIDER", message: "SSO provider required" } },
        { status: 400 },
      )
    }

    const parsedProvider = SSOProviderSchema.safeParse(provider)
    if (!parsedProvider.success) {
      return Response.json(
        { error: { code: "INVALID_PROVIDER", message: "Invalid SSO provider" } },
        { status: 400 },
      )
    }

    const providerValue = parsedProvider.data as SSOProvider
    const result = await createSSOCallbackResponse(providerValue, body)

    if (!result) {
      return Response.json(
        { error: { code: "SSO_FAILED", message: "SSO authentication failed" } },
        { status: 401 },
      )
    }

    const res = Response.json({
      ok: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
      },
    })
    setSessionCookie(res, result.session)
    return res
  }),

  logout: errorGuard(async (_req: Request): Promise<Response> => {
    const res = Response.json({ ok: true })
    clearSessionCookie(res)
    return res
  }),

  settings: errorGuard(async (req: Request): Promise<Response> => {
    if (req.method === "GET") {
      const settings = await getSSOSettingsSafe()
      const { authentikClientSecret, basicAuthUsers, ...safeSettings } = settings
      return Response.json({
        ...safeSettings,
        hasAuthentikClientSecret: !!authentikClientSecret,
        basicAuthUserCount: basicAuthUsers?.length ?? 0,
      })
    }

    if (req.method === "POST") {
      const { withAdmin } = await import("@/server/middleware/auth")
      return withAdmin(async (req: Request): Promise<Response> => {
        const body = (await req.json()) as Record<string, unknown>
        await saveSSOSettings(body as Record<string, unknown>)
        return Response.json({ ok: true })
      })(req)
    }

    return Response.json(
      { error: { code: "METHOD_NOT_ALLOWED", message: "Only GET and POST allowed" } },
      { status: 405 },
    )
  }),
}
