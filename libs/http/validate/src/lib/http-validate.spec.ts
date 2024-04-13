import { createServer } from "node:http";
import { describe, it, expect } from "vitest";
import { ZodSchema, z } from "zod";

import { post } from "@container/http/route";

import { validate } from "./http-validate";

const createTestServer = async (schema: ZodSchema): Promise<number> => {
	const httpServer = createServer(
		post(
			"/",
			validate(schema, async (req, res) => {
				res.statusCode = 200;
				res.end();
				httpServer.close();
			}),
		),
	);
	return new Promise<number>((resolve, reject) => {
		httpServer.listen(0, () => {
			const address = httpServer.address();
			if (address && typeof address === "object") {
				return resolve(address.port);
			}
			reject();
		});
	});
};

describe("http-validate", () => {
	it("validate success", async () => {
		const schema = z.strictObject({ key: z.string() });
		const port = await createTestServer(schema);
		const response = await fetch(`http://localhost:${port}`, {
			method: "POST",
			body: JSON.stringify({ key: "value" }),
			headers: { "Content-Type": "application/json" },
		});
		expect(response.status).toBe(200);
	});

	it("validate error", async () => {
		const schema = z.strictObject({ key: z.string() });
		const port = await createTestServer(schema);
		const response = await fetch(`http://localhost:${port}`, {
			method: "POST",
			body: JSON.stringify({ wrong: "value" }),
			headers: { "Content-Type": "application/json" },
		});
		expect(response.status).toBe(400);
	});
});
