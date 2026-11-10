import { NextResponse } from "next/server";
import { AppError, ValidationError } from "@careeros/core";

/**
 * Maps domain errors to HTTP responses without leaking internals. Anything
 * unrecognised becomes a generic 500 with a server-side log entry.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.code, message: error.message, issues: error.issues },
      { status: error.status },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }

  console.error("Unhandled API error", error);
  return NextResponse.json(
    { error: "internal_error", message: "Unexpected server error" },
    { status: 500 },
  );
}
