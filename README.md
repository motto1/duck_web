# duck_web

一个基于 Next.js + Prisma 的 DuckMail 托管邮箱控制台，支持本地持久化邮箱管理、DuckMail API 中继、Docker 部署，以及 GitHub Actions 自动构建 GHCR 镜像。

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 复制开发环境变量

```bash
cp .env.example .env
```

3. 初始化本地 SQLite 数据库

```bash
npm run db:push
```

4. 启动开发环境

```bash
npm run dev
```

默认开发管理员账号：

- 用户名：`admin`
- 密码：`admin123456`

注意事项：

- 本地开发默认使用 SQLite
- Prisma Client 固定为 `binary` engine，规避 Windows + SQLite + Prisma 6 的 query engine panic
- `.env` 里的 `ADMIN_PASSWORD_HASH` 需要把每个 `$` 写成 `\$`

生成管理员密码哈希：

```bash
node scripts/hash-password.mjs "your-new-password"
```

## Docker / Compose 部署

生产部署默认使用 GHCR 已发布镜像，而不是本地构建。

1. 复制部署环境变量

```bash
cp .env.compose.example .env.compose
```

2. 修改 `.env.compose`

至少需要确认这些值：

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `DUCKMAIL_API_BASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `APP_ENCRYPTION_KEY`
- `SESSION_SECRET`
- `RELAY_API_TOKEN`

3. 启动部署

```bash
docker compose up -d
```

4. 查看服务状态

```bash
docker compose ps
docker compose logs -f duck_web
```

5. 更新镜像后重启

```bash
docker compose pull
docker compose up -d
```

默认部署说明：

- `docker-compose.yml` 使用 `ghcr.io/motto1/duck_web:latest`
- PostgreSQL 数据保存在 named volume `postgres_data`
- 容器启动时会执行 `npm run db:push:prod && npm run start`

如果你要在本地直接构建镜像测试，而不是拉 GHCR：

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build -d
```

## GitHub Actions 自动构建镜像

仓库内置工作流：

- 文件：`.github/workflows/docker-publish.yml`
- 触发条件：
  - 推送到 `master`
  - 手动触发 `workflow_dispatch`

每次触发后会：

1. 构建 Docker 镜像
2. 登录 GHCR
3. 推送到：

```text
ghcr.io/motto1/duck_web
```

标签策略：

- `latest`：默认分支最新版本
- `sha-<short_sha>`：每次推送的唯一版本

工作流依赖：

- GitHub 仓库启用 Packages
- `GITHUB_TOKEN` 拥有 `packages: write`

## 首次发布到 GitHub

当前本地已经登录 `gh` 账号 `motto1`。首次发布流程：

1. 确认登录状态

```bash
gh auth status
```

2. 创建公开仓库并推送当前项目

```bash
gh repo create motto1/duck_web --public --source . --remote origin --push
```

3. 推送完成后验证

```bash
gh repo view
gh run list --limit 5
```

首次推送后，GitHub Actions 会自动开始构建并推送镜像到 GHCR。

## 中继 API

项目提供一组与 DuckMail 官方文档兼容的中继接口：

- `GET /api/domains`
- `POST /api/accounts`
- `POST /api/token`
- `GET /api/me`
- `GET /api/messages`
- `GET|PATCH|DELETE /api/messages/:id`
- `GET /api/sources/:id`
- `DELETE /api/accounts/:id`

说明：

- 多个中继 Token 可在 `/dashboard/settings` 中创建和管理
- 域名可用性继承项目全局白名单
- `POST /api/token` 兼容 DuckMail 官方匿名语义
- 项目级接口使用中继 Token，邮箱级接口使用 mailbox token

## Reverse Proxy 子路径

项目支持运行时子路径前缀，反向代理必须传递 `X-Forwarded-Prefix`。

示例 Nginx：

```nginx
http {
    server {
        listen 8091;
        server_name localhost;

        location /upsnap-sub-path/ {
            proxy_pass http://localhost:3000/;
            proxy_redirect off;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Prefix /upsnap-sub-path;
        }
    }
}
```

## 质量检查

```bash
npm run lint
npm run test
npm run build
```
