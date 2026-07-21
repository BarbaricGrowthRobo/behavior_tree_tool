let currentTree = null;
let selectedNodePath = null;
let nodeRegistry = {};
let collapsedPaths = new Set();
let dragSourcePath = null;

const NODE_MIN_WIDTH = 180;
const NODE_MAX_WIDTH = 320;
const NODE_HEIGHT = 80;
const HORIZONTAL_GAP = 30;
const VERTICAL_GAP = 60;

let panX = 0;
let panY = 0;
let zoomLevel = 1;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

const COLLAPSIBLE_TYPES = ['control'];

document.addEventListener('DOMContentLoaded', () => {
    loadCurrentDirectory();
    loadAllFiles();
    loadNodeRegistry();
    setupPanZoom();
});

async function loadCurrentDirectory() {
    try {
        const res = await fetch('/api/current_directory');
        const data = await res.json();
        if (data.directory) {
            document.getElementById('btDirInput').value = data.directory;
        }
    } catch (e) {
        console.error('加载当前目录失败');
    }
}

function setupPanZoom() {
    const container = document.getElementById('treeContainer');
    const viewport = document.getElementById('treeViewport');
    
    container.addEventListener('mousedown', (e) => {
        if (e.target === container || e.target.classList.contains('tree-viewport') || 
            e.target === document.getElementById('treeSvg') || e.target === document.getElementById('treeContent')) {
            isPanning = true;
            panStartX = e.clientX - panX;
            panStartY = e.clientY - panY;
            container.style.cursor = 'grabbing';
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        panX = e.clientX - panStartX;
        panY = e.clientY - panStartY;
        updateTransform();
    });
    
    document.addEventListener('mouseup', () => {
        isPanning = false;
        container.style.cursor = '';
    });
    
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoomLevel = Math.max(0.2, Math.min(3, zoomLevel * delta));
        updateTransform();
    }, { passive: false });
}

function updateTransform() {
    const viewport = document.getElementById('treeViewport');
    viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

function zoomIn() {
    zoomLevel = Math.min(3, zoomLevel * 1.2);
    updateTransform();
}

function zoomOut() {
    zoomLevel = Math.max(0.2, zoomLevel / 1.2);
    updateTransform();
}

function resetZoom() {
    panX = 0;
    panY = 0;
    zoomLevel = 1;
    updateTransform();
}

async function loadBtDirectory() {
    const dirPath = document.getElementById('btDirInput').value.trim();
    if (!dirPath) {
        showToast('请输入文件夹路径', 'error');
        return;
    }
    try {
        const res = await fetch('/api/load_directory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ directory: dirPath })
        });
        const data = await res.json();
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }
        // 更新输入框显示当前目录
        document.getElementById('btDirInput').value = data.directory || dirPath;
        // 重新加载文件列表
        loadAllFiles();
        // 清空当前树
        currentTree = null;
        selectedNodePath = null;
        document.getElementById('toolbar').style.display = 'none';
        document.getElementById('treeContent').innerHTML = '<div class="empty-state"><p>选择左侧行为树文件开始编辑</p></div>';
        document.getElementById('treeSvg').innerHTML = '';
        showToast(`已加载目录: ${data.directory}`, 'success');
    } catch (e) {
        showToast('加载目录失败', 'error');
    }
}

async function loadAllFiles() {
    try {
        const res = await fetch('/api/xml_files');
        const data = await res.json();
        const list = document.getElementById('fileList');
        list.innerHTML = '';
        data.files.forEach(f => {
            const li = document.createElement('li');
            li.className = 'file-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.textContent = f.filename;
            nameSpan.onclick = () => loadTree(f.filepath, li);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'file-delete-btn';
            deleteBtn.textContent = '✕';
            deleteBtn.title = '删除文件';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteFile(f.filepath, li);
            };
            
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            list.appendChild(li);
        });
    } catch (e) {
        showToast('加载文件列表失败', 'error');
    }
}

