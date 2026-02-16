
import http from "node:http";
import * as map from "lib0/map";
import { WebSocketServer } from "ws";
import type { RawData, WebSocket } from "ws";

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2; 
const wsReadyStateClosed = 3; 

const pingTimeout = 30000;

const port = process.env.PORT || 4444;
const wss = new WebSocketServer({ noServer: true });

const server = http.createServer((_request, response) => {
	response.writeHead(200, { "Content-Type": "text/plain" });
	response.end("okay");
});

/** 信令消息：客户端 → 服务端 */
type IncomingSignalingMessage =
	| { type: "subscribe"; topics?: Array<string> }
	| { type: "unsubscribe"; topics?: Array<string> }
	| { type: "publish"; topic: string; [key: string]: unknown }
	| { type: "ping" };

/** 信令消息：服务端 → 客户端（可带额外字段如 clients） */
type OutgoingSignalingMessage = Record<string, unknown>;

function isSignalingMessage(v: unknown): v is IncomingSignalingMessage {
	if (typeof v !== "object" || v === null) {
		return false;
	}
	return "type" in v && typeof (v as { type: unknown }).type === "string";
}

function rawDataToBuffer(data: RawData): Buffer {
	if (typeof data === "string") {
		return Buffer.from(data, "utf8");
	}
	if (Buffer.isBuffer(data)) {
		return data;
	}
	if (Array.isArray(data)) {
		return Buffer.concat(data);
	}
	return Buffer.from(data);
}

/** Topic 名称 → 订阅该 topic 的 WebSocket 连接集合 */
const topics = new Map<string, Set<WebSocket>>();

function send(conn: WebSocket, message: OutgoingSignalingMessage): void {
	if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
		conn.close();
	}
	try {
		conn.send(JSON.stringify(message));
	} catch (e) {
		conn.close();
	}
}

function onconnection(conn: WebSocket): void {
	const subscribedTopics = new Set<string>();
	let closed = false;
	// Check if connection is still alive
	let pongReceived = true;
	const pingInterval = setInterval(() => {
		if (!pongReceived) {
			conn.close();
			clearInterval(pingInterval);
		} else {
			pongReceived = false;
			try {
				conn.ping();
			} catch (e) {
				conn.close();
			}
		}
	}, pingTimeout);
	conn.on("pong", () => {
		pongReceived = true;
	});
	conn.on("close", () => {
		subscribedTopics.forEach((topicName) => {
			const subs = topics.get(topicName) || new Set();
			subs.delete(conn);
			if (subs.size === 0) {
				topics.delete(topicName);
			}
		});
		subscribedTopics.clear();
		closed = true;
	});
	conn.on("message", (data: RawData) => {
		const raw = rawDataToBuffer(data);
		const message: unknown = JSON.parse(raw.toString());
		const msg = isSignalingMessage(message) ? message : null;
		if (msg && !closed) {
			switch (msg.type) {
				case "subscribe":
					(msg.topics ?? []).forEach((topicName: unknown) => {
						if (typeof topicName === "string") {
							const topic = map.setIfUndefined(topics, topicName, () => new Set<WebSocket>());
							topic.add(conn);
							subscribedTopics.add(topicName);
						}
					});
					break;
				case "unsubscribe":
					(msg.topics ?? []).forEach((topicName: unknown) => {
						if (typeof topicName === "string") {
							const subs = topics.get(topicName);
							if (subs) {
								subs.delete(conn);
							}
						}
					});
					break;
				case "publish":
					if (typeof msg.topic === "string") {
						const receivers = topics.get(msg.topic);
						if (receivers) {
							const payload: OutgoingSignalingMessage = { ...msg, clients: receivers.size };
							receivers.forEach((receiver) => send(receiver, payload));
						}
					}
					break;
				case "ping":
					send(conn, { type: "pong" });
			}
		}
	});
}
wss.on("connection", onconnection);

server.on("upgrade", (request, socket, head) => {
	// You may check auth of request here..
	const handleAuth = (ws: WebSocket): void => {
		wss.emit("connection", ws, request);
	};
	wss.handleUpgrade(request, socket, head, handleAuth);
});

server.listen(port, () => {
	console.log(`Signaling server running on port ${port}`);
});
