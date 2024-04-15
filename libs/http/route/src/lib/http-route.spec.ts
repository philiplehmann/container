import { get, post, put, patch, del, routes } from "./http-route";
import { type Server, createServer } from "node:http";
import { describe, beforeAll, afterAll, it, expect } from "vitest";

describe("http-route", () => {
	let httpServer: Server;
	let port: number;
	beforeAll(() => {
		return new Promise<void>((resolve, reject) => {
			httpServer = createServer(
				routes(
					get("/get", async (req, res) => {
						await res.write("get");
						await res.end();
					}),
					post("/post", async (req, res) => {
						await res.write("post");
						await res.end();
					}),
					put("/put", async (req, res) => {
						await res.write("put");
						await res.end();
					}),
					patch("/patch", async (req, res) => {
						await res.write("patch");
						await res.end();
					}),
					del("/delete", async (req, res) => {
						await res.write("delete");
						await res.end();
					}),
				),
			).listen(0, () => {
				const address = httpServer.address();
				if (typeof address === "object") {
					console.log("start poppler server on ", address.port);
					port = address.port;
					return resolve();
				}
				reject();
			});
		});
	});

	afterAll(() => {
		httpServer.close();
	});

	it("get", async () => {
		const response = await fetch(`http://localhost:${port}/get`, {
			method: "GET",
		});
		const content = await response.text();
		expect(content).toEqual("get");
	});

	it("post", async () => {
		const response = await fetch(`http://localhost:${port}/post`, {
			method: "POST",
		});
		const content = await response.text();
		expect(content).toEqual("post");
	});

	it("put", async () => {
		const response = await fetch(`http://localhost:${port}/put`, {
			method: "PUT",
		});
		const content = await response.text();
		expect(content).toEqual("put");
	});

	it("patch", async () => {
		const response = await fetch(`http://localhost:${port}/patch`, {
			method: "PATCH",
		});
		const content = await response.text();
		expect(content).toEqual("patch");
	});

	it("delete", async () => {
		const response = await fetch(`http://localhost:${port}/delete`, {
			method: "DELETE",
		});
		const content = await response.text();
		expect(content).toEqual("delete");
	});
});