async function deleteFile(filepath, liElement) {
    if (!confirm(`确定要删除文件 "${filepath.split('/').pop()}" 吗？此操作不可撤销。`)) return;
    try {
        const res = await fetch('/api/delete_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filepath })
        });
        const data = await res.json();
        if (data.error) { showToast(data.error, 'error'); return; }
        
        // 如果删除的是当前打开的文件，清空编辑区
        if (currentTree && currentTree.filepath === filepath) {
            currentTree = null;
            selectedNodePath = null;
            document.getElementById('toolbar').style.display = 'none';
            document.getElementById('treeContent').innerHTML = '<div class="empty-state"><p>选择左侧行为树文件开始编辑</p></div>';
            document.getElementById('treeSvg').innerHTML = '';
        }
        
        liElement.remove();
        showToast('文件已删除', 'success');
    } catch (e) {
        showToast('删除失败', 'error');
    }
}

async function loadNodeRegistry() {
    try {
        const res = await fetch('/api/node_registry');
        nodeRegistry = await res.json();
        populateNodeTypeSelect();
    } catch (e) {
        console.error('加载节点注册表失败');
    }
}

function populateNodeTypeSelect() {
    const select = document.getElementById('nodeTypeSelect');
    select.innerHTML = '<option value="">-- 选择节点类型 --</option>';
    const groups = { control: [], condition: [], action: [] };
    Object.entries(nodeRegistry).forEach(([name, info]) => {
        if (groups[info.type]) groups[info.type].push(name);
    });
    Object.entries(groups).forEach(([type, nodes]) => {
        if (nodes.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = type === 'control' ? '控制节点' : type === 'condition' ? '条件节点' : '动作节点';
            nodes.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
        }
    });
}

async function loadTree(filepath, liElement) {
    document.querySelectorAll('.file-list li').forEach(li => li.classList.remove('active'));
    if (liElement) liElement.classList.add('active');
    try {
        const res = await fetch('/api/load_xml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filepath })
        });
        const data = await res.json();
        if (data.error) { showToast(data.error, 'error'); return; }
        currentTree = data;
        selectedNodePath = null;
        collapsedPaths.clear();
        // 确保所有节点路径唯一
        reindexPaths(currentTree.root);
        document.getElementById('toolbar').style.display = 'flex';
        renderTree();
        showToast(`已加载: ${data.filename}`, 'success');
    } catch (e) {
        showToast('加载失败', 'error');
    }
}

function calculateNodeWidth(node) {
    const regInfo = nodeRegistry[node.tag] || { type: 'unknown', description: '' };
    const name = node.name || node.tag;
    const desc = regInfo.description || node.tag;
    
    // 估算文本宽度（每个中文字符约14px，英文字符约8px）
    const nameWidth = getTextWidth(name);
    const descWidth = getTextWidth(desc);
    const minWidth = Math.max(nameWidth, descWidth) + 80; // 加上图标和边距
    
    return Math.max(NODE_MIN_WIDTH, Math.min(NODE_MAX_WIDTH, minWidth));
}

function getTextWidth(text) {
    let width = 0;
    for (const char of text) {
        // 中文字符
        if (/[\u4e00-\u9fa5]/.test(char)) {
            width += 14;
        } else {
            width += 8;
        }
    }
    return width;
}

function calculateSubtreeWidth(node) {
    const isCollapsed = collapsedPaths.has(node.path);
    const nodeWidth = calculateNodeWidth(node);
    
    if (!node.children || node.children.length === 0 || isCollapsed) {
        return nodeWidth;
    }
    
    const childrenWidth = node.children.reduce((sum, child) => {
        return sum + calculateSubtreeWidth(child);
    }, 0) + (node.children.length - 1) * HORIZONTAL_GAP;
    
    return Math.max(nodeWidth, childrenWidth);
}

