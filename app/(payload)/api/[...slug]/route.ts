import config from "@payload-config";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from "@payloadcms/next/routes";

import { requirePayloadAdminApi } from "@/lib/auth/payload-api";

const get = REST_GET(config);
const post = REST_POST(config);
const remove = REST_DELETE(config);
const patch = REST_PATCH(config);
const put = REST_PUT(config);
const options = REST_OPTIONS(config);

async function authorize(request: Request) {
  return requirePayloadAdminApi(request);
}

export async function GET(...args: Parameters<typeof get>) {
  const denied = await authorize(args[0]);
  return denied || get(...args);
}

export async function POST(...args: Parameters<typeof post>) {
  const denied = await authorize(args[0]);
  return denied || post(...args);
}

export async function DELETE(...args: Parameters<typeof remove>) {
  const denied = await authorize(args[0]);
  return denied || remove(...args);
}

export async function PATCH(...args: Parameters<typeof patch>) {
  const denied = await authorize(args[0]);
  return denied || patch(...args);
}

export async function PUT(...args: Parameters<typeof put>) {
  const denied = await authorize(args[0]);
  return denied || put(...args);
}

export async function OPTIONS(...args: Parameters<typeof options>) {
  const denied = await authorize(args[0]);
  return denied || options(...args);
}
