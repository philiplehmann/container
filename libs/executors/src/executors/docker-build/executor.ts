import { DockerBuildExecutorSchema } from "./schema";
import { dockerBuildxBuild } from "../../docker";

export default async function runExecutor({
	file,
	tags,
	platforms,
}: DockerBuildExecutorSchema) {
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
}
