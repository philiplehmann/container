import type { IncomingMessage } from "node:http";
import { BadRequest } from "@container/http/error";
import { z } from "zod";

const applicationJSON = z.object({
	"content-type": z.literal("application/json"),
});

export const requestToBuffer = async (
	req: IncomingMessage,
): Promise<Buffer> => {
	const bodyParts: Buffer[] = [];
	for await (const chunk of req) {
		bodyParts.push(chunk);
	}
	return Buffer.concat(bodyParts);
};

export const requestToText = async (req: IncomingMessage): Promise<string> => {
	const buffer = await requestToBuffer(req);
	return buffer.toString("utf-8");
};

export const requestToJson = async <T = unknown>(
	req: IncomingMessage,
): Promise<T> => {
	const test = applicationJSON.safeParse(req.headers);
	if (test.success === false) {
		throw new BadRequest(JSON.stringify(test.error));
	}

	try {
		const body = await requestToText(req);
		return JSON.parse(body);
	} catch (error) {
		if (error instanceof Error) {
			throw new BadRequest(error.message);
		}
		if (typeof error === "string") {
			throw new BadRequest(error);
		}
		throw new BadRequest("Unknown error");
	}
};
