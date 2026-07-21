# 节点注册表配置说明

## 概述

行为树管理工具现在使用外部 JSON 配置文件来定义节点类型，而不是硬编码在 Python 代码中。这使得切换到不同项目时，只需修改配置文件即可。

## 配置文件格式

### 基本结构

```json
{
  "version": "1.0",
  "project_name": "your_project_name",
  "description": "项目描述",
  "nodes": {
    "节点名称": {
      "type": "节点类型",
      "ports": [],
      "description": "节点描述"
    }
  }
}
```

### 节点类型 (type)

- `control`: 控制节点（如 Sequence, Fallback, Parallel 等）
- `condition`: 条件节点（如 CheckArmPose, CheckGripperState 等）
- `action`: 动作节点（如 MoveToPose, GripperControl 等）

### 端口参数 (ports)

端口参数定义节点的输入/输出参数：

```json
{
  "name": "参数名",
  "type": "参数类型",
  "default": "默认值"
}
```

参数类型可以是：
- `string`: 字符串
- `int`: 整数
- `float`: 浮点数
- `bool`: 布尔值

### 示例

#### 控制节点（无参数）

```json
"Sequence": {
  "type": "control",
  "ports": [],
  "description": "顺序执行子节点"
}
```

#### 控制节点（有参数）

```json
"Parallel": {
  "type": "control",
  "ports": [
    {"name": "threshold", "type": "int", "default": "-1"}
  ],
  "description": "并行执行子节点"
}
```

#### 条件节点

```json
"CheckGripperState": {
  "type": "condition",
  "ports": [
    {"name": "state", "type": "string", "default": "closed"}
  ],
  "description": "检查夹爪状态"
}
```

#### 动作节点

```json
"MoveToPose": {
  "type": "action",
  "ports": [
    {"name": "target_pose", "type": "string", "default": ""},
    {"name": "speed", "type": "string", "default": "5"},
    {"name": "wait_time", "type": "string", "default": "30"}
  ],
  "description": "移动到目标位姿"
}
```

## 配置文件加载规则

1. **默认加载**: 程序启动时自动加载 `node_registry.json`
2. **目录加载**: 可以指定一个目录，程序会加载该目录下所有 `.json` 文件
3. **合并规则**: 多个配置文件会合并，后加载的配置会覆盖同名节点

## 切换项目

### 方法一：修改默认配置文件

直接编辑 `node_registry.json` 文件，替换为新项目的节点定义。

### 方法二：创建新的配置文件

1. 在工具目录下创建新的 JSON 文件，如 `my_project_nodes.json`
2. 按照上述格式定义节点
3. 程序启动时会自动加载所有 `.json` 配置文件

### 方法三：通过 API 动态加载

使用 `/api/node_registry/load_directory` API 从指定目录加载配置：

```bash
curl -X POST http://localhost:5000/api/node_registry/load_directory \
  -H "Content-Type: application/json" \
  -d '{"directory": "/path/to/config/dir"}'
```

## API 接口

### 获取节点注册表

```
GET /api/node_registry
```

返回当前加载的所有节点定义。

### 重新加载配置

```
POST /api/node_registry/reload
```

重新加载已加载的配置文件。

### 获取配置文件列表

```
GET /api/node_registry/config_files
```

返回当前加载的配置文件路径列表。

### 添加节点

```
POST /api/node_registry/add
```

请求体：
```json
{
  "name": "MyNode",
  "type": "action",
  "description": "我的自定义节点",
  "ports": [
    {"name": "param1", "type": "string", "default": "value1"}
  ]
}
```

### 移除节点

```
POST /api/node_registry/remove
```

请求体：
```json
{
  "name": "MyNode"
}
```

### 导出配置

```
POST /api/node_registry/export
```

请求体：
```json
{
  "filepath": "/path/to/output.json",
  "metadata": {
    "version": "1.0",
    "project_name": "my_project",
    "description": "项目描述"
  }
}
```

### 从目录加载

```
POST /api/node_registry/load_directory
```

请求体：
```json
{
  "directory": "/path/to/config/dir"
}
```

## 快速开始

### 为新项目创建配置

1. 复制 `node_registry.json` 为 `my_project_nodes.json`
2. 编辑文件，修改 `project_name` 和 `description`
3. 在 `nodes` 对象中定义你的节点
4. 重启程序或通过 API 重新加载

### 最小配置示例

```json
{
  "version": "1.0",
  "project_name": "minimal",
  "description": "最小配置",
  "nodes": {
    "Sequence": {
      "type": "control",
      "ports": [],
      "description": "顺序执行"
    },
    "Fallback": {
      "type": "control",
      "ports": [],
      "description": "回退节点"
    },
    "MyAction": {
      "type": "action",
      "ports": [],
      "description": "我的动作"
    }
  }
}
```

## 注意事项

1. 配置文件必须是有效的 JSON 格式
2. 节点名称必须唯一
3. `type` 字段必须是 `control`、`condition` 或 `action` 之一
4. 前端会根据节点类型自动显示不同的颜色和图标
5. 修改配置文件后需要重新加载才能生效