import { SignalingDO } from "./SignalingDO";

export { SignalingDO };

export interface Env {
	SIGNALING_DO: DurableObjectNamespace;
}

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		const upgrade = request.headers.get("Upgrade");
		if (request.method !== "GET" || upgrade !== "websocket") {
			return new Response("ok", {
				status: 200,
				headers: { "Content-Type": "text/plain" },
			});
		}
		const id = env.SIGNALING_DO.idFromName("default");
		const stub = env.SIGNALING_DO.get(id);
		return stub.fetch(request);
	},
};