function calculateTreeLayout(node, depth = 0, centerX = 0) {
    const isCollapsed = collapsedPaths.has(node.path);
    const regInfo = nodeRegistry[node.tag] || { type: 'unknown' };
    const isCollapsible = regInfo.type === 'control' && node.children && node.children.length > 0;
    
    const nodeWidth = calculateNodeWidth(node);
    
    node.layout = {
        depth: depth,
        width: nodeWidth,
        height: NODE_HEIGHT,
        x: centerX,
        y: depth * (NODE_HEIGHT + VERTICAL_GAP)
    };

    if (!isCollapsed && node.children && node.children.length > 0) {
        // 计算所有子节点的总宽度
        const childrenWidths = node.children.map(child => calculateSubtreeWidth(child));
        const totalChildrenWidth = childrenWidths.reduce((sum, w) => sum + w, 0) + 
                                   (node.children.length - 1) * HORIZONTAL_GAP;
        
        // 更新父节点宽度以包含所有子节点
        node.layout.width = Math.max(nodeWidth, totalChildrenWidth);
        
        // 计算第一个子节点的起始位置
        let currentX = centerX - totalChildrenWidth / 2;
        
        node.children.forEach((child, i) => {
            const childCenterX = currentX + childrenWidths[i] / 2;
            calculateTreeLayout(child, depth + 1, childCenterX);
            currentX += childrenWidths[i] + HORIZONTAL_GAP;
        });
    }

    return node.layout;
}

function renderTree() {
    const content = document.getElementById('treeContent');
    const svg = document.getElementById('treeSvg');
    const container = document.getElementById('treeContainer');
    
    if (!currentTree) {
        content.innerHTML = '<div class="empty-state"><p>选择左侧行为树文件开始编辑</p></div>';
        svg.innerHTML = '';
        return;
    }

    content.innerHTML = '';
    svg.innerHTML = '';

    // 计算画布尺寸
    const rootWidth = calculateSubtreeWidth(currentTree.root);
    const maxDepth = getMaxDepth(currentTree.root);
    const totalWidth = Math.max(rootWidth + 200, 800);
    const totalHeight = (maxDepth + 1) * (NODE_HEIGHT + VERTICAL_GAP) + 100;

    content.style.width = totalWidth + 'px';
    content.style.height = totalHeight + 'px';
    content.style.position = 'relative';

    svg.setAttribute('width', totalWidth);
    svg.setAttribute('height', totalHeight);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '0';

    // 计算布局，根节点居中
    const centerX = totalWidth / 2;
    calculateTreeLayout(currentTree.root, 0, centerX);
    
    // 渲染节点
    renderNodeTree(currentTree.root, content, svg, 0);
    
    // 等待DOM渲染完成后绘制连接线
    requestAnimationFrame(() => {
        drawAllConnections();
    });
    
    // 保持当前的缩放和平移状态，而不是重置
    updateTransform();
}

function drawAllConnections() {
    const svg = document.getElementById('treeSvg');
    svg.innerHTML = '';
    
    const Y_OFFSET = 50; // 与 renderNodeTree 中的偏移量保持一致
    
    function drawNodeConnections(node) {
        if (!node.children || node.children.length === 0) return;
        if (collapsedPaths.has(node.path)) return;
        
        // 父节点底部中心位置（考虑 Y_OFFSET）
        const parentX = node.layout.x;
        const parentY = node.layout.y + Y_OFFSET + NODE_HEIGHT;
        
        // 判断是否为Sequence节点
        const isSequence = node.tag === 'Sequence' || node.tag === 'ReactiveSequence';
        
        node.children.forEach((child, index) => {
            // 子节点顶部中心位置（考虑 Y_OFFSET）
            const childX = child.layout.x;
            const childY = child.layout.y + Y_OFFSET;
            
            drawConnection(svg, parentX, parentY, childX, childY);
            
            // 如果是Sequence节点，在子节点连接处添加执行顺序编号
            if (isSequence) {
                drawSequenceNumber(svg, childX, childY, index + 1);
            }
            
            drawNodeConnections(child);
        });
    }
    
    drawNodeConnections(currentTree.root);
}

