# 本地管理面板使用说明

## 启动

```bash
node server.mjs
# 或指定端口
node server.mjs --port 3000
```

输出：
```
✦ Resource Hub — Local Admin
├─ Site:   http://localhost:8787/
└─ Admin:  http://localhost:8787/admin/panel.html
```

## 管理功能

| 功能 | 位置 |
|------|------|
| 浏览站点 | http://localhost:8787/ |
| 管理后台 | http://localhost:8787/admin/panel.html |
| 新建资源 | 侧边栏右上角 `+ New` |
| 编辑资源 | 点击侧边栏条目 |
| 删除资源 | 编辑表单底部 `Delete` 按钮 |
| 保存 | `Save` 按钮，自动运行 `build-data.js` |
| 一键部署 | 顶部 `Deploy` 按钮 |

## 一键部署（Deploy）前提

### 1. 初始化 Git 仓库（首次）

```bash
cd K:\xc
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

### 2. 开启 GitHub Pages

Settings → Pages → Source → **GitHub Actions**

### 3. 点击 Deploy

- 填写 commit message
- 面板自动执行 `git add . && git commit && git push`
- 推送后 GitHub Actions 自动重新部署 Pages

## 添加新资源（手动）

不想开面板也可以直接新建 JSON 文件：

```json
// resources/11-example.json
{
  "title_en": "...",
  "desc_en": "...",
  "title_zh": "...",
  "desc_zh": "...",
  "url": "https://...",
  "category": "tools",
  "icon": "🔧",
  "tags": ["tag1", "tag2"]
}
```

然后运行：

```bash
node scripts/build-data.js
```

## 目录结构

```
K:\xc\
├── server.mjs          ← 管理面板服务器（一键启动）
├── index.html          ← 主站入口
├── admin\
│   ├── panel.html     ← 管理面板 UI
│   ├── panel.css       ← 面板样式
│   ├── panel.js        ← 面板逻辑
│   └── config.yml     ← Decap CMS 配置（可选）
├── assets\
│   ├── css\style.css
│   └── js\
│       ├── data.js     ← 自动生成，勿手动编辑
│       ├── i18n.js
│       └── main.js
├── resources\           ← 所有资源 JSON 文件
└── scripts\
    └── build-data.js   ← JSON → data.js 编译脚本
```
