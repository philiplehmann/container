import { DockerTestExecutorSchema } from "./schema";
import {
	dockerBuildxBuild,
	dockerImageRemove,
	dockerImageSave,
} from "../../docker";
import { mkdir } from "node:fs/promises";

export default async function runExecutor({
	file,
	tag,
	platforms,
	outputPath,
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
			await mkdir(outputPath, { recursive: true });
			await dockerImageSave(tagWithPlatform, `${outputPath}/${platform}.tar`);
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