function drawSequenceNumber(svg, x, y, number) {
    // 创建圆形背景
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y - 8); // 在连接点上方一点
    circle.setAttribute('r', 12);
    circle.setAttribute('fill', '#89b4fa');
    circle.setAttribute('stroke', '#313244');
    circle.setAttribute('stroke-width', '2');
    svg.appendChild(circle);
    
    // 创建数字文本
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y - 4); // 调整垂直位置使数字居中
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#1e1e2e');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-family', 'Segoe UI, sans-serif');
    text.textContent = number;
    svg.appendChild(text);
}

function getMaxDepth(node) {
    const isCollapsed = collapsedPaths.has(node.path);
    if (!node.children || node.children.length === 0 || isCollapsed) {
        return 0;
    }
    return 1 + Math.max(...node.children.map(child => getMaxDepth(child)));
}

function renderNodeTree(node, container, svg, depth) {
    const isCollapsed = collapsedPaths.has(node.path);
    const regInfo = nodeRegistry[node.tag] || { type: 'unknown', description: '', ports: [] };
    const isCollapsible = regInfo.type === 'control' && node.children && node.children.length > 0;
    
    // 使用节点自己的卡片宽度，而不是 layout.width（layout.width 可能包含子树宽度）
    const nodeWidth = calculateNodeWidth(node);
    const nodeX = node.layout.x;

    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node-card';
    nodeElement.dataset.path = node.path;
    nodeElement.style.position = 'absolute';
    nodeElement.style.left = (nodeX - nodeWidth / 2) + 'px';
    nodeElement.style.top = (node.layout.y + 50) + 'px';
    nodeElement.style.width = nodeWidth + 'px';
    nodeElement.style.zIndex = '1';

    if (selectedNodePath === node.path) {
        nodeElement.classList.add('selected');
    }

    nodeElement.draggable = true;
    nodeElement.ondragstart = (e) => {
        dragSourcePath = node.path;
        nodeElement.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    };
    nodeElement.ondragend = () => {
        nodeElement.classList.remove('dragging');
        document.querySelectorAll('.tree-node-card.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
        dragSourcePath = null;
    };
    nodeElement.ondragover = (e) => {
        e.preventDefault();
        if (dragSourcePath && dragSourcePath !== node.path) {
            nodeElement.classList.add('drag-over');
        }
    };
    nodeElement.ondragleave = () => {
        nodeElement.classList.remove('drag-over');
    };
    nodeElement.ondrop = (e) => {
        e.preventDefault();
        nodeElement.classList.remove('drag-over');
        if (dragSourcePath && dragSourcePath !== node.path) {
            handleNodeDrop(dragSourcePath, node.path, false);
        }
    };

    nodeElement.onclick = () => selectNode(node.path);

    const card = document.createElement('div');
    card.className = `node-card node-type-${regInfo.type === 'unknown' ? 'action' : regInfo.type}`;

    const header = document.createElement('div');
    header.className = 'node-card-header';

    const icon = document.createElement('div');
    icon.className = `node-card-icon icon-${regInfo.type === 'unknown' ? 'unknown' : regInfo.type}`;
    icon.textContent = getNodeIcon(node.tag);

    const titleArea = document.createElement('div');
    titleArea.className = 'node-card-title';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'node-card-name';
    nameSpan.textContent = node.name || node.tag;

    const typeBadge = document.createElement('span');
    typeBadge.className = `node-type-badge badge-${regInfo.type === 'unknown' ? 'action' : regInfo.type}`;
    typeBadge.textContent = regInfo.type === 'unknown' ? '未知' : 
                           regInfo.type === 'control' ? '控制' : 
                           regInfo.type === 'condition' ? '条件' : '动作';

    titleArea.appendChild(nameSpan);
    titleArea.appendChild(typeBadge);

    header.appendChild(icon);
    header.appendChild(titleArea);

    const descSpan = document.createElement('div');
    descSpan.className = 'node-card-desc';
    descSpan.textContent = regInfo.description || node.tag;

    card.appendChild(header);
    card.appendChild(descSpan);

    if (node.children && node.children.length > 0) {
        const childrenCount = document.createElement('div');
        childrenCount.className = 'node-children-count';
        childrenCount.textContent = `${node.children.length} 个子节点`;
        card.appendChild(childrenCount);
    }

    const actions = document.createElement('div');
    actions.className = 'node-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '✏️';
    editBtn.title = '编辑';
    editBtn.onclick = (e) => { e.stopPropagation(); showEditModal(node); };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = '删除';
    deleteBtn.onclick = (e) => { e.stopPropagation(); deleteNodeByPath(node.path); };

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);

    nodeElement.appendChild(card);

    if (isCollapsible) {
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'collapse-btn-tree';
        collapseBtn.textContent = isCollapsed ? '+' : '−';
        collapseBtn.title = isCollapsed ? '展开' : '折叠';
        collapseBtn.onclick = (e) => {
            e.stopPropagation();
            toggleCollapse(node.path);
        };
        nodeElement.appendChild(collapseBtn);
    }

    container.appendChild(nodeElement);

    if (!isCollapsed && node.children && node.children.length > 0) {
        node.children.forEach(child => {
            renderNodeTree(child, container, svg, depth + 1);
        });
    } else if (isCollapsed && node.children && node.children.length > 0) {
        const collapsedHint = document.createElement('div');
        collapsedHint.className = 'collapsed-hint';
        collapsedHint.textContent = `... ${node.children.length} 个子节点已折叠`;
        nodeElement.appendChild(collapsedHint);
    }
}

