# 🛰️ GitHub Trending Radar

> 基于 GitHub Actions 自动调度的开源热门与飙升项目风向标看板。无需自建服务器，每日定时抓取并发布至 GitHub Pages。

[![Update Trending Radar](https://github.com/hedongli1/trending-radar/actions/workflows/trending.yml/badge.svg)](https://github.com/hedongli1/trending-radar/actions/workflows/trending.yml)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-38bdf8?logo=github)](https://hedongli1.github.io/trending-radar/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 在线体验

👉 **点击访问在线实时看板**：[https://hedongli1.github.io/trending-radar/](https://hedongli1.github.io/trending-radar/)

### 看板特性：
- 🏆 **全站历史 Top 榜**：收录全网总 Star 最高的经典巨头项目（如 freeCodeCamp、Vue、React、Awesome 等）
- 🚀 **近 30 天新建黑马榜 (Breakout)**：精准探测最近 30 天内诞生且 Star 飞速飙升的破局项目
- 🔥 **本周活跃飙升榜 (Active Trending)**：追踪近期有高频代码提交且热度攀升的项目
- 🤖 **AI / LLM / Agent 赛道垂直榜**：锁定 DeepSeek、LLM、AI Agent 等当前最前沿开源生态
- ⚡ **交互功能**：支持即时文本搜索、多编程语言精准筛选、卡片直达仓库

---

## 🏗️ 系统架构设计

本方案参考了业界成熟开源榜单方案（如 `EvanLi/Github-Ranking`、`GitV/Github-Ranking` 等），并做了现代化的纯静态化重构：

```
[ GitHub Actions 定时调度 (每天每12小时) ]
                  ↓
[ 抓取引擎: scripts/fetch-trending.js ]
                  ↓
[ 数据格式化与分类处理 (多维度排序与过滤) ]
                  ↓
[ 持久化输出: docs/data/trending-latest.json ]
                  ↓
[ 自动提交仓库 & 部署至 GitHub Pages (docs/) ]
                  ↓
[ 浏览器端深色科技风看板实时渲染 (零后端 / 极速加载) ]
```

---

## 🛠️ 本地运行与二次开发

### 1. 克隆仓库
```bash
git clone https://github.com/hedongli1/trending-radar.git
cd trending-radar
```

### 2. 运行数据抓取
无需安装任何三方 npm 依赖，Node.js 18+ 原生运行：
```bash
# 可选：配置 GITHUB_TOKEN 以避免未认证请求速率限制
export GITHUB_TOKEN="your_personal_access_token"

npm run fetch
```

### 3. 本地预览看板
直接在浏览器中打开 `docs/index.html` 即可预览实时页面。

---

## 📜 开源协议

本项目采用 [MIT](LICENSE) 协议开源。
