import {
	dockerArch,
	dockerBuildxBuild,
	dockerImageRemove,
	dockerRun,
} from "../../docker";
import { DockerRunExecutorSchema } from "./schema";

export default async function runExecutor({
	image,
	file,
	port,
}: DockerRunExecutorSchema) {
	try {
		const arch = dockerArch();
		await dockerImageRemove(image);
		await dockerBuildxBuild({
			tags: [image],
			file,
			output: "load",
			platforms: [arch],
		});
		await dockerRun({ image, port });
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
