export class HttpError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function publicError(error) {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      payload: {
        error: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
  }
  return {
    statusCode: 500,
    payload: {
      error: "internal_error",
      message: "İşlem şu anda tamamlanamadı.",
    },
  };
}
