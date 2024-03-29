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

export function dockerImageRemove(image: string) {
	return new Promise<void>((resolve) => {
		const docker = spawn("docker", ["image", "rm", image], {
			stdio: "inherit",
		});
		docker.on("exit", (code) => {
			if (code === 0) {
				console.log(`Image ${image} removed`);
				return resolve();
			}
			console.log(`Image ${image} not found or could not be removed`);
			return resolve();
		});
	});
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

export async function dockerRun({
	image,
	file,
	port,
}: {
	image: string;
	file: string;
	port: string[] | string;
}) {
	const dockerArch = archMapping[arch()];
	if (!isDockerPlatform(dockerArch)) throw new Error("Unsupported platform");
	await dockerImageRemove(image);
	await dockerBuildxBuild({
		tags: [image],
		file,
		output: "load",
		platforms: [dockerArch],
	});
	const ports = Array.isArray(port) ? port : [port];
	return new Promise<void>((resolve, reject) => {
		const docker = spawn(
			"docker",
			[
				"run",
				"--rm",
				"-it",
				...ports.flatMap((port) => [
					"--publish",
					port.includes(":") ? port : `${port}:${port}`,
				]),
				`${image}`,
			],
			{ stdio: "inherit" },
		);
		docker.on("exit", (code) => {
			if (code === 0) {
				return resolve();
			}
			return reject(new Error(`Container ${image} run failed`));
		});
	});
}
