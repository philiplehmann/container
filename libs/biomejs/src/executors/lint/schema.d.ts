import { DockerPlatform } from "../../docker";

export interface BiomejsExecutorSchema {
	apply?: boolean;
	verbose?: boolean;
	"apply-unsafe"?: boolean;
	changed?: boolean;
	"log-level"?: "none" | "debug" | "info" | "warn" | "error";
}
