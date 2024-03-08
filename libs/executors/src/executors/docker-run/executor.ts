import { dockerRun } from "../../docker";
import { DockerRunExecutorSchema } from "./schema";

export default async function runExecutor(options: DockerRunExecutorSchema) {
	try {
		await dockerRun(options);
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
