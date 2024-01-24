import { IncomingMessage, ServerResponse } from "http";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type Response = ServerResponse<IncomingMessage> & {
	req: IncomingMessage;
};
type Next = (req: IncomingMessage, res: Response) => Promise<void> | void;

export const route =
	({ method, path }: { method: HttpMethod; path: string }, next?: Next) =>
	(req: IncomingMessage, res: Response) => {
		if (req.method === method && req.url === path) {
			return next?.(req, res);
		}
	};

export const get = (path: string, next?: Next) =>
	route({ method: "GET", path }, next);
export const post = (path: string, next?: Next) =>
	route({ method: "POST", path }, next);
export const put = (path: string, next?: Next) =>
	route({ method: "PUT", path }, next);
export const patch = (path: string, next?: Next) =>
	route({ method: "PATCH", path }, next);
export const del = (path: string, next?: Next) =>
	route({ method: "DELETE", path }, next);

export const routes =
	(...routes: ReturnType<typeof route>[]) =>
	async (req: IncomingMessage, res: Response) => {
		return Promise.allSettled(routes.map((route) => route(req, res)));
	};
