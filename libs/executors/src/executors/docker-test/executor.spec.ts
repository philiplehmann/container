import { DockerTestExecutorSchema } from "./schema";
import executor from "./executor";
import { describe, it, expect } from "vitest";

const options: DockerTestExecutorSchema = {};

describe("DockerTest Executor", () => {
	it("can run", async () => {
		const output = await executor(options);
		expect(output.success).toBe(true);
	});
});
