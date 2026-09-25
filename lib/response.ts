import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function failure(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_";
      (fields[key] ??= []).push(issue.message);
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Periksa kembali data yang dikirim.",
          fields,
        },
      },
      { status: 400 },
    );
  }

  const correlationId = randomUUID();
  const details = error && typeof error === "object" ? error as {
    name?: unknown; code?: unknown; cause?: { name?: unknown; code?: unknown };
  } : null;
  console.error("Unexpected request failure", {
    correlationId,
    type: error?.constructor?.name ?? typeof error,
    ...(typeof details?.name === "string" ? { name: details.name } : {}),
    ...(typeof details?.code === "string" ? { code: details.code } : {}),
    ...(typeof details?.cause?.name === "string" ? { causeName: details.cause.name } : {}),
    ...(typeof details?.cause?.code === "string" ? { causeCode: details.cause.code } : {}),
  });
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Terjadi kesalahan. Coba kembali.",
        correlationId,
      },
    },
    { status: 500 },
  );
}
