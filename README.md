# Bakkac's Blog

Bakkac's Blog 是我的个人博客，记录学习笔记、开发思考与生活随想杂记。

## Tech Stack

- Astro + React
- Tailwind CSS
- TypeScript

## Installation

```bash
pnpm install
```

## Local Development

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

产物输出到 `dist` 目录。

## Preview

```bash
pnpm preview
```

## Deployment

站点部署在 Cloudflare Pages，文章图片托管在 Cloudflare R2。

本地手动发布：

```bash
pnpm deploy:pages
```

该命令会依次执行：同步 `src/content` 下的图片到 R2（`scripts/r2-sync-assets.mjs`、
把 Markdown 里的本地图片路径改写为 R2 公网地址）、类型检查、构建站点，最后用
wrangler 上传 `dist` 到 `bakkac-blog` 项目。需要本地已执行过
`pnpm exec wrangler login`。

常用的变体：

```bash
pnpm r2:assets:dry   # 只预览图片同步，不上传也不改写 Markdown
pnpm build:site      # 只构建，不碰 R2
```

CI 只做校验：`.github/workflows/test-deploy.yml` 在每个 PR 上跑 `pnpm check` 和
`pnpm build:site`，确认改动能构建通过；真正的发布由上面的命令手动触发。

线上地址：https://bakkac-blog.pages.dev/
