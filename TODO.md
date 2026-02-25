# TODO

## 剪切板功能优化

- [ ] **方案 B：复用文件传输通道传剪切板**
  - 剪切板图片/内容本质是文件，走现有 `useFileTransfer`（WebRTC DataChannel 分片传输）
  - 触发方：读剪切板 → 作为文件发送
  - 接收方：收到后用 `navigator.clipboard.write([new ClipboardItem({ [type]: blob })])` 写入剪切板
  - 优点：天然支持大文件、分片、进度显示；不受 Yjs CRDT 消息大小限制
  - 当前方案 A（Yjs `Y.Map<Uint8Array>`）对大数据性能较差，B 是更合适的长期方案
