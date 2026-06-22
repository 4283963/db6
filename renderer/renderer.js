const $ = (id) => document.getElementById(id);

const dropZone = $('dropZone');
const fileInput = $('fileInput');
const targetIPInput = $('targetIP');
const taskList = $('taskList');
const emptyState = $('emptyState');
const taskCountEl = $('taskCount');
const serverStatusEl = $('serverStatus');
const serverAddrEl = $('serverAddr');
const downloadDirEl = $('downloadDir');

const progressModal = $('progressModal');
const pmIcon = $('pmIcon');
const pmTitle = $('pmTitle');
const pmFileName = $('pmFileName');
const pmProgressBar = $('pmProgressBar');
const pmPercent = $('pmPercent');
const pmSize = $('pmSize');
const pmMessage = $('pmMessage');
const pmCloseBtn = $('pmCloseBtn');

let activeModalTaskId = null;
let modalCloseTimer = null;

const showModal = (taskId, fileName, direction) => {
  if (modalCloseTimer) {
    clearTimeout(modalCloseTimer);
    modalCloseTimer = null;
  }

  activeModalTaskId = taskId;

  const isSend = direction === 'send';
  pmIcon.textContent = isSend ? '📤' : '📥';
  pmTitle.textContent = isSend ? '正在发送文件' : '正在接收文件';
  pmFileName.textContent = fileName;
  pmProgressBar.style.width = '0%';
  pmProgressBar.classList.remove('success', 'error');
  pmPercent.textContent = '0%';
  pmPercent.classList.remove('success', 'error');
  pmSize.textContent = `0 B / 0 B`;
  pmMessage.textContent = '传输中...';
  pmMessage.classList.remove('success', 'error');
  pmCloseBtn.hidden = true;
  pmCloseBtn.classList.remove('success', 'error');

  progressModal.classList.add('show');
  progressModal.setAttribute('aria-hidden', 'false');
};

const updateModalProgress = (current, total) => {
  if (current === undefined || total === undefined || total <= 0) return;
  const percent = Math.min(100, Math.round((current / total) * 100));
  pmProgressBar.style.width = `${percent}%`;
  pmPercent.textContent = `${percent}%`;
  pmSize.textContent = `${formatSize(current)} / ${formatSize(total)}`;
};

const finishModal = (success, message, isSend = true) => {
  if (success) {
    pmProgressBar.style.width = '100%';
    pmProgressBar.classList.add('success');
    pmPercent.textContent = '100%';
    pmPercent.classList.add('success');
    pmMessage.textContent = message || (isSend ? '✅ 发送成功！' : '✅ 接收成功！');
    pmMessage.classList.add('success');
    pmCloseBtn.textContent = '知道了';
    pmCloseBtn.classList.add('success');
  } else {
    pmProgressBar.classList.add('error');
    pmPercent.classList.add('error');
    pmMessage.textContent = `❌ ${message || '传输失败'}`;
    pmMessage.classList.add('error');
    pmCloseBtn.textContent = '关闭';
    pmCloseBtn.classList.add('error');
  }
  pmCloseBtn.hidden = false;

  modalCloseTimer = setTimeout(() => {
    hideModal();
  }, 2500);
};

const hideModal = () => {
  if (modalCloseTimer) {
    clearTimeout(modalCloseTimer);
    modalCloseTimer = null;
  }
  progressModal.classList.remove('show');
  progressModal.setAttribute('aria-hidden', 'true');
  activeModalTaskId = null;
};

pmCloseBtn.addEventListener('click', hideModal);

const tasks = new Map();

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const map = {
    pdf: '📄', doc: '📝', docx: '📝', txt: '📃', md: '📑',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🎨', bmp: '🖼️',
    mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
    zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
    js: '📜', ts: '📜', html: '🌐', css: '🎨', json: '🔧', py: '🐍',
    exe: '⚙️', dmg: '💿', iso: '💿'
  };
  return map[ext] || '📎';
};

const createTaskElement = (task) => {
  const el = document.createElement('div');
  el.className = 'task-item';
  el.dataset.id = task.id;

  const progressClass =
    task.status === 'success' ? 'success' :
    task.status === 'error' ? 'error' : '';

  const badgeText = {
    sending: '发送中',
    receiving: '接收中',
    success: '完成',
    error: '失败'
  }[task.status] || '';

  el.innerHTML = `
    <div class="task-item-row">
      <div class="task-item-info">
        <div class="task-icon">${getFileIcon(task.fileName)}</div>
        <div class="task-name" title="${task.fileName}">${task.fileName}</div>
      </div>
      <div class="task-meta">
        <span class="task-badge ${task.status}">${badgeText}</span>
        <span class="task-size">${formatSize(task.total)}</span>
      </div>
    </div>
    <div class="task-progress-wrap">
      <div class="task-progress-bar ${progressClass}"
           style="width: ${task.percent}%"></div>
    </div>
    <div class="task-peer" title="${task.peer}">
      ${task.direction === 'send' ? '→' : '←'} ${task.peer}
      ${task.status === 'success' && task.savePath ? ` · ${task.savePath}` : ''}
      ${task.status === 'error' && task.error ? ` · 错误: ${task.error}` : ''}
    </div>
  `;

  return el;
};

