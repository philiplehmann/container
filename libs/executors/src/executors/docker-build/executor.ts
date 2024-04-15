import { DockerBuildExecutorSchema } from "./schema";
import { dockerBuildxBuild } from "../../docker";
import { Executor } from "@nx/devkit";

const runExecutor: Executor<DockerBuildExecutorSchema> = async ({
	file,
	tags,
	platforms,
}) => {
	try {
		await dockerBuildxBuild({
			platforms: platforms,
			output: "push",
			file,
			tags: tags,
		});
		return {
			success: true,
		};
	} catch (error) {
		console.error(error);
		return {
			success: false,
		};
	}
};

export default runExecutor;
