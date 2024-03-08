import { DockerTestExecutorSchema } from "./schema";
import { dockerBuildxBuild, dockerImageRemove } from "../../docker";

export default async function runExecutor({
	file,
	tag,
	platforms,
}: DockerTestExecutorSchema) {
	const promises = await Promise.allSettled(
		platforms.map(async (platform) => {
			const tagWithPlatform = `${tag}-${platform}`;
			await dockerImageRemove(tagWithPlatform);
			await dockerBuildxBuild({
				platforms: [platform],
				output: "load",
				file,
				tags: [tagWithPlatform],
			});
		}),
	);
	if (promises.some((promise) => promise.status === "rejected")) {
		return {
			success: false,
		};
	}
	return {
		success: true,
	};
}
