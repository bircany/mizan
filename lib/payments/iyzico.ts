import crypto from "crypto";

const IYZICO_BASE_URL =
  process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

export function isIyzicoSandbox() {
  return IYZICO_BASE_URL.includes("sandbox");
}

type IyzicoRequestOptions = {
  path: string;
  body?: Record<string, unknown>;
  method?: "GET" | "POST";
};

type InitializeCheckoutInput = {
  conversationId: string;
  basketId: string;
  amount: number;
  currency: string;
  callbackUrl: string;
  donorName: string;
  donorSurname: string;
  email: string;
  phone: string;
  identityNumber: string;
  address: string;
  city: string;
  country: string;
  ip: string;
};

type IyzicoCheckoutResponse = {
  status: string;
  conversationId?: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  signature?: string;
  errorMessage?: string;
};

type RefundInput = {
  paymentTransactionId: string;
  price: number;
  ip: string;
};

function getKeys() {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("IYZICO_API_KEY or IYZICO_SECRET_KEY is missing.");
  }

  return { apiKey, secretKey };
}

function createAuthorization(path: string, body?: Record<string, unknown>) {
  const { apiKey, secretKey } = getKeys();
  const randomKey = `${Date.now()}${crypto.randomInt(100000, 999999)}`;
  const bodyString = body ? JSON.stringify(body) : "";
  const payload = `${randomKey}${path}${bodyString}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");
  const authString = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;

  return {
    authorization: `IYZWSv2 ${Buffer.from(authString).toString("base64")}`,
    randomKey,
  };
}

async function callIyzico<T>({
  path,
  body,
  method = "POST",
}: IyzicoRequestOptions): Promise<T> {
  const { authorization, randomKey } = createAuthorization(path, body);
  const response = await fetch(`${IYZICO_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      "x-iyzi-rnd": randomKey,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.errorMessage || `iyzico request failed: ${response.status}`);
  }

  return data as T;
}

function formatAmount(amount: number) {
  return amount.toFixed(2);
}

function normalizeSignatureAmount(value: number | string | undefined) {
  const amount = String(value ?? "");

  return amount
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
}

function signaturesMatch(expected: string, received: string | undefined) {
  if (!received) return false;

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function createResponseSignature(parts: string[]) {
  const { secretKey } = getKeys();

  return crypto
    .createHmac("sha256", secretKey)
    .update(parts.join(":"))
    .digest("hex");
}

export async function initializeCheckoutForm(input: InitializeCheckoutInput) {
  return callIyzico<IyzicoCheckoutResponse>({
    path: "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    body: {
      locale: "tr",
      conversationId: input.conversationId,
      price: formatAmount(input.amount),
      paidPrice: formatAmount(input.amount),
      currency: input.currency,
      installment: "1",
      basketId: input.basketId,
      paymentChannel: "WEB",
      // Checkout Form accepts PRODUCT, LISTING or SUBSCRIPTION. Donations use PRODUCT.
      paymentGroup: "PRODUCT",
      callbackUrl: input.callbackUrl,
      buyer: {
        id: input.conversationId,
        name: input.donorName,
        surname: input.donorSurname,
        gsmNumber: input.phone,
        email: input.email,
        identityNumber: input.identityNumber,
        registrationAddress: input.address,
        city: input.city,
        country: input.country,
        ip: input.ip,
      },
      shippingAddress: {
        contactName: `${input.donorName} ${input.donorSurname}`.trim(),
        city: input.city,
        country: input.country,
        address: input.address,
      },
      billingAddress: {
        contactName: `${input.donorName} ${input.donorSurname}`.trim(),
        city: input.city,
        country: input.country,
        address: input.address,
      },
      basketItems: [
        {
          id: input.basketId,
          name: "Bağış",
          category1: "Bağış",
          itemType: "VIRTUAL",
          price: formatAmount(input.amount),
        },
      ],
    },
  });
}

export async function retrieveCheckoutForm(token: string, conversationId: string) {
  return callIyzico<{
    status: "success" | "failure";
    paymentStatus?: "SUCCESS" | "FAILURE" | string;
    conversationId?: string;
    paymentId?: string;
    fraudStatus?: number;
    paidPrice?: number;
    price?: number;
    currency?: string;
    basketId?: string;
    cardAssociation?: string;
    lastFourDigits?: string;
    token?: string;
    signature?: string;
    errorMessage?: string;
    itemTransactions?: Array<{
      paymentTransactionId?: string;
    }>;
  }>({
    path: "/payment/iyzipos/checkoutform/auth/ecom/detail",
    body: {
      locale: "tr",
      conversationId,
      token,
    },
  });
}

export function verifyResponseSignature(input: {
  paymentStatus?: string;
  paymentId?: string;
  currency?: string;
  basketId?: string;
  conversationId?: string;
  paidPrice?: number | string;
  price?: number | string;
  token?: string;
  signature?: string;
}) {
  if (
    !input.paymentStatus ||
    !input.paymentId ||
    !input.signature ||
    !input.token
  ) {
    return false;
  }

  const digest = createResponseSignature([
    input.paymentStatus,
    input.paymentId,
    input.currency || "",
    input.basketId || "",
    input.conversationId || "",
    normalizeSignatureAmount(input.paidPrice),
    normalizeSignatureAmount(input.price),
    input.token,
  ]);

  return signaturesMatch(digest, input.signature);
}

export function verifyInitializeResponseSignature(input: {
  conversationId?: string;
  token?: string;
  signature?: string;
}) {
  if (!input.conversationId || !input.token || !input.signature) {
    return false;
  }

  const digest = createResponseSignature([input.conversationId, input.token]);
  return signaturesMatch(digest, input.signature);
}

export function verifyWebhookSignature(
  payload: Record<string, unknown>,
  signatureHeader: string | null,
) {
  if (!signatureHeader) return false;

  const { secretKey } = getKeys();
  const source = `${secretKey}${String(payload.iyziEventType || "")}${String(
    payload.iyziPaymentId || "",
  )}${String(payload.token || "")}${String(payload.paymentConversationId || "")}${String(
    payload.status || "",
  )}`;

  const digest = crypto.createHmac("sha256", secretKey).update(source).digest("hex");
  return signaturesMatch(digest, signatureHeader);
}

export async function cancelPayment(paymentId: string, ip: string) {
  return callIyzico<{
    status: string;
    paymentId?: string;
    price?: number;
    errorMessage?: string;
  }>({
    path: "/payment/cancel",
    body: {
      locale: "tr",
      paymentId,
      ip,
    },
  });
}

export async function refundPayment(input: RefundInput) {
  return callIyzico<{
    status: string;
    paymentId?: string;
    price?: number;
    errorMessage?: string;
  }>({
    path: "/payment/refund",
    body: {
      locale: "tr",
      conversationId: `refund-${Date.now()}`,
      paymentTransactionId: input.paymentTransactionId,
      price: formatAmount(input.price),
      ip: input.ip,
    },
  });
}
