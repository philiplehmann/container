import { DockerRunExecutorSchema } from "./schema";
import executor from "./executor";
import { describe, it, expect } from "vitest";

const options: DockerRunExecutorSchema = {};

describe("DockerRun Executor", () => {
	it("can run", async () => {
		const output = await executor(options);
		expect(output.success).toBe(true);
	});
});
