# OpenClaw Desktop

[OpenClaw](https://github.com/openclaw/openclaw) 多通道 AI 网关的桌面客户端。基于 Tauri 2 + React 19 + TypeScript 构建。

## 功能

- **环境管理** — 自动检测并安装 Node.js、Git、`openclaw` CLI；配置 npm 镜像源（npmmirror）
- **网关控制** — 启动 / 停止 / 重启 OpenClaw 网关进程；注册或卸载系统服务
- **WebSocket 客户端** — Rust 原生 WebSocket 连接，支持协议 v3 握手、请求-响应关联、实时事件流
- **对话** — 发送消息、实时流式接收助手回复、中止进行中的推理
- **通道** — 查看和监控多通道账户状态（已连接 / 运行中 / 已停止）
- **模型与供应商** — 浏览可用模型及其上下文窗口大小
- **设置** — 编辑 `openclaw.json`（JSON5 格式），支持热重载
- **监控** — 查看系统健康状态与已连接客户端

## 技术栈

| 层级   | 技术                                              |
| ------ | ------------------------------------------------- |
| 外壳   | Tauri 2                                           |
| 后端   | Rust (tokio, tokio-tungstenite, reqwest, serde)   |
| 前端   | React 19, React Router 7, Zustand, Tailwind CSS 4 |
| 构建   | Vite 7, TypeScript 5.8                            |

## 前置要求

- [Rust](https://www.rust-lang.org/tools/install)（stable）
- [Node.js](https://nodejs.org/) >= 22 LTS
- [Tauri CLI](https://v2.tauri.app/start/create-project/)（`npm install -g @tauri-apps/cli`）

## 快速开始

```bash
cd openclaw-desktop
npm install
npm run tauri dev
```

## 构建

```bash
npm run tauri build
```

产物输出至 `src-tauri/target/release/bundle/`。

## 项目结构

```
openclaw-desktop/
  src/                        # React 前端
    components/layout/        # Sidebar, StatusBar
    pages/                    # Chat, Channels, Providers, Settings, Monitor, Environment
    lib/
      gateway.ts              # Tauri invoke 封装（环境、网关、对话、配置）
      store.ts                # Zustand 状态管理 + Tauri 事件监听
  src-tauri/                  # Rust 后端
    src/
      env/                    # 环境检测、依赖安装、镜像配置
      gateway/                # WebSocket 客户端、协议帧、进程管理、事件
      config/                 # 配置文件读取
      lib.rs                  # Tauri 命令注册与应用入口
```

## 许可证

MIT