function calculateSubtreeWidth(node) {
    const isCollapsed = collapsedPaths.has(node.path);
    const nodeWidth = node.layout ? node.layout.width : calculateNodeWidth(node);
    
    if (!node.children || node.children.length === 0 || isCollapsed) {
        return nodeWidth;
    }
    
    const childrenWidth = node.children.reduce((sum, child) => {
        return sum + calculateSubtreeWidth(child);
    }, 0) + (node.children.length - 1) * HORIZONTAL_GAP;
    
    return Math.max(nodeWidth, childrenWidth);
}

function drawConnection(svg, x1, y1, x2, y2) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    const midY = (y1 + y2) / 2;
    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#585b70');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    
    svg.appendChild(path);
}

function getNodeIcon(tag) {
    return '◆';
}

function toggleCollapse(path) {
    if (collapsedPaths.has(path)) {
        collapsedPaths.delete(path);
    } else {
        collapsedPaths.add(path);
    }
    renderTree();
}

function selectNode(path) {
    selectedNodePath = path;
    // 只更新选中状态，不重新渲染整棵树（避免重置视角）
    document.querySelectorAll('.tree-node-card').forEach(el => {
        el.classList.remove('selected');
        if (el.dataset.path === path) {
            el.classList.add('selected');
        }
    });
}

function findNodeByPath(node, path) {
    if (node.path === path) return node;
    for (const child of (node.children || [])) {
        const found = findNodeByPath(child, path);
        if (found) return found;
    }
    return null;
}

function findParentOfPath(node, path) {
    for (const child of (node.children || [])) {
        if (child.path === path) return node;
        const found = findParentOfPath(child, path);
        if (found) return found;
    }
    return null;
}

