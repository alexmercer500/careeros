import type { FieldIssue } from "@careeros/validation";

export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "unauthorized", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource") {
    super(message, "forbidden", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, "not_found", 404);
  }
}

export class WorkspaceNotProvisionedError extends AppError {
  constructor(message = "No workspace is provisioned for this account") {
    super(message, "workspace_not_provisioned", 409);
  }
}

export class ValidationError extends AppError {
  readonly issues: FieldIssue[];

  constructor(issues: FieldIssue[], message = "Invalid input") {
    super(message, "validation_failed", 400);
    this.issues = issues;
  }
}
