import { DockerPlatform } from "../../docker";

export interface BiomejsExecutorSchema {
	apply?: boolean;
	"apply-unsafe"?: boolean;
	changed?: boolean;
	"log-level"?: "none" | "debug" | "info" | "warn" | "error";
}
