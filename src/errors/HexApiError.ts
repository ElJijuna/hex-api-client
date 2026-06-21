export class HexApiError extends Error {
  readonly status: number;
  readonly statusText: string;

  constructor(status: number, statusText: string) {
    super(`Hex API error: ${status} ${statusText}`);
    this.name = 'HexApiError';
    this.status = status;
    this.statusText = statusText;
    Object.setPrototypeOf(this, HexApiError.prototype);
  }
}
