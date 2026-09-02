// scripts/fetch-trending.js
// 零依赖 Node.js 抓取引擎，定时在 GitHub Actions 运行
// 抓取 4 个维度的热门与趋势项目：
// 1. total: 全站历史 Top Stars 总榜
// 2. breakout: 近 30 天新建且 Star 飙升黑马榜
// 3. active: 近 7 天活跃且 Star 增长榜
// 4. ai: AI / LLM / Agent 热门垂直榜

import { promises as fs } from 'node:fs';
import path from 'node:path';

const GITHUB_API = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN || process.env.PATROL_TOKEN;

async function gh(apiPath) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'trending-radar-bot',
  };
  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }
  const res = await fetch(`${GITHUB_API}${apiPath}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

// 格式化项目数据
function formatRepo(item) {
  return {
    id: item.id,
    name: item.name,
    fullName: item.full_name,
    url: item.html_url,
    description: item.description || '暂无描述',
    stars: item.stargazers_count,
    forks: item.forks_count,
    openIssues: item.open_issues_count,
    language: item.language || 'Other',
    owner: {
      login: item.owner.login,
      avatarUrl: item.owner.avatar_url,
      url: item.owner.html_url,
    },
    topics: item.topics || [],
    createdAt: item.created_at,
    pushedAt: item.pushed_at,
    updatedAt: item.updated_at,
    license: item.license ? item.license.spdx_id || item.license.name : null,
  };
}

// 抓取并保存各维度榜单
async function fetchCategory(name, query, sort = 'stars', order = 'desc', limit = 50) {
  console.log(`📡 正在抓取 [${name}] 榜单... 查询: ${query}`);
  const data = await gh(`/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=${order}&per_page=${limit}`);
  const items = (data.items || []).map(formatRepo);
  console.log(`✅ [${name}] 成功抓取 ${items.length} 条项目`);
  return items;
}

export async function run() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  // 日期推算
  const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const dataset = {
    updatedAt: now.toISOString(),
    date: dateStr,
    categories: {
      // 1. 全站总榜
      allTime: await fetchCategory('全站历史 Top 榜', 'stars:>10000', 'stars', 'desc', 50),
      // 2. 近 30 天新建爆发黑马榜 (Breakout Stars)
      breakout: await fetchCategory('近30天新建黑马榜', `created:>${d30} stars:>50`, 'stars', 'desc', 50),
      // 3. 近 7 天活跃热度榜 (Active Trending)
      activeWeek: await fetchCategory('本周活跃飙升榜', `pushed:>${d7} stars:>1000`, 'stars', 'desc', 50),
      // 4. AI & 大模型赛道榜 (AI / LLM / Agent)
      aiEco: await fetchCategory('AI / LLM 垂直热榜', `deepseek OR llm OR gpt OR "agent" stars:>500 pushed:>${d30}`, 'stars', 'desc', 50),
    },
    languages: {},
  };

  // 统计主流语言覆盖
  const langSet = new Set();
  Object.values(dataset.categories).forEach((list) => {
    list.forEach((r) => {
      if (r.language && r.language !== 'Other') langSet.add(r.language);
    });
  });
  dataset.availableLanguages = Array.from(langSet).sort();

  // 写入 docs/data/trending-latest.json
  const outDir = path.resolve('docs/data');
  await fs.mkdir(outDir, { recursive: true });

  const latestPath = path.join(outDir, 'trending-latest.json');
  await fs.writeFile(latestPath, JSON.stringify(dataset, null, 2), 'utf8');
  console.log(`💾 成功写入最新榜单数据至 ${latestPath}`);

  // 同时存档一份到历史记录
  const historyPath = path.join(outDir, `${dateStr}.json`);
  await fs.writeFile(historyPath, JSON.stringify(dataset, null, 2), 'utf8');
  console.log(`💾 成功存档历史数据至 ${historyPath}`);

  // ── 自动整理：与上一份数据做榜单变化分析（新上榜 / 排名上升最快 / 掉榜）──
  const insight = await buildInsight(outDir, dataset, dateStr);

  return dataset;
}

// 自动整理：对比最近一份「非当天」的历史存档，生成榜单变化洞察
async function buildInsight(outDir, current, dateStr) {
  const insight = {
    generatedAt: new Date().toISOString(),
    date: dateStr,
    categories: {},
    summary: {},
  };
  let prev = null;
  try {
    // 列出历史存档，取最近一份非当天的（避免与自己今天刚写的最新文件对比）
    const files = (await fs.readdir(outDir))
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .filter((f) => !f.startsWith(dateStr))
      .sort();
    if (files.length) {
      prev = JSON.parse(await fs.readFile(path.join(outDir, files[files.length - 1]), 'utf8'));
    }
  } catch {
    // 无历史可对比（首次运行）
  }

  for (const cat of Object.keys(current.categories)) {
    const cur = current.categories[cat] || [];
    const pre = (prev && prev.categories[cat]) || [];
    const preRank = new Map(pre.map((r, i) => [r.fullName, i + 1]));
    const curRank = new Map(cur.map((r, i) => [r.fullName, i + 1]));

    // 新上榜（本次有、上次无）
    const newcomers = cur.filter((r) => !preRank.has(r.fullName)).slice(0, 10);

    // 排名上升最快的（上次在榜且名次前进最多）
    const risers = cur
      .filter((r) => preRank.has(r.fullName))
      .map((r) => ({ repo: r, gained: (preRank.get(r.fullName) || 999) - curRank.get(r.fullName) }))
      .filter((x) => x.gained > 0)
      .sort((a, b) => b.gained - a.gained)
      .slice(0, 10)
      .map((x) => ({ ...x.repo, rankGain: x.gained }));

    // 掉榜（上次在榜、本次消失）
    const dropped = pre.filter((r) => !curRank.has(r.fullName)).slice(0, 10);

    insight.categories[cat] = { newcomers, risers, dropped };
    insight.summary[cat] = {
      total: cur.length,
      newcomers: newcomers.length,
      risers: risers.length,
      dropped: dropped.length,
    };
  }

  const insightPath = path.join(outDir, 'insight-latest.json');
  await fs.writeFile(insightPath, JSON.stringify(insight, null, 2), 'utf8');
  console.log(`📊 自动整理：榜单变化洞察已写入 ${insightPath}`);
  return insight;
}

if (process.argv[1] && process.argv[1].endsWith('fetch-trending.js')) {
  run().catch((err) => {
    console.error('❌ 抓取失败:', err);
    process.exit(1);
  });
}
