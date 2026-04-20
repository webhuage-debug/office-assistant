# smart-home-office-assistant

一个面向全屋智能业务的本地桌面办公助手，优先支持在 Windows 本地电脑直接运行，用于客户、项目、报价和数据备份管理。

## 技术栈

- React
- Vite
- Tauri
- TypeScript
- SQLite

## 项目结构

- `src/`：前端界面、页面、组件、状态和通用工具
- `src-tauri/`：Tauri Rust 后端、SQLite 数据访问、导出和配置逻辑
- `config/`：默认配置模板，首次启动会复制到运行时配置位置

## 本地运行方式

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发模式

前端开发预览：

```bash
pnpm dev
```

桌面端开发模式：

```bash
pnpm tauri:dev
```

## 构建步骤

前端构建：

```bash
pnpm build
```

桌面端打包：

```bash
pnpm tauri:build
```

## 数据存储与配置

运行时配置由应用自动维护，不需要手写绝对路径。

默认位置会落在应用数据目录下：

- 配置文件：`<AppData>/smart-home-office-assistant/config/app.config.json`
- 数据库文件：`<AppData>/smart-home-office-assistant/data/smart-home-office-assistant.db`
- 导出目录：`<AppData>/smart-home-office-assistant/exports`
- 上传目录：`<AppData>/smart-home-office-assistant/uploads`

如果后续需要调整数据库或导出路径，可以修改配置文件中的相对路径，而不是写死本机路径。

## 数据备份方式

当前已经预留并实现了基础导出能力：

1. 导出 JSON：完整项目与报价数据备份
2. 导出 CSV：便于用表格工具查看
3. 导出 SQLite 数据库文件：适合整库迁移

建议日常优先使用 JSON + 数据库文件双备份。

## 数据恢复方式

目前支持：

1. 通过 JSON 备份文件恢复数据
2. 通过直接替换 SQLite 数据库文件恢复整库

恢复前建议先备份当前数据库文件，避免覆盖误操作。

## 迁移到新电脑步骤

1. 安装 Node.js、pnpm、Rust 和 Tauri 依赖。
2. 将备份文件或整库数据库文件拷贝到新电脑。
3. 启动一次应用，让运行时目录自动生成。
4. 如果使用 JSON 备份，先导入 JSON 恢复数据。
5. 如果使用数据库文件备份，直接替换新的数据库文件即可。

## 当前已完成功能

- 首页工作台统计
- 项目列表、搜索、查看、编辑、删除
- 新建项目
- 项目详情页
- 报价明细录入、删除和自动计算
- SQLite 本地存储
- JSON / CSV / 数据库文件导出
- 基础导入恢复能力
- 本地配置文件管理

## 后期服务器部署预留

当前项目虽然是桌面版，但代码已经按前后端分离思路组织，后续迁移到 Web 版或私有云版时，可以继续沿用：

- `frontend/`：前端界面层
- `backend/`：业务服务层
- `database/`：数据层

目前仓库仍以 Tauri 桌面应用为主，后续如果改成服务器部署，优先迁移业务逻辑和数据访问层，尽量减少页面层改动。

## 说明

- 所有敏感信息都放在配置和运行时目录中，不写死在代码里。
- 当前版本优先保证“本地可用、可备份、可迁移”。
