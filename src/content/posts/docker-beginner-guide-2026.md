---
title: Docker 新手入门：从安装到第一个可用容器
published: 2026-03-09
description: 面向零基础的 Docker 教程，包含安装、核心概念、常用命令、镜像构建与 Compose 实战。
tags: [Docker, 容器, 教程, DevOps]
category: 教程
draft: false
lang: zh-CN
---

如果你是第一次接触 Docker，这篇文章会带你从 0 到 1 跑通完整流程：

1. 安装 Docker  
2. 理解镜像和容器  
3. 跑起第一个服务  
4. 学会常用命令  
5. 用 `Dockerfile` 打包自己的应用  
6. 用 `Docker Compose` 管理多服务

## 1. Docker 是什么

可以把 Docker 理解成“标准化打包 + 统一运行环境”。

- **镜像（Image）**：应用的模板，类似“安装包”
- **容器（Container）**：镜像运行后的实例，类似“进程 + 隔离环境”
- **仓库（Registry）**：存镜像的地方，常见是 Docker Hub

一句话：**镜像是静态模板，容器是动态实例**。

## 2. 安装 Docker

### Windows / macOS

安装 **Docker Desktop** 即可。安装后打开终端，执行：

```bash
docker --version
docker compose version
```

如果都能输出版本号，说明安装成功。

### Linux（Ubuntu 示例）

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
docker --version
docker compose version
```

可选：把当前用户加入 `docker` 组，避免每次都用 `sudo`。

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## 3. 第一个容器：Hello World

```bash
docker run hello-world
```

这条命令会自动完成：

1. 本地没有镜像时先拉取 `hello-world` 镜像  
2. 创建并运行一个容器  
3. 输出测试信息后退出

## 4. 第一个“可访问”的服务：Nginx

启动一个 Nginx 容器并映射端口：

```bash
docker run -d --name my-nginx -p 8080:80 nginx:alpine
```

参数解释：

- `-d`：后台运行
- `--name my-nginx`：容器名称
- `-p 8080:80`：把宿主机 `8080` 映射到容器 `80`

浏览器访问 `http://localhost:8080`，看到欢迎页就成功了。

常用操作：

```bash
docker ps                 # 查看运行中的容器
docker logs my-nginx      # 查看日志
docker stop my-nginx      # 停止容器
docker start my-nginx     # 启动容器
docker rm my-nginx        # 删除容器（需先 stop）
```

## 5. 数据持久化：Volume

如果容器删除，容器内数据通常也会丢失。要持久化，用 Volume。

```bash
docker volume create nginx-data
docker run -d --name my-nginx-2 -p 8081:80 -v nginx-data:/usr/share/nginx/html nginx:alpine
```

查看 volume：

```bash
docker volume ls
docker volume inspect nginx-data
```

## 6. 写一个最小 Dockerfile

新建目录并创建两个文件：

```text
docker-demo/
  ├─ index.html
  └─ Dockerfile
```

`index.html`：

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>My Docker Site</title>
  </head>
  <body>
    <h1>Hello Docker</h1>
    <p>It works.</p>
  </body>
</html>
```

`Dockerfile`：

```dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
```

构建镜像并运行：

```bash
docker build -t my-site:v1 .
docker run -d --name my-site -p 8090:80 my-site:v1
```

访问 `http://localhost:8090`，看到你自己的页面。

## 7. 用 Docker Compose 管理服务

当服务多起来，`docker run` 会变得难管理。建议用 Compose。

创建 `compose.yaml`：

```yaml
services:
  web:
    image: nginx:alpine
    container_name: compose-nginx
    ports:
      - "8088:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
```

执行：

```bash
docker compose up -d
docker compose ps
docker compose logs -f
docker compose down
```

## 8. 新手最常用命令清单

```bash
docker images                    # 查看本地镜像
docker ps -a                     # 查看所有容器
docker pull nginx:alpine         # 拉取镜像
docker exec -it my-nginx sh      # 进入容器
docker stop <container>          # 停止容器
docker rm <container>            # 删除容器
docker rmi <image>               # 删除镜像
docker system df                 # 查看空间占用
docker system prune -f           # 清理无用资源（谨慎）
```

## 9. 常见问题排查

### 端口被占用

报错里出现 `port is already allocated`，说明端口冲突。  
换一个端口，比如 `-p 8099:80`。

### 容器一直重启

先看日志：

```bash
docker logs <container-name>
```

大多数问题都能从日志直接定位。

### 拉取镜像很慢

可配置镜像加速源，或换网络环境后重试。

## 10. 下一步学什么

当你完成这篇的内容后，建议继续：

1. 学 Docker 网络（bridge / host / overlay）
2. 学多阶段构建（Multi-stage Build）优化镜像体积
3. 学 Compose 管理数据库 + API + 前端完整项目
4. 再进阶到 Kubernetes

---

如果你愿意，我下一篇可以直接写：  
**“用 Docker 一键跑前端 + 后端 + MySQL 的本地开发环境”**，继续按新手视角来。
