import { promiseSpawn } from "@container/executors";
import { BiomejsExecutorSchema } from "./schema";
import { Executor } from "@nx/devkit";

const runExecutor: Executor<BiomejsExecutorSchema> = async (
	{
		apply,
		"apply-unsafe": applyUnsafe,
		changed,
		"log-level": logLevel,
		verbose,
	},
	context,
) => {
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

	if (verbose) {
		args.push("--verbose");
	}

	if (logLevel) {
		args.push("--log-level", logLevel);
	}

	try {
		await promiseSpawn("yarn", ["biome", "lint", ...args, "."], {
			cwd: projectRoot,
		});
		return { success: false };
	} catch (error) {
		console.error(error);
		return { success: false };
	}
};

export default runExecutor;
