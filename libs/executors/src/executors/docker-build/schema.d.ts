import { DockerPlatform } from "../../docker";

export interface DockerBuildExecutorSchema {
	platforms: DockerPlatform[];
	tags: string[];
	file: string;
}
