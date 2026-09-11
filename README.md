# RWKV-code

Next.js 项目，适用于大屏展示场景。

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务 (http://localhost:3000)
pnpm dev
```

## 构建与预览

```bash
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

## Docker 部署

### 构建镜像

```bash
docker build -t rwkv-code .
```

### 运行容器

```bash
docker run -p 3000:3000 rwkv-code
```

或使用 **docker-compose** 运行：

```bash
docker compose up --build -d
```

访问：[http://localhost:3000](http://localhost:3000)

## 环境变量配置

在项目根目录下创建一个 `.env` 文件，并添加以下内容：

```bash
NEXT_PUBLIC_RWKV_API_URL=http://192.168.0.12:8000/v1/chat/completions
NEXT_PUBLIC_RWKV_API_PASSWORD=your-password
```

> 浏览器只请求同源 `/api/chat`。由 App Router 再去请求 RWKV 后端，这样不会有跨域问题。
> 请保证运行 Next 的机器能访问 `NEXT_PUBLIC_RWKV_API_URL` 指向的地址。Docker 里若后端在宿主机，可用 `host.docker.internal`。

后端项目仓库地址：
[RWKV Lightning（GitHub）](https://github.com/RWKV-Vibe/rwkv_lightning)

## 大屏显示说明

本项目为 **大屏展示模式** 设计（建议分辨率 3440x1440）。

在普通电脑上开发时：

- 请将浏览器缩放至 **33%** 以模拟大屏显示比例；
- 布局为定宽设计，非响应式；
- 字号和组件尺寸以大屏为基准；
- 调试时尽量在 1440p 或更高分辨率屏幕上查看。