const renderTasks = () => {
  const list = [...tasks.values()].reverse();

  if (list.length === 0) {
    taskList.innerHTML = '';
    taskList.appendChild(emptyState);
    taskCountEl.textContent = '0 项';
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const task of list) {
    const existing = taskList.querySelector(`[data-id="${task.id}"]`);
    const el = createTaskElement(task);
    if (existing) {
      existing.replaceWith(el);
    } else {
      fragment.appendChild(el);
    }
  }

  if (fragment.childNodes.length > 0) {
    taskList.innerHTML = '';
    taskList.appendChild(fragment);
  }

  taskCountEl.textContent = `${list.length} 项`;
};

const updateTask = (id, patch) => {
  const task = tasks.get(id);
  if (!task) return;
  Object.assign(task, patch);
  if (task.total > 0 && (patch.received !== undefined || patch.sent !== undefined)) {
    const current = patch.received !== undefined ? patch.received : (patch.sent || 0);
    task.percent = Math.min(100, Math.round((current / task.total) * 100));
  }
  renderTasks();
};

const addTask = (task) => {
  const base = {
    id: '',
    fileName: '',
    total: 0,
    percent: 0,
    status: 'sending',
    direction: 'send',
    peer: '',
    savePath: '',
    error: ''
  };
  tasks.set(task.id, { ...base, ...task });
  renderTasks();
};

const preventDefaults = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) => {
  dropZone.addEventListener(evt, preventDefaults, false);
  document.body.addEventListener(evt, preventDefaults, false);
});

['dragenter', 'dragover'].forEach((evt) => {
  dropZone.addEventListener(evt, () => {
    dropZone.classList.add('drag-over');
  }, false);
});

['dragleave', 'drop'].forEach((evt) => {
  dropZone.addEventListener(evt, () => {
    dropZone.classList.remove('drag-over');
  }, false);
});

dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    handleFiles(files);
  }
}, false);

dropZone.addEventListener('click', () => {
  fileInput.click();
});

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFiles(e.target.files);
    fileInput.value = '';
  }
});

const handleFiles = async (fileList) => {
  const targetIP = targetIPInput.value.trim();

  if (!targetIP) {
    alert('请先填写目标设备的 IP 地址');
    targetIPInput.focus();
    return;
  }

  const ipRegex = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  if (!ipRegex.test(targetIP)) {
    alert('IP 地址格式不正确');
    targetIPInput.focus();
    return;
  }

  const files = Array.from(fileList);
  for (const file of files) {
    const taskId = `send_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    addTask({
      id: taskId,
      fileName: file.name,
      total: file.size,
      percent: 0,
      status: 'sending',
      direction: 'send',
      peer: targetIP
    });

    try {
      const result = await window.lanTransfer.sendFile(targetIP, file.path);
      if (!result.success) {
        updateTask(taskId, { status: 'error', error: result.error });
      }
    } catch (err) {
      updateTask(taskId, { status: 'error', error: err.message });
    }
  }
};

const init = async () => {
  try {
    const info = await window.lanTransfer.getServerInfo();
    serverStatusEl.classList.add('online');
    serverAddrEl.textContent = `${info.address}:${info.port}`;
    downloadDirEl.textContent = info.downloadDir;
  } catch (e) {
    serverAddrEl.textContent = '启动失败';
  }

  window.lanTransfer.onSendStart((data) => {
    const id = data.taskId || `send_${Date.now()}`;
    if (!tasks.has(id)) {
      const name = data.filePath ? data.filePath.split(/[/\\]/).pop() : '未知文件';
      addTask({
        id,
        fileName: name,
        total: 0,
        percent: 0,
        status: 'sending',
        direction: 'send',
        peer: data.target
      });
      showModal(id, name, 'send');
    }
  });

  window.lanTransfer.onSendProgress((data) => {
    updateTask(data.taskId, {
      sent: data.sent,
      total: data.total
    });
    if (activeModalTaskId === data.taskId) {
      updateModalProgress(data.sent, data.total);
    }
  });

  window.lanTransfer.onSendComplete((data) => {
    updateTask(data.taskId, {
      status: 'success',
      percent: 100
    });
    if (activeModalTaskId === data.taskId) {
      updateModalProgress(data.total || 1, data.total || 1);
      finishModal(true, null, true);
    }
  });

  window.lanTransfer.onSendError((data) => {
    updateTask(data.taskId, {
      status: 'error',
      error: data.error
    });
    if (activeModalTaskId === data.taskId) {
      finishModal(false, data.error, true);
    }
  });

  window.lanTransfer.onReceiveProgress((data) => {
    const id = `recv_${data.from}_${data.fileName}`;
    if (!tasks.has(id)) {
      addTask({
        id,
        fileName: data.fileName,
        total: data.total,
        percent: 0,
        status: 'receiving',
        direction: 'receive',
        peer: data.from
      });
      showModal(id, data.fileName, 'receive');
    }
    updateTask(id, {
      received: data.received,
      total: data.total
    });
    if (activeModalTaskId === id) {
      updateModalProgress(data.received, data.total);
    }
  });

  window.lanTransfer.onReceiveComplete((data) => {
    const id = `recv_${data.from}_${data.fileName}`;
    updateTask(id, {
      status: 'success',
      percent: 100,
      savePath: data.savePath
    });
    if (activeModalTaskId === id) {
      updateModalProgress(data.fileSize, data.fileSize);
      finishModal(true, null, false);
    }
  });

  window.lanTransfer.onReceiveError((data) => {
    const id = `recv_${data.from}_${data.fileName}`;
    updateTask(id, {
      status: 'error',
      error: data.error
    });
    if (activeModalTaskId === id) {
      finishModal(false, data.error, false);
    }
  });

  window.lanTransfer.onServerError((data) => {
    console.error('服务器错误:', data.error);
  });
};

init();
