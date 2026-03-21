---
title: Dujiao-Next部署：脚本化保姆级教程
published: 2026-03-21
description: 按官方文档走一遍 Docker Compose 部署，用一段一段脚本把目录、配置、Compose、启动、反代全跑通，最后附一个“无脑指令”一键起服务。
tags: [Dujiao-Next, 部署, Docker Compose, 教程]
category: 教程
draft: false
lang: zh-CN
image: /images/dujiao-next-flow.svg
---

本文地址：`/posts/dujiao-next-docker-compose-deploy-2026/`

这篇文章基于 Dujiao-Next 官方文档的 Docker Compose 方案整理，目标是“每一步一段脚本”，照着敲就能搭好。
项目地址https://dujiao-next.com

![Dujiao-Next 部署流程图](/images/dujiao-next-flow.svg)

![Dujiao-Next 架构示意](/images/dujiao-next-arch.svg)

## 部署前准备

- 一台 Linux 服务器与可解析到公网 IP 的域名
- 已安装 Docker 与 Docker Compose
- 规划端口：至少 API 端口 + Web 端口
- 选择数据方案：轻量用 SQLite + Redis；生产建议 PostgreSQL + Redis
- 必须改强随机密钥：`jwt.secret` 与 `user_jwt.secret`

## 脚本 1：创建部署目录并修正权限

```bash
sudo mkdir -p /opt/dujiao-next/{config,data/db,data/uploads,data/logs,data/redis,data/postgres}
cd /opt/dujiao-next

# 避免日志/数据库目录权限不足（API 容器默认非 root 用户）
sudo chmod -R 0777 ./data/logs ./data/db ./data/uploads ./data/redis ./data/postgres
```

## 脚本 2：下载 API 配置模板

```bash
cd /opt/dujiao-next
sudo curl -L https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example -o ./config/config.yml
```

## 脚本 3：编辑 `config.yml`

```bash
sudo nano /opt/dujiao-next/config/config.yml
```

把数据库和 Redis 配置改为下面示例（SQLite + Redis），并务必修改 `jwt.secret` 与 `user_jwt.secret` 为强随机字符串：

```yaml
database:
  driver: sqlite
  dsn: /app/db/dujiao.db

redis:
  enabled: true
  host: redis
  port: 6379
  password: your-strong-redis-password
  db: 0
  prefix: "dj"

queue:
  enabled: true
  host: redis
  port: 6379
  password: your-strong-redis-password
  db: 1
  concurrency: 10
  queues:
    default: 10
    critical: 5
```

## 脚本 4：写入 `.env`

```bash
cat > /opt/dujiao-next/.env <<'ENV'
TAG=latest
TZ=Asia/Shanghai

API_PORT=8080
USER_PORT=8081
ADMIN_PORT=8082
REDIS_PORT=6379
POSTGRES_PORT=5432

# 默认管理员（仅首次初始化时生效）
DJ_DEFAULT_ADMIN_USERNAME=admin
DJ_DEFAULT_ADMIN_PASSWORD=admin123

# Redis
REDIS_PASSWORD=your-strong-redis-password

# PostgreSQL（仅 PostgreSQL 方案需要）
POSTGRES_DB=dujiao_next
POSTGRES_USER=dujiao
POSTGRES_PASSWORD=dujiao_pass
ENV
```

## 脚本 5：写入 Compose 文件（SQLite + Redis）

```bash
cat > /opt/dujiao-next/docker-compose.sqlite.yml <<'YAML'
services:
  redis:
    image: redis:7-alpine
    container_name: dujiaonext-redis
    restart: unless-stopped
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    ports:
      - "${REDIS_PORT}:6379"
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

  api:
    image: dujiaonext/api:${TAG}
    container_name: dujiaonext-api
    restart: unless-stopped
    environment:
      TZ: ${TZ}
      DJ_DEFAULT_ADMIN_USERNAME: ${DJ_DEFAULT_ADMIN_USERNAME}
      DJ_DEFAULT_ADMIN_PASSWORD: ${DJ_DEFAULT_ADMIN_PASSWORD}
    ports:
      - "${API_PORT}:8080"
    volumes:
      - ./config/config.yml:/app/config.yml:ro
      - ./data/db:/app/db
      - ./data/uploads:/app/uploads
      - ./data/logs:/app/logs
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net

  user:
    image: dujiaonext/user:${TAG}
    container_name: dujiaonext-user
    restart: unless-stopped
    environment:
      TZ: ${TZ}
    ports:
      - "${USER_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dujiao-net

  admin:
    image: dujiaonext/admin:${TAG}
    container_name: dujiaonext-admin
    restart: unless-stopped
    environment:
      TZ: ${TZ}
    ports:
      - "${ADMIN_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dujiao-net

networks:
  dujiao-net:
    driver: bridge
YAML
```

