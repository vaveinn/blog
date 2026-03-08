---
title: Windows 11 安装 Git（2026 最新详细指南）
published: 2026-03-08
description: 在 Windows 11 上安装 Git 的完整步骤，含关键安装选项与初始配置命令。
tags: [Git, Windows 11, 开发环境, 入门]
category: 教程
draft: false
---

在 Windows 11 上安装 Git 是开发者入门的第一步。虽然安装包的选项很多，但对于大多数用户来说，保持大部分默认设置是最稳妥的选择。

下面是整理后的 2026 年详细安装指南。

---

## 第一步：下载 Git 安装程序

1. 访问 Git 官方网站：[git-scm.com/downloads](https://git-scm.com/downloads)
2. 点击 **Windows** 图标。
3. 在下载页面中，通常选择 **64-bit Git for Windows Setup**（最适合 Windows 11）。

---

## 第二步：安装过程（关键步骤说明）

双击下载好的 `.exe` 文件开始安装，点击 **Next**，直到进入以下关键配置页：

### 1. 选择组件（Select Components）

建议勾选 **Add a Git Bash Profile to Windows Terminal**。  
这样可以直接在 Windows 11 自带终端中使用 Git，体验更统一。

### 2. 选择默认编辑器（Choosing the default editor）

默认是 Vim。  
如果你不熟悉命令行编辑，建议选择 **Visual Studio Code** 或 **Notepad++**。

### 3. 调整初始分支名称（Adjusting the name of the initial branch）

建议选择 **Override the default branch name for new repositories** 并输入 `main`。  
这是当前主流命名方式（替代旧的 `master`）。

### 4. 调整 PATH 环境（Adjusting your PATH environment）

务必选择：**Git from the command line and also from 3rd-party software**。

> 这样可确保你在 CMD、PowerShell、VS Code 终端中都能直接运行 `git` 命令。

### 5. 换行符转换（Configuring the line ending conversions）

务必选择：**Checkout Windows-style, commit Unix-style line endings**。

> 这可以减少 Windows 与 Linux/macOS 协作时的换行符冲突问题。

---

## 第三步：验证安装是否成功

安装完成后，右键桌面空白处选择 **在终端中打开**（Open in Terminal），或直接打开 **Git Bash**，执行：

```bash
git --version
```

如果看到类似 `git version 2.x.x.windows.1` 的输出，说明安装成功。

---

## 第四步：初始配置（必做）

安装后请先设置用户名和邮箱，否则无法正常提交代码：

```bash
# 设置用户名
git config --global user.name "你的英文名"

# 设置邮箱
git config --global user.email "你的邮箱@example.com"
```

---

## 进阶小贴士

- **右键菜单被折叠：** Windows 11 默认使用精简右键菜单。  
  如果没看到 `Git Bash Here`，点击 **显示更多选项** 即可。

