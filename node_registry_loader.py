#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
节点注册表配置加载器
支持从 JSON 配置文件加载行为树节点定义
"""

import json
import os
from typing import Dict, Any


class NodeRegistryLoader:
    """节点注册表加载器"""
    
    def __init__(self, config_dir: str = None):
        """
        初始化加载器
        
        Args:
            config_dir: 配置文件目录，默认为当前文件所在目录
        """
        if config_dir is None:
            config_dir = os.path.dirname(os.path.abspath(__file__))
        self.config_dir = config_dir
        self.registry: Dict[str, Any] = {}
        self.config_files: list = []
    
    def load_from_file(self, filepath: str) -> Dict[str, Any]:
        """
        从单个 JSON 文件加载节点注册表
        
        Args:
            filepath: JSON 配置文件路径
            
        Returns:
            节点注册表字典
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"配置文件不存在: {filepath}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        nodes = config.get('nodes', {})
        return nodes
    
    def load_default(self) -> Dict[str, Any]:
        """
        加载默认配置文件 (node_registry.json)
        
        Returns:
            节点注册表字典
        """
        default_file = os.path.join(self.config_dir, 'node_registry.json')
        if os.path.exists(default_file):
            self.config_files = [default_file]
            self.registry = self.load_from_file(default_file)
            return self.registry
        return {}
    
    def load_from_directory(self, dir_path: str) -> Dict[str, Any]:
        """
        从目录加载所有 JSON 配置文件并合并
        
        加载规则：
        1. 扫描目录下所有 .json 文件
        2. 按文件名排序依次加载
        3. 后加载的配置会覆盖先加载的同名节点
        
        Args:
            dir_path: 配置文件目录路径
            
        Returns:
            合并后的节点注册表字典
        """
        if not os.path.isdir(dir_path):
            raise NotADirectoryError(f"目录不存在: {dir_path}")
        
        merged_registry = {}
        json_files = sorted([
            f for f in os.listdir(dir_path) 
            if f.endswith('.json')
        ])
        
        for filename in json_files:
            filepath = os.path.join(dir_path, filename)
            try:
                nodes = self.load_from_file(filepath)
                merged_registry.update(nodes)
                self.config_files.append(filepath)
            except Exception as e:
                print(f"警告: 加载 {filepath} 失败: {e}")
        
        self.registry = merged_registry
        return self.registry
    
    def get_registry(self) -> Dict[str, Any]:
        """获取当前加载的节点注册表"""
        return self.registry
    
    def reload(self) -> Dict[str, Any]:
        """重新加载所有已加载的配置文件"""
        if self.config_files:
            merged = {}
            for filepath in self.config_files:
                try:
                    nodes = self.load_from_file(filepath)
                    merged.update(nodes)
                except Exception as e:
                    print(f"警告: 重新加载 {filepath} 失败: {e}")
            self.registry = merged
        return self.registry
    
    def add_node(self, name: str, node_def: Dict[str, Any]):
        """
        动态添加节点定义
        
        Args:
            name: 节点名称
            node_def: 节点定义字典，包含 type, ports, description
        """
        self.registry[name] = node_def
    
    def remove_node(self, name: str) -> bool:
        """
        移除节点定义
        
        Args:
            name: 节点名称
            
        Returns:
            是否成功移除
        """
        if name in self.registry:
            del self.registry[name]
            return True
        return False
    
    def get_node_info(self, name: str) -> Dict[str, Any]:
        """
        获取单个节点的定义信息
        
        Args:
            name: 节点名称
            
        Returns:
            节点定义字典，如果不存在返回空字典
        """
        return self.registry.get(name, {})
    
    def get_nodes_by_type(self, node_type: str) -> Dict[str, Any]:
        """
        获取指定类型的所有节点
        
        Args:
            node_type: 节点类型 (control, condition, action)
            
        Returns:
            该类型的所有节点定义
        """
        return {
            name: info for name, info in self.registry.items()
            if info.get('type') == node_type
        }
    
    def export_to_file(self, filepath: str, metadata: Dict[str, Any] = None):
        """
        将当前注册表导出到 JSON 文件
        
        Args:
            filepath: 输出文件路径
            metadata: 元数据 (version, project_name, description)
        """
        export_data = {
            "version": metadata.get("version", "1.0") if metadata else "1.0",
            "project_name": metadata.get("project_name", "unknown") if metadata else "unknown",
            "description": metadata.get("description", "") if metadata else "",
            "nodes": self.registry
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)


def create_default_registry(filepath: str):
    """
    创建默认的节点注册表配置文件
    
    Args:
        filepath: 输出文件路径
    """
    default_registry = {
        "version": "1.0",
        "project_name": "default",
        "description": "默认行为树节点注册表",
        "nodes": {
            "Sequence": {
                "type": "control",
                "ports": [],
                "description": "顺序执行子节点"
            },
            "Fallback": {
                "type": "control",
                "ports": [],
                "description": "回退节点（类似OR）"
            },
            "Parallel": {
                "type": "control",
                "ports": [
                    {"name": "threshold", "type": "int", "default": "-1"}
                ],
                "description": "并行执行子节点"
            },
            "ReactiveSequence": {
                "type": "control",
                "ports": [],
                "description": "响应式序列"
            },
            "ReactiveFallback": {
                "type": "control",
                "ports": [],
                "description": "响应式回退"
            },
            "RetryUntilSuccessful": {
                "type": "control",
                "ports": [
                    {"name": "num_attempts", "type": "string", "default": "1"}
                ],
                "description": "重试直到成功"
            },
            "Repeat": {
                "type": "control",
                "ports": [
                    {"name": "num_cycles", "type": "int", "default": "1"}
                ],
                "description": "重复执行"
            },
            "Inverter": {
                "type": "control",
                "ports": [],
                "description": "取反节点"
            },
            "ForceSuccess": {
                "type": "control",
                "ports": [],
                "description": "强制成功"
            },
            "ForceFailure": {
                "type": "control",
                "ports": [],
                "description": "强制失败"
            },
            "Delay": {
                "type": "control",
                "ports": [
                    {"name": "delay_msec", "type": "int", "default": "0"}
                ],
                "description": "延迟执行"
            },
            "Wait": {
                "type": "action",
                "ports": [
                    {"name": "duration", "type": "string", "default": "1.0"}
                ],
                "description": "等待指定时间"
            }
        }
    }
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(default_registry, f, ensure_ascii=False, indent=2)