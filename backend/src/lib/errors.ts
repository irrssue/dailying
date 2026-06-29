//
// errors.ts
//
// Small typed error hierarchy so route handlers can throw meaningfully and the
// global error handler can map them to clean HTTP responses without leaking
// internals to the app.
//

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  /** Safe to send to the client. */
  readonly expose: boolean;

  constructor(message: string, statusCode = 500, code = "internal_error", expose = false) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.expose = expose;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code = "bad_request") {
    super(message, 400, code, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "unauthorized") {
    super(message, 401, code, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", code = "not_found") {
    super(message, 404, code, true);
  }
}

/**
 * Raised when a provider can't run because its credentials haven't been set up
 * yet (the things on Liam's manual to-do list). Maps to 503 so the app can show
 * "not available yet" rather than a hard failure.
 */
export class ProviderUnconfiguredError extends AppError {
  constructor(provider: string) {
    super(`${provider} is not configured`, 503, "provider_unconfigured", true);
  }
}

/** A user's linked OAuth account needs re-consent (refresh token rejected). */
export class ReauthRequiredError extends AppError {
  constructor(provider = "google") {
    super(`${provider} re-authentication required`, 401, "reauth_required", true);
  }
}
