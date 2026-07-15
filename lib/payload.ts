import config from "@payload-config";
import { getPayload, type Payload } from "payload";

let payloadPromise: Promise<Payload> | null = null;

export function getPayloadClient() {
  if (!payloadPromise) {
    payloadPromise = getPayload({ config });
  }

  return payloadPromise;
}
