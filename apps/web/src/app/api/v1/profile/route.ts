import { NextResponse } from "next/server";
import { loadProfile, saveProfile } from "@careeros/core";
import { createClient } from "@/lib/supabase/server";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const { profile, context } = await loadProfile(supabase);

    return NextResponse.json({
      profile,
      workspace: {
        id: context.workspaceId,
        name: context.workspaceName,
        role: context.role,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const profile = await saveProfile(supabase, body);
    return NextResponse.json({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
