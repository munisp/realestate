/**
 * Custom error classes for Government Registry Integration
 */

export class RegistryError extends Error {
  constructor(
    message: string,
    public code: string,
    public state: string,
    public retryable: boolean = false,
    public originalError?: any
  ) {
    super(message);
    this.name = "RegistryError";
  }
}

export class RegistryAuthenticationError extends RegistryError {
  constructor(state: string, originalError?: any) {
    super(
      `Authentication failed for ${state} registry`,
      "AUTH_FAILED",
      state,
      true,
      originalError
    );
    this.name = "RegistryAuthenticationError";
  }
}

export class RegistryRateLimitError extends RegistryError {
  constructor(
    state: string,
    public resetAt: Date,
    originalError?: any
  ) {
    super(
      `Rate limit exceeded for ${state} registry. Resets at ${resetAt.toISOString()}`,
      "RATE_LIMIT_EXCEEDED",
      state,
      true,
      originalError
    );
    this.name = "RegistryRateLimitError";
  }
}

export class RegistryTimeoutError extends RegistryError {
  constructor(state: string, timeoutMs: number, originalError?: any) {
    super(
      `Request to ${state} registry timed out after ${timeoutMs}ms`,
      "TIMEOUT",
      state,
      true,
      originalError
    );
    this.name = "RegistryTimeoutError";
  }
}

export class RegistryNotFoundError extends RegistryError {
  constructor(state: string, resourceType: string, identifier: string) {
    super(
      `${resourceType} '${identifier}' not found in ${state} registry`,
      "NOT_FOUND",
      state,
      false
    );
    this.name = "RegistryNotFoundError";
  }
}

export class RegistryValidationError extends RegistryError {
  constructor(state: string, validationErrors: string[]) {
    super(
      `Validation failed for ${state} registry: ${validationErrors.join(", ")}`,
      "VALIDATION_FAILED",
      state,
      false
    );
    this.name = "RegistryValidationError";
  }
}

export class RegistryUnavailableError extends RegistryError {
  constructor(state: string, originalError?: any) {
    super(
      `${state} registry is currently unavailable`,
      "SERVICE_UNAVAILABLE",
      state,
      true,
      originalError
    );
    this.name = "RegistryUnavailableError";
  }
}

export class RegistryConfigurationError extends RegistryError {
  constructor(state: string, configIssue: string) {
    super(
      `Configuration error for ${state} registry: ${configIssue}`,
      "CONFIG_ERROR",
      state,
      false
    );
    this.name = "RegistryConfigurationError";
  }
}
