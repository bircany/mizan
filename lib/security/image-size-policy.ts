import { disableTypes, types } from "image-size";
// Payload's dimension parser must reject containers outside the upload allowlist.
disableTypes(types.filter(type => !["jpg", "png", "webp"].includes(type)));
