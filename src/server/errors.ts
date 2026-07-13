export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number = 500,
    public details?: unknown,
  ) {
    super(message)
  }

  toResponse(): Response {
    return Response.json(
      { error: { code: this.code, message: this.message, details: this.details } },
      { status: this.httpStatus },
    )
  }
}

export class NotFoundError extends ApiError {
  constructor(what: string) {
    super("NOT_FOUND", `${what} not found`, 404)
  }
}

export class ValidationError extends ApiError {
  constructor(details: unknown) {
    super("VALIDATION_ERROR", "Validation failed", 400, details)
  }
}

export class UnauthorizedError extends ApiError {
  constructor() {
    super("UNAUTHORIZED", "Authentication required", 401)
  }
}

export class ForbiddenError extends ApiError {
  constructor() {
    super("FORBIDDEN", "Insufficient permissions", 403)
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super("CONFLICT", message, 409)
  }
}

export class RateLimitError extends ApiError {
  constructor() {
    super("RATE_LIMITED", "Too many requests", 429)
  }
}

export class IntegrityMismatchError extends ApiError {
  constructor(file: string) {
    super("INTEGRITY_MISMATCH", `Integrity mismatch for ${file}`, 400)
  }
}
