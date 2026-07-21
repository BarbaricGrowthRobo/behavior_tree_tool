# Behavior Tree Visual Management Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-lightgrey.svg)](https://flask.palletsprojects.com/)

A visual behavior tree editor and management tool based on Flask + Frontend, supporting loading, editing, and saving BehaviorTree XML files.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Example Configs](#example-configs)
- [License](#license)

---

## Features

- Visual Editing: Intuitively view and edit behavior tree structures via Web interface
- XML Support: Fully compatible with BehaviorTree.CPP format XML files
- Node Registry: Flexibly define node types through JSON configuration files
- Add/Delete Nodes: Support dynamic adding and deleting nodes
- Save/Load: Real-time save editing results to XML files
- Beautiful UI: Modern frontend visualization interface

---

## Requirements

- Python 3.8+
- Flask 2.0+
- Modern browsers (Chrome, Firefox, Edge, Safari)

---

## Quick Start

### 1. Install Dependencies

```bash
cd behavior_tree_tool
pip install flask
```

### 2. Run the Tool

**Linux/macOS:**
```bash
chmod +x run.sh
./run.sh
```

**Windows:**
```bash
python bt_manager.py
```

### 3. Access the Interface

Open browser and visit:
```
http://localhost:5000
```

---

## Usage Guide

### 1. Load Behavior Tree
- After starting the tool, the system will automatically load all XML files in the `behavior_trees/` directory
- Select the behavior tree file to edit from the left file list

### 2. View Behavior Tree
- Behavior trees are displayed in a tree structure in the center of the page
- Click on a node to view and edit its parameters

### 3. Edit Nodes
- **Modify Parameters**: Click on a node and modify parameter values in the right panel
- **Add Child Node**: Select a parent node, then click the "Add Child Node" button
- **Delete Node**: Select a node, then click the "Delete Node" button

### 4. Save Changes
- Click the "Save" button to save changes to the XML file
- Supports saving as a new file

### 5. Create New Behavior Tree
- Click the "New Behavior Tree" button
- Enter the behavior tree ID and root node name
- Start adding nodes to build the behavior tree

---

## Configuration

### Node Registry

The node registry configuration file is located at `node_registry.json`, which defines all available node types and their parameters.

#### Configuration Format

```json
{
  "version": "1.0",
  "project_name": "your_project_name",
  "description": "Project Description",
  "nodes": {
    "NodeName": {
      "type": "node_type",
      "ports": [
        {
          "name": "param_name",
          "type": "param_type",
          "default": "default_value"
        }
      ],
      "description": "Node description"
    }
  }
}
```

#### Node Types

| Type | Description |
|------|-------------|
| `control` | Control nodes (Sequence, Fallback, etc.) |
| `condition` | Condition nodes (check status, etc.) |
| `action` | Action nodes (execute operations, etc.) |

### Switch Project Configuration

When switching to different projects, simply modify the `node_registry.json` file.

---

## Project Structure

```
behavior_tree_tool/
├── bt_manager.py              # Main program
├── node_registry_loader.py    # Node registry loader
├── node_registry.json         # Node registry configuration (example)
├── run.sh                     # Startup script
├── LICENSE                    # MIT License
├── README.md                  # Documentation (English)
├── README_CN.md               # Documentation (Chinese)
├── README_EN.md               # Documentation (English)
├── NODE_REGISTRY_CONFIG.md    # Node registry detailed documentation
├── behavior_trees/            # Behavior tree XML files directory (examples)
│   ├── navigate.xml           # Navigation example
│   ├── patrol.xml             # Patrol example
│   ├── pick_and_place.xml     # Pick and place example
│   └── auto_charge.xml        # Auto charge example
├── templates/                 # Web interface templates
│   ├── index.html
│   ├── css/
│   └── js/
└── .gitignore                 # Git ignore file
```

---

## Example Configs

This project includes common behavior tree example configurations for quickly experiencing the tool's features:

### Behavior Tree Examples

| File | Description |
|------|-------------|
| `navigate.xml` | Navigate to target |
| `patrol.xml` | Patrol mission |
| `pick_and_place.xml` | Pick and place operation |
| `auto_charge.xml` | Auto charging |

### Node Registry

[node_registry.json](node_registry.json) contains commonly used node definitions:

- **Control Nodes**: Sequence, Fallback, Parallel, ReactiveSequence, etc.
- **Condition Nodes**: CheckBattery, CheckObstacle, CheckLocation, CheckGripperState, etc.
- **Action Nodes**: NavigateToTarget, MoveToPose, GripperControl, SetLED, etc.

---

## License

This project is licensed under the **MIT License**.

The MIT License is one of the most permissive open source licenses, allowing you to:
- Commercial use
- Modify the code
- Distribute the code
- Private use

The only requirement is to retain the copyright notice and permission notice in copies.

For details, please see the [LICENSE](LICENSE) file.

---

## Contributing

Feel free to submit Issues and Pull Requests!

---

## Contact

For questions or suggestions, please contact:

- **Email**: barbaricgrowthrobo@163.com
- **GitHub Issues**: Feel free to submit Issues and Pull Requests

---

## Acknowledgments

- [BehaviorTree.CPP](https://www.behaviortree.dev/) - Behavior tree framework reference
- [Flask](https://flask.palletsprojects.com/) - Web framework

---

**Happy Coding!**