import { spawn } from "node:child_process";
import { createServer } from "node:http";

import { routes, post } from "@container/http/route";
import { streamHttpBinary } from "@container/stream/http-binary";

const PORT = process.env.PORT || "5000";

const server = createServer(
	routes(
		post("/image-to-text", async (req, res) => {
			const imageToText = spawn("tesseract", ["-", "-"]);
			streamHttpBinary(req, res, imageToText);
		}),
	),
).listen(PORT, () => {
	console.log("start poppler server on ", PORT);
});

process.on("SIGINT", () => {
	server.close();
});