function handleNodeDrop(sourcePath, targetPath, asSibling = false) {
    const targetNode = findNodeByPath(currentTree.root, targetPath);
    if (!targetNode) return;

    function isDescendant(node, path) {
        if (node.path === path) return true;
        for (const child of (node.children || [])) {
            if (isDescendant(child, path)) return true;
        }
        return false;
    }

    if (isDescendant(targetNode, sourcePath)) {
        showToast('不能将节点拖拽到自己的子节点下', 'error');
        return;
    }

    function removeFromParent(node, path) {
        for (let i = 0; i < (node.children || []).length; i++) {
            if (node.children[i].path === path) {
                return node.children.splice(i, 1)[0];
            }
            const found = removeFromParent(node.children[i], path);
            if (found) return found;
        }
        return null;
    }

    const movedNode = removeFromParent(currentTree.root, sourcePath);
    if (!movedNode) return;

    if (asSibling) {
        const parent = findParentOfPath(currentTree.root, targetPath);
        if (parent) {
            if (!parent.children) parent.children = [];
            const targetIndex = parent.children.findIndex(c => c.path === targetPath);
            parent.children.splice(targetIndex + 1, 0, movedNode);
            reindexPaths(currentTree.root);
            renderTree();
            showToast(`已添加为兄弟节点: ${movedNode.tag}`, 'success');
        } else {
            showToast('未找到父节点', 'error');
        }
    } else {
        targetNode.children = targetNode.children || [];
        targetNode.children.push(movedNode);
        reindexPaths(currentTree.root);
        renderTree();
        showToast(`已移动为子节点: ${movedNode.tag} → ${targetNode.tag}`, 'success');
    }
}

function deleteNodeByPath(path) {
    function removeFromParent(node, path) {
        for (let i = 0; i < (node.children || []).length; i++) {
            if (node.children[i].path === path) {
                node.children.splice(i, 1);
                return true;
            }
            if (removeFromParent(node.children[i], path)) return true;
        }
        return false;
    }

    removeFromParent(currentTree.root, path);
    if (selectedNodePath === path) selectedNodePath = null;
    reindexPaths(currentTree.root);
    renderTree();
    showToast('节点已删除', 'success');
}

function showEditModal(node) {
    document.getElementById('modalTitle').textContent = `编辑节点: ${node.tag}`;
    document.getElementById('editNodeName').value = node.name || '';

    const editor = document.getElementById('portEditor');
    editor.innerHTML = '';

    const regInfo = nodeRegistry[node.tag];
    const ports = regInfo ? regInfo.ports : [];

    if (ports.length === 0 && Object.keys(node.ports || {}).length === 0) {
        editor.innerHTML = '<p style="font-size: 12px; color: #585b70;">此节点无端口参数</p>';
    } else {
        const allPorts = ports.length > 0 ? ports : Object.keys(node.ports || {}).map(k => ({ name: k, type: 'string', default: '' }));
        allPorts.forEach(port => {
            const row = document.createElement('div');
            row.className = 'port-row';
            const label = document.createElement('label');
            label.textContent = port.name;
            const input = document.createElement('input');
            input.type = 'text';
            input.dataset.portName = port.name;
            input.value = node.ports[port.name] || port.default || '';
            row.appendChild(label);
            row.appendChild(input);
            editor.appendChild(row);
        });
    }

    document.getElementById('editModal').classList.add('active');
    document.getElementById('editModal').dataset.nodePath = node.path;
}

function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}

function saveNodeEdit() {
    const path = document.getElementById('editModal').dataset.nodePath;
    const node = findNodeByPath(currentTree.root, path);
    if (!node) return;

    node.name = document.getElementById('editNodeName').value || '';

    const inputs = document.querySelectorAll('#portEditor input');
    inputs.forEach(input => {
        node.ports[input.dataset.portName] = input.value;
    });

    closeModal();
    renderTree();
    showToast('节点已更新', 'success');
}

function showCreateModal() {
    document.getElementById('createModal').classList.add('active');
}

function closeCreateModal() {
    document.getElementById('createModal').classList.remove('active');
}

async function createNewTree() {
    const filename = document.getElementById('newFilename').value.trim();
    const btId = document.getElementById('newBtId').value.trim();
    if (!filename || !btId) {
        showToast('请填写完整信息', 'error');
        return;
    }

    try {
        const res = await fetch('/api/create_xml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, bt_id: btId })
        });
        const data = await res.json();
        if (data.error) { showToast(data.error, 'error'); return; }
        closeCreateModal();
        await loadAllFiles();
        loadTree(data.filepath);
        showToast('行为树创建成功', 'success');
    } catch (e) {
        showToast('创建失败', 'error');
    }
}

