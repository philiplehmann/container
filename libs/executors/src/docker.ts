import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { arch } from "node:os";
export type DockerPlatform = "amd" | "arm";

function promiseSpawn(command: string, args: string[]) {
	return new Promise<void>((resolve, reject) => {
		const docker = spawn(command, args, { stdio: "inherit" });
		docker.on("exit", (code) => {
			if (code === 0) {
				return resolve();
			}
			return reject(new Error(`Command ${command} ${args.join(" ")} failed`));
		});
	});
}

export function dockerImageSave(image: string, file: string) {
	return promiseSpawn("docker", ["image", "save", "--output", file, image]);
}

export function dockerImageLoad(file: string) {
	return promiseSpawn("docker", ["image", "load", "--input", file]);
}

export function dockerImageRemove(image: string) {
	try {
		return promiseSpawn("docker", ["image", "rm", image]);
	} catch (error) {
		console.log(`Image ${image} not found or could not be removed`);
	}
}

export async function dockerBuildxBuild({
	platforms,
	output,
	file,
	tags,
}: {
	platforms: DockerPlatform[];
	output: "load" | "push";
	file: string;
	tags: string[];
}) {
	const builderName = `builder-${platforms.join("-")}-${randomBytes(
		10,
	).toString("hex")}`;
	try {
		await promiseSpawn("docker", [
			"buildx",
			"create",
			"--name",
			builderName,
			"--platform",
			"linux/amd64,linux/arm64",
		]);
		await new Promise<void>((resolve, reject) => {
			const docker = spawn(
				"docker",
				[
					"buildx",
					"build",
					"--progress",
					"plain",
					"--builder",
					builderName,
					"--file",
					file,
					`--${output}`,
					"--platform",
					platforms.map((platform) => `linux/${platform}64`).join(","),
					"--cache-to",
					"type=gha,mode=max",
					"--cache-from",
					"type=gha",
					...tags.flatMap((tag) => ["--tag", tag]),
					".",
				],
				{ stdio: "inherit" },
			);
			docker.on("exit", (code) => {
				if (code === 0) {
					console.log(`Image ${tags.join(",")} build and ${output}`);
					return resolve();
				}
				return reject(new Error(`Image ${tags.join(",")} not built`));
			});
		});
	} finally {
		await promiseSpawn("docker", ["buildx", "rm", builderName]);
	}
}

const archMapping = {
	x64: "amd",
	arm64: "arm",
} as const;

const isDockerPlatform = (platform: unknown): platform is DockerPlatform => {
	return Object.values<unknown>(archMapping).includes(platform);
};

export function dockerArch(): DockerPlatform {
	const dockerArch = archMapping[arch()];
	if (!isDockerPlatform(dockerArch)) throw new Error("Unsupported platform");
	return dockerArch;
}

export async function dockerRun({
	image,
	port,
}: {
	image: string;
	port: string[] | string;
}) {
	const ports = Array.isArray(port) ? port : [port];
	return promiseSpawn("docker", [
		"run",
		"--rm",
		"-it",
		...ports.flatMap((port) => [
			"--publish",
			port.includes(":") ? port : `${port}:${port}`,
		]),
		`${image}`,
	]);
}
