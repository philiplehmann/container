import { promiseSpawn } from "@container/executors";
import { BiomejsExecutorSchema } from "./schema";
import { ExecutorContext } from "@nx/devkit";

export default async function runExecutor(
	{
		apply,
		"apply-unsafe": applyUnsafe,
		changed,
		"log-level": logLevel,
	}: BiomejsExecutorSchema,
	context: ExecutorContext,
) {
	const projectRoot =
		context.projectsConfigurations.projects[context.projectName].root;
	const args: string[] = [];
	if (applyUnsafe) {
		args.push("--apply-unsafe");
	} else if (apply) {
		args.push("--apply");
	}

	if (changed) {
		args.push("--changed");
	}

	if (logLevel) {
		args.push("--log-level", logLevel);
	}

	await promiseSpawn("yarn", ["biome", "lint", ...args, "."], {
		cwd: projectRoot,
	});
}
