import { DurableObject } from "cloudflare:workers";

/** 每个连接的附件：Hibernation 后通过 deserializeAttachment 恢复 */
export interface ConnectionAttachment {
	subscribedTopics: Array<string>;
}

/** 信令消息：客户端 → 服务端 */
type IncomingSignalingMessage =
	| { type: "subscribe"; topics?: Array<string> }
	| { type: "unsubscribe"; topics?: Array<string> }
	| { type: "publish"; topic: string; [key: string]: unknown }
	| { type: "ping" };

/** 信令消息：服务端 → 客户端 */
type OutgoingSignalingMessage = Record<string, unknown>;

function isSignalingMessage(v: unknown): v is IncomingSignalingMessage {
	if (typeof v !== "object" || v === null) return false;
	return "type" in v && typeof (v as { type: unknown }).type === "string";
}

export class SignalingDO extends DurableObject {
	async fetch(_request: Request): Promise<Response> {
		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		this.ctx.acceptWebSocket(server);
		const attachment: ConnectionAttachment = { subscribedTopics: [] };
		server.serializeAttachment(attachment);
		return new Response(null, { status: 101, webSocket: client });
	}

	webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
		const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
		let msg: unknown;
		try {
			msg = JSON.parse(raw);
		} catch {
			return;
		}
		if (!isSignalingMessage(msg)) return;

		const attachment = (ws.deserializeAttachment() as ConnectionAttachment | null) || {
			subscribedTopics: [],
		};

		switch (msg.type) {
			case "subscribe":
				for (const topic of msg.topics ?? []) {
					if (typeof topic === "string" && !attachment.subscribedTopics.includes(topic)) {
						attachment.subscribedTopics.push(topic);
					}
				}
				ws.serializeAttachment(attachment);
				break;
			case "unsubscribe":
				for (const topic of msg.topics ?? []) {
					if (typeof topic === "string") {
						attachment.subscribedTopics = attachment.subscribedTopics.filter((t) => t !== topic);
					}
				}
				ws.serializeAttachment(attachment);
				break;
			case "publish": {
				if (typeof msg.topic !== "string") break;
				const subscribers: Array<WebSocket> = [];
				for (const peer of this.ctx.getWebSockets()) {
					const peerAttachment = (peer.deserializeAttachment() as ConnectionAttachment | null) || {
						subscribedTopics: [],
					};
					if (peerAttachment.subscribedTopics.includes(msg.topic)) {
						subscribers.push(peer);
					}
				}
				const payload: OutgoingSignalingMessage = { ...msg, clients: subscribers.length };
				for (const peer of subscribers) {
					peer.send(JSON.stringify(payload));
				}
				break;
			}
			case "ping":
				ws.send(JSON.stringify({ type: "pong" }));
				break;
		}
	}

	webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void {
		ws.close(code, reason);
	}
}
