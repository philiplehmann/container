import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";
import { resolve } from "node:path";
import { testRequest } from "@container/test/request";
import { describe, beforeAll, afterAll, it, expect } from "vitest";

const containerPort = 5000;

describe("unoserver", () => {
	["amd", "arm"].map((arch) => {
		describe(`arch: ${arch}`, () => {
			let container: StartedTestContainer;
			let port: number;

			beforeAll(async () => {
				container = await new GenericContainer(
					`philiplehmann/unoserver:test-${arch}`,
				)
					.withEnvironment({ PORT: String(containerPort) })
					.withStartupTimeout(60_000)
					.withExposedPorts(containerPort)
					.withLogConsumer((stream) => stream.pipe(process.stdout))
					.withWaitStrategy(Wait.forLogMessage("INFO:unoserver:Server PID", 1))
					.start();

				// aditional time to start the server
				await new Promise((resolve) => setTimeout(resolve, 10_000));

				port = container.getMappedPort(containerPort);
			});

			afterAll(async () => {
				await container.stop();
			});

			it("should convert docx to pdf", async () => {
				const file = resolve(__dirname, "assets/dummy.docx");
				const [response, text] = await testRequest({
					method: "POST",
					host: "localhost",
					port,
					path: "/convert",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					file,
				});

				expect(response.statusCode).toBe(200);
				expect(text.substring(0, 5)).toBe("%PDF-");
			});
		});
	});
});
