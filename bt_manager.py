#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Behavior Tree XML 可视化管理工具
基于 Flask + 前端可视化，支持：
1. 加载/展示现有行为树 XML
2. 可视化编辑节点及参数
3. 添加/删除节点
4. 保存/更新 XML 文件
"""

import os
import re
import json
import xml.etree.ElementTree as ET
from flask import Flask, render_template, request, jsonify
from node_registry_loader import NodeRegistryLoader

app = Flask(__name__, 
            static_folder=os.path.join(os.path.dirname(__file__), 'templates'),
            static_url_path='/static')

# 行为树 XML 文件目录（全局变量，可动态修改）
BT_DIR = os.path.join(os.path.dirname(__file__), '..', 'behavior_trees')
BT_DIR = os.path.abspath(BT_DIR)

# 节点注册表配置目录
CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))

# 初始化节点注册表加载器
registry_loader = NodeRegistryLoader(CONFIG_DIR)
NODE_REGISTRY = registry_loader.load_default()


def parse_xml_to_tree(filepath):
    """将 XML 文件解析为树形 JSON 结构"""
    tree = ET.parse(filepath)
    root = tree.getroot()

    btpp_format = root.get('BTCPP_format', '3')
    main_tree = root.get('main_tree_to_execute', '')

    bt_elem = root.find('BehaviorTree')
    if bt_elem is None:
        return None

    bt_id = bt_elem.get('ID', '')

    def parse_element(elem, parent_path=""):
        node = {
            "tag": elem.tag,
            "name": elem.get('name', ''),
            "ports": {},
            "children": [],
            "path": parent_path
        }

        for key, value in elem.attrib.items():
            if key != 'name':
                node["ports"][key] = value

        for child in elem:
            if child.tag not in ['BehaviorTree']:
                child_path = f"{parent_path}/{child.tag}" if parent_path else child.tag
                node["children"].append(parse_element(child, child_path))

        return node

    children = []
    for i, child in enumerate(bt_elem):
        child_path = f"root/{bt_id}/{child.tag}"
        children.append(parse_element(child, child_path))

    return {
        "btpp_format": btpp_format,
        "main_tree_to_execute": main_tree,
        "id": bt_id,
        "filename": os.path.basename(filepath),
        "filepath": filepath,
        "root": {
            "tag": "BehaviorTree",
            "name": bt_id,
            "ports": {},
            "children": children,
            "path": f"root/{bt_id}"
        }
    }


def tree_to_xml(tree_data):
    """将树形 JSON 结构转换为 XML 字符串"""
    def build_xml(element_data, parent):
        tag = element_data["tag"]
        attrib = {}
        if element_data.get("name"):
            attrib["name"] = element_data["name"]
        for key, value in element_data.get("ports", {}).items():
            attrib[key] = value

        elem = ET.SubElement(parent, tag, attrib)

        for child in element_data.get("children", []):
            build_xml(child, elem)

    root_attrib = {
        "BTCPP_format": tree_data.get("btpp_format", "3"),
        "main_tree_to_execute": tree_data.get("main_tree_to_execute", "")
    }
    root_elem = ET.Element("root", root_attrib)

    bt_attrib = {"ID": tree_data["id"]}
    bt_elem = ET.SubElement(root_elem, "BehaviorTree", bt_attrib)

    for child in tree_data["root"]["children"]:
        build_xml(child, bt_elem)

    # Python 3.8 兼容：手动缩进
    def indent_xml(elem, level=0):
        indent = "\n" + "    " * level
        if len(elem):
            if not elem.text or not elem.text.strip():
                elem.text = indent + "    "
            if not elem.tail or not elem.tail.strip():
                elem.tail = indent
            for i, child in enumerate(elem):
                indent_xml(child, level + 1)
                if not child.tail or not child.tail.strip():
                    child.tail = indent + "    " if i < len(elem) - 1 else indent
            if not elem[-1].tail or not elem[-1].tail.strip():
                elem[-1].tail = indent
        else:
            if level and (not elem.tail or not elem.tail.strip()):
                elem.tail = indent

    indent_xml(root_elem)
    return ET.tostring(root_elem, encoding="unicode", xml_declaration=True)


def get_available_xml():
    """获取所有可用的 XML 文件列表"""
    xml_files = []
    if os.path.exists(BT_DIR):
        for f in sorted(os.listdir(BT_DIR)):
            if f.endswith('.xml'):
                xml_files.append({
                    "filename": f,
                    "filepath": os.path.join(BT_DIR, f)
                })
    return xml_files


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/xml_files', methods=['GET'])
def api_xml_files():
    return jsonify({"files": get_available_xml()})


@app.route('/api/load_xml', methods=['POST'])
def api_load_xml():
    data = request.json
    filepath = data.get('filepath')
    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "文件不存在"}), 400

    tree_data = parse_xml_to_tree(filepath)
    if tree_data is None:
        return jsonify({"error": "解析 XML 失败"}), 400

    return jsonify(tree_data)


@app.route('/api/save_xml', methods=['POST'])
def api_save_xml():
    data = request.json
    filepath = data.get('filepath')
    tree_data = data.get('tree_data')

    if not filepath or not tree_data:
        return jsonify({"error": "缺少必要参数"}), 400

    try:
        xml_content = tree_to_xml(tree_data)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        return jsonify({"success": True, "message": "保存成功"})
    except Exception as e:
        return jsonify({"error": f"保存失败: {str(e)}"}), 500


@app.route('/api/get_xml_content', methods=['POST'])
def api_get_xml_content():
    data = request.json
    filepath = data.get('filepath')
    if not filepath:
        return jsonify({"error": "缺少文件路径"}), 400
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({"success": True, "content": content})
    except Exception as e:
        return jsonify({"error": f"读取失败: {str(e)}"}), 500


@app.route('/api/node_registry', methods=['GET'])
def api_node_registry():
    return jsonify(NODE_REGISTRY)


@app.route('/api/create_xml', methods=['POST'])
def api_create_xml():
    data = request.json
    filename = data.get('filename', 'new_tree.xml')
    bt_id = data.get('bt_id', 'NEW_TREE')

    if not filename.endswith('.xml'):
        filename += '.xml'

    filepath = os.path.join(BT_DIR, filename)

    tree_data = {
        "btpp_format": "3",
        "main_tree_to_execute": bt_id,
        "id": bt_id,
        "filename": filename,
        "filepath": filepath,
        "root": {
            "tag": "BehaviorTree",
            "name": bt_id,
            "ports": {},
            "children": [],
            "path": "0"
        }
    }

    try:
        xml_content = tree_to_xml(tree_data)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(xml_content)
        return jsonify({"success": True, "message": "创建成功", "filepath": filepath})
    except Exception as e:
        return jsonify({"error": f"创建失败: {str(e)}"}), 500


@app.route('/api/delete_file', methods=['POST'])
def api_delete_file():
    data = request.json
    filepath = data.get('filepath')
    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "文件不存在"}), 400

    try:
        os.remove(filepath)
        return jsonify({"success": True, "message": "删除成功"})
    except Exception as e:
        return jsonify({"error": f"删除失败: {str(e)}"}), 500


@app.route('/api/load_directory', methods=['POST'])
def api_load_directory():
    """加载用户指定的行为树文件夹"""
    global BT_DIR
    data = request.json
    dir_path = data.get('directory', '').strip()
    
    if not dir_path:
        return jsonify({"error": "请提供文件夹路径"}), 400
    
    # 验证目录是否存在
    if not os.path.isdir(dir_path):
        return jsonify({"error": f"目录不存在: {dir_path}"}), 400
    
    # 更新全局BT_DIR
    BT_DIR = os.path.abspath(dir_path)
    
    return jsonify({
        "success": True, 
        "message": "目录加载成功",
        "directory": BT_DIR
    })


@app.route('/api/current_directory', methods=['GET'])
def api_current_directory():
    """返回当前行为树目录"""
    return jsonify({"directory": BT_DIR})


@app.route('/api/node_registry/reload', methods=['POST'])
def api_reload_registry():
    """重新加载节点注册表配置"""
    global NODE_REGISTRY
    try:
        NODE_REGISTRY = registry_loader.reload()
        return jsonify({
            "success": True,
            "message": "重新加载成功",
            "node_count": len(NODE_REGISTRY),
            "config_files": registry_loader.config_files
        })
    except Exception as e:
        return jsonify({"error": f"重新加载失败: {str(e)}"}), 500


@app.route('/api/node_registry/config_files', methods=['GET'])
def api_get_config_files():
    """获取当前加载的配置文件列表"""
    return jsonify({
        "config_files": registry_loader.config_files,
        "node_count": len(NODE_REGISTRY)
    })


@app.route('/api/node_registry/add', methods=['POST'])
def api_add_node():
    """动态添加节点定义"""
    data = request.json
    name = data.get('name')
    node_type = data.get('type')
    description = data.get('description', '')
    ports = data.get('ports', [])
    
    if not name or not node_type:
        return jsonify({"error": "缺少必要参数: name, type"}), 400
    
    if node_type not in ['control', 'condition', 'action']:
        return jsonify({"error": "无效的节点类型，必须是 control, condition 或 action"}), 400
    
    node_def = {
        "type": node_type,
        "ports": ports,
        "description": description
    }
    
    registry_loader.add_node(name, node_def)
    global NODE_REGISTRY
    NODE_REGISTRY = registry_loader.get_registry()
    
    return jsonify({
        "success": True,
        "message": f"节点 {name} 已添加",
        "node": node_def
    })


@app.route('/api/node_registry/remove', methods=['POST'])
def api_remove_node():
    """移除节点定义"""
    data = request.json
    name = data.get('name')
    
    if not name:
        return jsonify({"error": "缺少节点名称"}), 400
    
    if registry_loader.remove_node(name):
        global NODE_REGISTRY
        NODE_REGISTRY = registry_loader.get_registry()
        return jsonify({"success": True, "message": f"节点 {name} 已移除"})
    else:
        return jsonify({"error": f"节点 {name} 不存在"}), 404


@app.route('/api/node_registry/export', methods=['POST'])
def api_export_registry():
    """导出当前节点注册表到文件"""
    data = request.json
    filepath = data.get('filepath')
    metadata = data.get('metadata', {})
    
    if not filepath:
        return jsonify({"error": "缺少文件路径"}), 400
    
    try:
        registry_loader.export_to_file(filepath, metadata)
        return jsonify({
            "success": True,
            "message": f"已导出到 {filepath}",
            "filepath": filepath
        })
    except Exception as e:
        return jsonify({"error": f"导出失败: {str(e)}"}), 500


@app.route('/api/node_registry/load_directory', methods=['POST'])
def api_load_registry_directory():
    """从目录加载所有节点注册表配置"""
    global NODE_REGISTRY
    data = request.json
    dir_path = data.get('directory', CONFIG_DIR)
    
    if not os.path.isdir(dir_path):
        return jsonify({"error": f"目录不存在: {dir_path}"}), 400
    
    try:
        NODE_REGISTRY = registry_loader.load_from_directory(dir_path)
        return jsonify({
            "success": True,
            "message": f"已从 {dir_path} 加载 {len(NODE_REGISTRY)} 个节点",
            "node_count": len(NODE_REGISTRY),
            "config_files": registry_loader.config_files
        })
    except Exception as e:
        return jsonify({"error": f"加载失败: {str(e)}"}), 500


if __name__ == '__main__':
    print(f"Behavior Tree Manager 启动中...")
    print(f"XML 目录: {BT_DIR}")
    print(f"节点配置目录: {CONFIG_DIR}")
    print(f"已加载 {len(NODE_REGISTRY)} 个节点类型")
    app.run(host='0.0.0.0', port=5000, debug=True)