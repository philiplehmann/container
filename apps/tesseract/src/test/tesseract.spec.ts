import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { resolve } from "node:path";
import { testRequest } from "@container/test/request";
import { describe, beforeAll, afterAll, it, expect } from "vitest";

const containerPort = 5000;

const expectText =
	"Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";

describe("tesseract", () => {
	["amd", "arm"].map((arch) => {
		describe(`arch: ${arch}`, () => {
			let container: StartedTestContainer;
			let port: number;

			beforeAll(async () => {
				container = await new GenericContainer(
					`philiplehmann/tesseract:test-${arch}`,
				)
					.withEnvironment({ PORT: String(containerPort) })
					.withExposedPorts(containerPort)
					.start();

				port = container.getMappedPort(containerPort);
			});

			afterAll(async () => {
				await container.stop();
			});

			for (const type of ["gif", "jpg", "png", "tiff", "webp"]) {
				it(`should convert ${type} to text`, async () => {
					const file = resolve(__dirname, `assets/dummy_image.${type}`);
					const [response, text] = await testRequest({
						method: "POST",
						host: "localhost",
						port,
						path: "/image-to-text",
						headers: { "Content-Type": `image/${type}` },
						file,
					});

					expect(response.statusCode).toBe(200);
					expect(
						text
							.split("\n")
							.join(" ")
							.replace("|psum", "Ipsum")
							.replace("lpsum", "Ipsum")
							.trim(),
					).toBe(expectText);
				});
			}
		});
	});
});
