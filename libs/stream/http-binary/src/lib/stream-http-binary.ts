import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { IncomingMessage } from "node:http";
import type { Response } from "@container/http/route";

export function streamHttpBinary(
	req: IncomingMessage,
	res: Response,
	child: ChildProcessWithoutNullStreams,
): void {
	req.pipe(child.stdin).on("error", (error) => {
		console.error(error);
	});
	child.stdout.pipe(res).on("error", (error) => {
		console.error(error);
	});

	child.stderr.pipe(process.stderr).on("error", (error) => {
		console.error(error);
	});

	res.on("close", () => {
		child.kill();
	});
}