## 脚本 6：启动服务

```bash
cd /opt/dujiao-next
docker compose --env-file .env -f docker-compose.sqlite.yml up -d
```

## 脚本 7：健康检查与首次登录

```bash
docker compose --env-file .env -f docker-compose.sqlite.yml ps
curl -fsS http://127.0.0.1:8080/health
```

本地访问：

- 前台：`http://服务器IP:8081`
- 后台：`http://服务器IP:8082`

默认后台管理员（首次初始化时生效）：

- 账号：`admin`
- 密码：`admin123`

## 脚本 8：Nginx 反向代理（可选，推荐上生产）

如果你要用域名访问，且前台/后台走同源 `/api` 与 `/uploads`，可以用如下示例：

```bash
sudo tee /etc/nginx/conf.d/dujiao-next.conf > /dev/null <<'NGINX'
server {
    listen 80;
    server_name user.example.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name admin.example.com;

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo nginx -t
sudo systemctl reload nginx
```

## 如果你要 PostgreSQL

- 把 `config.yml` 的 `database.driver` 改成 `postgres`，并按文档填 `dsn`
- 把 Compose 文件换成 `docker-compose.postgres.yml` 并启动对应命令

---

无脑指令（SQLite + Redis，一条指令搞定）：

```bash
sudo bash -c 'set -e
BASE=/opt/dujiao-next
mkdir -p $BASE/{config,data/db,data/uploads,data/logs,data/redis}
chmod -R 0777 $BASE/data/logs $BASE/data/db $BASE/data/uploads $BASE/data/redis
curl -fsSL https://raw.githubusercontent.com/dujiao-next/dujiao-next/main/config.yml.example -o $BASE/config/config.yml
sed -i "s#dsn: ./db/dujiao.db#dsn: /app/db/dujiao.db#" $BASE/config/config.yml
sed -i "s#host: 127.0.0.1#host: redis#g" $BASE/config/config.yml
sed -i "s#password: \"\"#password: your-strong-redis-password#g" $BASE/config/config.yml
cat > $BASE/.env <<EOF
TAG=latest
TZ=Asia/Shanghai
API_PORT=8080
USER_PORT=8081
ADMIN_PORT=8082
REDIS_PORT=6379
DJ_DEFAULT_ADMIN_USERNAME=admin
DJ_DEFAULT_ADMIN_PASSWORD=admin123
REDIS_PASSWORD=your-strong-redis-password
EOF
cat > $BASE/docker-compose.sqlite.yml <<EOF
services:
  redis:
    image: redis:7-alpine
    container_name: dujiaonext-redis
    restart: unless-stopped
    environment:
      REDIS_PASSWORD: \${REDIS_PASSWORD}
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "\${REDIS_PASSWORD}"]
    ports:
      - "\${REDIS_PORT}:6379"
    volumes:
      - ./data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net
  api:
    image: dujiaonext/api:\${TAG}
    container_name: dujiaonext-api
    restart: unless-stopped
    environment:
      TZ: \${TZ}
      DJ_DEFAULT_ADMIN_USERNAME: \${DJ_DEFAULT_ADMIN_USERNAME}
      DJ_DEFAULT_ADMIN_PASSWORD: \${DJ_DEFAULT_ADMIN_PASSWORD}
    ports:
      - "\${API_PORT}:8080"
    volumes:
      - ./config/config.yml:/app/config.yml:ro
      - ./data/db:/app/db
      - ./data/uploads:/app/uploads
      - ./data/logs:/app/logs
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/health"]
      interval: 10s
      timeout: 3s
      retries: 10
    networks:
      - dujiao-net
  user:
    image: dujiaonext/user:\${TAG}
    container_name: dujiaonext-user
    restart: unless-stopped
    environment:
      TZ: \${TZ}
    ports:
      - "\${USER_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dujiao-net
  admin:
    image: dujiaonext/admin:\${TAG}
    container_name: dujiaonext-admin
    restart: unless-stopped
    environment:
      TZ: \${TZ}
    ports:
      - "\${ADMIN_PORT}:80"
    depends_on:
      api:
        condition: service_healthy
    networks:
      - dujiao-net
networks:
  dujiao-net:
    driver: bridge
EOF
cd $BASE
docker compose --env-file .env -f docker-compose.sqlite.yml up -d'
```
