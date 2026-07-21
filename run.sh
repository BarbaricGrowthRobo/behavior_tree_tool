#!/bin/bash
# 启动 Behavior Tree 可视化管理工具

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "  Behavior Tree 可视化管理工具"
echo "========================================="
echo ""

# 检查 Flask 是否安装
if ! python3 -c "import flask" 2>/dev/null; then
    echo "正在安装 Flask..."
    pip3 install flask
    echo ""
fi

echo "启动服务器..."
echo "访问地址: http://localhost:5000"
echo ""

cd "$SCRIPT_DIR"
python3 bt_manager.py