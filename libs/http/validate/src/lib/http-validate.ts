import { requestToJson } from "@container/http/body";
import { BadRequest } from "@container/http/error";
import { IncomingMessage, ServerResponse } from "http";
import { ZodSchema } from "zod";

export type Response = ServerResponse<IncomingMessage> & {
	req: IncomingMessage;
};
type Next<S extends ZodSchema> = (
	req: IncomingMessage,
	res: Response,
	body: S["_output"],
) => Promise<void> | void;

export const validate =
	<S extends ZodSchema>(schema: S, next: Next<S>) =>
	async (req: IncomingMessage, res: Response) => {
		const data = await requestToJson(req);
		const body = schema.safeParse(data);
		if (body.success) {
			return next(req, res, body.data);
		}
		throw new BadRequest(JSON.stringify(body.error));
	};
