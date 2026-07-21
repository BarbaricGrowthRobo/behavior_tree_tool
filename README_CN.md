# 行为树可视化管理工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-lightgrey.svg)](https://flask.palletsprojects.com/)

一个基于 Flask + 前端的可视化行为树编辑管理工具，支持加载、编辑、保存 BehaviorTree XML 文件。

---

## 目录

- [功能特性](#-功能特性)
- [系统要求](#-系统要求)
- [快速开始](#-快速开始)
- [使用说明](#-使用说明)
- [配置说明](#-配置说明)
- [项目结构](#-项目结构)
- [示例配置](#-示例配置)
- [开源协议](#-开源协议)

---

## 功能特性

- 可视化编辑: 通过 Web 界面直观查看和编辑行为树结构
- XML 支持: 完全兼容 BehaviorTree.CPP 格式的 XML 文件
- 节点注册表: 通过 JSON 配置文件灵活定义节点类型
- 添加/删除节点: 支持动态添加和删除节点
- 保存/加载: 实时保存编辑结果到 XML 文件
- 美观界面: 现代化的前端可视化界面

---

## 系统要求

- Python 3.8+
- Flask 2.0+
- 现代浏览器（Chrome, Firefox, Edge, Safari）

---

## 快速开始

### 1. 安装依赖

```bash
cd behavior_tree_tool
pip install flask
```

### 2. 运行工具

**Linux/macOS:**
```bash
chmod +x run.sh
./run.sh
```

**Windows:**
```bash
python bt_manager.py
```

### 3. 访问界面

打开浏览器访问:
```
http://localhost:5000
```

---

## 使用说明

### 1. 加载行为树
- 启动工具后，系统会自动加载 `behavior_trees/` 目录下的所有 XML 文件
- 在左侧文件列表中选择要编辑的行为树文件

### 2. 查看行为树
- 行为树以树形结构展示在页面中央
- 点击节点可以查看和编辑其参数

### 3. 编辑节点
- 修改参数: 点击节点，在右侧面板中修改参数值
- 添加子节点: 选中父节点后，点击"添加子节点"按钮
- 删除节点: 选中节点后，点击"删除节点"按钮

### 4. 保存修改
- 点击"保存"按钮将修改保存到 XML 文件
- 支持另存为新文件

### 5. 创建新行为树
- 点击"新建行为树"按钮
- 输入行为树 ID 和根节点名称
- 开始添加节点构建行为树

---

## 配置说明

### 节点注册表

节点注册表配置文件位于 `node_registry.json`，定义了所有可用的节点类型及其参数。

#### 配置格式

```json
{
  "version": "1.0",
  "project_name": "your_project_name",
  "description": "项目描述",
  "nodes": {
    "节点名称": {
      "type": "节点类型",
      "ports": [
        {
          "name": "参数名",
          "type": "参数类型",
          "default": "默认值"
        }
      ],
      "description": "节点描述"
    }
  }
}
```

#### 节点类型

| 类型 | 说明 |
|------|------|
| `control` | 控制节点（Sequence, Fallback 等） |
| `condition` | 条件节点（检查状态等） |
| `action` | 动作节点（执行操作等） |

### 切换项目配置

切换到不同项目时，只需修改 `node_registry.json` 文件即可。

---

## 项目结构

```
behavior_tree_tool/
├── bt_manager.py              # 主程序
├── node_registry_loader.py    # 节点注册表加载器
├── node_registry.json         # 节点注册表配置（示例）
├── run.sh                     # 启动脚本
├── LICENSE                    # MIT 开源协议
├── README.md                  # 说明文档（英文）
├── README_CN.md               # 说明文档（中文）
├── NODE_REGISTRY_CONFIG.md    # 节点注册表详细说明
├── behavior_trees/            # 行为树 XML 文件目录（示例）
│   ├── navigate.xml           # 导航示例
│   ├── patrol.xml             # 巡逻示例
│   ├── pick_and_place.xml     # 抓取放置示例
│   └── auto_charge.xml        # 自动充电示例
├── templates/                 # Web 界面模板
│   ├── index.html
│   ├── css/
│   └── js/
└── .gitignore                 # Git 忽略文件
```

---

## 示例配置

本项目包含常见的行为树示例配置，用于快速体验工具功能：

### 行为树示例

| 文件 | 说明 |
|------|------|
| `navigate.xml` | 导航到目标点 |
| `patrol.xml` | 巡逻任务 |
| `pick_and_place.xml` | 抓取和放置操作 |
| `auto_charge.xml` | 自动充电 |

### 节点注册表

[node_registry.json](node_registry.json) 包含常用的节点定义：

- 控制节点: Sequence, Fallback, Parallel, ReactiveSequence 等
- 条件节点: CheckBattery, CheckObstacle, CheckLocation, CheckGripperState 等
- 动作节点: NavigateToTarget, MoveToPose, GripperControl, SetLED 等

---

## 开源协议

本项目采用 MIT 开源协议。

MIT 协议是最宽松的开源协议之一，允许您：
- 商业使用
- 修改代码
- 分发代码
- 私有使用

唯一要求是在副本中保留版权声明和许可声明。

详情请查看 [LICENSE](LICENSE) 文件。

---

## 贡献

欢迎提交 Issue 和 Pull Request！

---

## 联系方式

如有问题或建议，请联系：

- 邮箱: barbaricgrowthrobo@163.com
- GitHub Issues: 欢迎提交 Issue 和 Pull Request

---

## 致谢

- [BehaviorTree.CPP](https://www.behaviortree.dev/) - 行为树框架参考
- [Flask](https://flask.palletsprojects.com/) - Web 框架

---

**Happy Coding!**