function addNodeToSelected() {
    const nodeType = document.getElementById('nodeTypeSelect').value;
    if (!nodeType) { showToast('请选择节点类型', 'error'); return; }
    if (!currentTree) { showToast('请先加载行为树', 'error'); return; }

    const regInfo = nodeRegistry[nodeType];
    const ports = {};
    regInfo.ports.forEach(p => { ports[p.name] = p.default; });

    const newNode = {
        tag: nodeType,
        name: '',
        ports: ports,
        children: [],
        path: ''
    };

    let targetParent;
    if (!selectedNodePath) {
        targetParent = currentTree.root;
    } else {
        targetParent = findNodeByPath(currentTree.root, selectedNodePath);
    }

    if (targetParent) {
        if (!targetParent.children) targetParent.children = [];
        targetParent.children.push(newNode);
        reindexPaths(currentTree.root);
        renderTree();
        showToast(`已添加子节点: ${nodeType}`, 'success');
    } else {
        showToast('未找到目标节点', 'error');
    }
}

function addSiblingNode() {
    const nodeType = document.getElementById('nodeTypeSelect').value;
    if (!nodeType) { showToast('请选择节点类型', 'error'); return; }
    if (!selectedNodePath) { showToast('请先选择节点', 'error'); return; }

    const regInfo = nodeRegistry[nodeType];
    const ports = {};
    regInfo.ports.forEach(p => { ports[p.name] = p.default; });

    const newNode = {
        tag: nodeType,
        name: '',
        ports: ports,
        children: [],
        path: ''
    };

    if (selectedNodePath === currentTree.root.path) {
        showToast('根节点无法添加兄弟节点，请使用"添加为子节点"', 'error');
        return;
    }

    const parent = findParentOfPath(currentTree.root, selectedNodePath);
    if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);
        reindexPaths(currentTree.root);
        renderTree();
        showToast(`已添加兄弟节点: ${nodeType}`, 'success');
    } else {
        showToast('未找到父节点', 'error');
    }
}

function deleteSelectedNode() {
    if (!selectedNodePath) { showToast('请先选择节点', 'error'); return; }
    deleteNodeByPath(selectedNodePath);
}

function reindexPaths(node, parentPath = '', index = 0) {
    node.path = parentPath ? `${parentPath}/${index}` : `${index}`;
    (node.children || []).forEach((child, i) => {
        reindexPaths(child, node.path, i);
    });
}

async function saveCurrentTree() {
    if (!currentTree) { showToast('没有可保存的行为树', 'error'); return; }
    try {
        const res = await fetch('/api/save_xml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filepath: currentTree.filepath, tree_data: currentTree })
        });
        const data = await res.json();
        if (data.error) { showToast(data.error, 'error'); return; }
        showToast('保存成功!', 'success');
    } catch (e) {
        showToast('保存失败', 'error');
    }
}

function toggleXmlPreview() {
    if (!currentTree) { showToast('请先加载行为树', 'error'); return; }
    fetch('/api/save_xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: currentTree.filepath, tree_data: currentTree })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) { showToast(data.error, 'error'); return; }
        return fetch('/api/get_xml_content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filepath: currentTree.filepath })
        }).then(res => res.json());
    })
    .then(data => {
        if (data.error) { showToast(data.error, 'error'); return; }
        document.getElementById('xmlPreviewContent').textContent = data.content;
        document.getElementById('xmlModal').classList.add('active');
    })
    .catch(e => showToast('获取 XML 失败', 'error'));
}

function closeXmlModal() {
    document.getElementById('xmlModal').classList.remove('active');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

window.addEventListener('resize', () => {
    if (currentTree) renderTree();
});