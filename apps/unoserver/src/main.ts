import { spawn } from "node:child_process";
import { createServer } from "node:http";

import { routes, post } from "@container/http/route";
import { streamHttpBinary } from "@container/stream/http-binary";

const PORT = process.env.PORT || "3000";

const unoserver = spawn("unoserver", { stdio: "inherit" });

const server = createServer(
	routes(
		post("/convert", async (req, res) => {
			// unoconvert [-h] [--convert-to CONVERT_TO] [--filter FILTER_NAME] [--interface INTERFACE] [--port PORT] infile outfile
			res.setHeader("Content-Type", "application/pdf");

			const convertTo = "pdf";
			const unoconvert = spawn("unoconvert", [
				"--convert-to",
				convertTo,
				"-",
				"-",
			]);
			streamHttpBinary(req, res, unoconvert);
		}),
	),
).listen(PORT, () => {
	console.log("start unoserver server on ", PORT);
});

process.on("SIGINT", () => {
	server.close();
	unoserver.kill();
});
