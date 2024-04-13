export class HttpError extends Error {
	constructor(
		public status: number,
		public message: string,
	) {
		super(message);
	}
}

export class BadRequest extends HttpError {
	constructor(message: string) {
		super(400, message);
	}
}
