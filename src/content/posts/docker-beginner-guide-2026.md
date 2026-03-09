---
title: Docker 新手入门：从安装到第一个可用容器
published: 2026-03-09
description: 面向零基础的 Docker 教程，包含安装、核心概念、常用命令、镜像构建和 Compose 实战。
tags: [Docker, 容器, 教程, DevOps]
category: 教程
draft: false
lang: zh-CN
---

本文地址：`/posts/docker-beginner-guide-2026/`

如果你是第一次接触 Docker，这篇文章会带你从 0 到 1 跑通完整流程：

1. 安装 Docker
2. 理解镜像和容器
3. 跑起第一个服务
4. 掌握常用命令
5. 用 `Dockerfile` 打包自己的应用
6. 用 `Docker Compose` 管理多服务

## 1. Docker 是什么

可以把 Docker 理解成“标准化打包 + 统一运行环境”。

- 镜像（Image）：应用模板，类似“安装包”
- 容器（Container）：镜像运行后的实例，类似“进程 + 隔离环境”
- 仓库（Registry）：存放镜像的地方，最常见是 Docker Hub

一句话：镜像是静态模板，容器是动态实例。

## 2. 安装 Docker

### Windows / macOS

安装 **Docker Desktop**，安装完成后在终端执行：

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

可选：把当前用户加入 `docker` 组，避免每次都用 `sudo`：

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

```bash
docker run -d --name my-nginx -p 8080:80 nginx:alpine
```

参数说明：

- `-d`：后台运行
- `--name my-nginx`：容器名
- `-p 8080:80`：把宿主机 8080 映射到容器 80

浏览器访问 `http://localhost:8080`，看到欢迎页表示成功。

常用操作：

```bash
docker ps
docker logs my-nginx
docker stop my-nginx
docker start my-nginx
docker rm my-nginx
```

## 5. 数据持久化：Volume

容器删掉后，容器内数据通常也会消失。要持久化请使用 Volume：

```bash
docker volume create nginx-data
docker run -d --name my-nginx-2 -p 8081:80 -v nginx-data:/usr/share/nginx/html nginx:alpine
```

查看 Volume：

```bash
docker volume ls
docker volume inspect nginx-data
```

## 6. 写一个最小 Dockerfile

目录结构：

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

构建并运行：

```bash
docker build -t my-site:v1 .
docker run -d --name my-site -p 8090:80 my-site:v1
```

访问 `http://localhost:8090` 查看效果。

## 7. 用 Docker Compose 管理服务

当服务变多时，建议使用 Compose：

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

## 8. 新手常用命令清单

```bash
docker images
docker ps -a
docker pull nginx:alpine
docker exec -it my-nginx sh
docker stop <container>
docker rm <container>
docker rmi <image>
docker system df
docker system prune -f
```

## 9. 常见问题排查

### 端口占用

报错 `port is already allocated`，换端口即可，例如 `-p 8099:80`。

### 容器反复重启

先看日志：

```bash
docker logs <container-name>
```

### 拉取镜像很慢

可配置镜像加速源，或切换网络后重试。

## 10. 下一步建议

1. 学 Docker 网络（bridge / host / overlay）
2. 学多阶段构建（Multi-stage Build）
3. 用 Compose 管理数据库 + API + 前端
4. 再进阶到 Kubernetes
