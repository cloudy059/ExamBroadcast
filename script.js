// 全局变量
let examConfig = null;
let reminders = [];
let currentExamIndex = 0;
let audioFiles = {};

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化页面
    initPage();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 从本地存储加载提醒
    loadRemindersFromStorage();
    
    // 从本地存储加载铃声数据
    loadAudioFilesFromStorage();
    
    // 启动时钟和倒计时
    updateClock();
    setInterval(updateClock, 1000);
    
    // 检查提醒
    setInterval(checkReminders, 1000);
    
    // 请求通知权限
    requestNotificationPermission();
});

// 初始化页面
async function initPage() {
    try {
        // 加载默认配置文件
        const response = await fetch('exam_config.json');
        examConfig = await response.json();
        
        // 更新页面标题
        document.getElementById('title').textContent = examConfig.title;
        document.title = examConfig.title;
        
        // 渲染考试表格
        renderExamTable();
        
        // 更新当前考试索引
        updateCurrentExamIndex();
    } catch (error) {
        console.error('加载配置文件失败:', error);
        alert('加载配置文件失败，请检查exam_config.json是否存在并格式正确。');
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 导入配置按钮
    document.getElementById('import-config').addEventListener('click', () => {
        document.getElementById('config-file').click();
    });
    
    // 配置文件选择
    document.getElementById('config-file').addEventListener('change', handleConfigFileImport);
    
    // 添加提醒按钮
    document.getElementById('add-reminder').addEventListener('click', () => {
        document.getElementById('reminder-form').style.display = 'block';
    });
    
    // 提醒类型变更
    document.getElementById('reminder-type').addEventListener('change', handleReminderTypeChange);
    
    // 保存提醒按钮
    document.getElementById('save-reminder').addEventListener('click', saveReminder);
    
    // 取消添加提醒
    document.getElementById('cancel-reminder').addEventListener('click', () => {
        document.getElementById('reminder-form').style.display = 'none';
    });
    
    // 选择铃声按钮
    document.getElementById('select-ringtone').addEventListener('click', () => {
        document.getElementById('ringtone-file').click();
    });
    
    // 铃声文件选择
    document.getElementById('ringtone-file').addEventListener('change', handleRingtoneFileSelect);
    
    // 试听铃声按钮
    document.getElementById('test-ringtone').addEventListener('click', testRingtone);
    
    // 初始化拖拽排序
    initSortable();
}

// 初始化拖拽排序
function initSortable() {
    const reminderList = document.getElementById('reminder-list');
    Sortable.create(reminderList, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: function() {
            // 更新提醒顺序
            updateRemindersOrder();
        }
    });
}

// 更新提醒顺序
function updateRemindersOrder() {
    const reminderItems = document.querySelectorAll('.reminder-item');
    const newReminders = [];
    
    reminderItems.forEach(item => {
        const id = item.dataset.id;
        const reminder = reminders.find(r => r.id === id);
        if (reminder) {
            newReminders.push(reminder);
        }
    });
    
    reminders = newReminders;
    saveRemindersToStorage();
}

// 处理配置文件导入
function handleConfigFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const newConfig = JSON.parse(e.target.result);
            examConfig = newConfig;
            
            // 更新页面标题
            document.getElementById('title').textContent = examConfig.title;
            document.title = examConfig.title;
            
            // 重新渲染考试表格
            renderExamTable();
            
            // 更新当前考试索引
            updateCurrentExamIndex();
            
            // 更新所有提醒的时间
            updateRemindersForNewExam();
            
            alert('配置文件导入成功！');
        } catch (error) {
            console.error('解析配置文件失败:', error);
            alert('解析配置文件失败，请检查文件格式是否正确。');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // 重置文件输入
}

// 处理提醒类型变更
function handleReminderTypeChange() {
    const reminderType = document.getElementById('reminder-type').value;
    const timeAdjustmentGroup = document.getElementById('time-adjustment-group');
    
    if (reminderType === 'before-start' || reminderType === 'before-end') {
        timeAdjustmentGroup.style.display = 'block';
    } else {
        timeAdjustmentGroup.style.display = 'none';
    }
}

// 处理铃声文件选择
function handleRingtoneFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const ringtoneNameInput = document.getElementById('ringtone-name');
    ringtoneNameInput.value = file.name;
    
    // 读取文件内容并转换为Base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        // 存储铃声数据
        audioFiles[file.name] = base64Data;
        // 保存到本地存储
        saveAudioFilesToStorage();
    };
    reader.readAsDataURL(file);
    
    event.target.value = ''; // 重置文件输入
}

// 播放铃声
function playRingtone(ringtoneName) {
    const audioPlayer = document.getElementById('audio-player');
    
    // 如果有自定义铃声
    if (audioFiles[ringtoneName]) {
        audioPlayer.src = audioFiles[ringtoneName];
    } else {
        // 默认铃声
        audioPlayer.src = 'https://www.soundjay.com/buttons/sounds/button-1.mp3';
    }
    
    // 确保音频加载完成后播放
    audioPlayer.oncanplaythrough = function() {
        audioPlayer.play().catch(error => {
            console.error('播放铃声失败:', error);
            alert('播放铃声失败，可能是因为浏览器限制。请尝试点击页面后再试。');
        });
    };
    
    // 如果已经加载完成，直接播放
    if (audioPlayer.readyState >= 3) {
        audioPlayer.play().catch(error => {
            console.error('播放铃声失败:', error);
            alert('播放铃声失败，可能是因为浏览器限制。请尝试点击页面后再试。');
        });
    }
}

// 保存铃声到本地存储
function saveAudioFilesToStorage() {
    localStorage.setItem('audioFiles', JSON.stringify(audioFiles));
}

// 从本地存储加载铃声
function loadAudioFilesFromStorage() {
    const savedAudioFiles = localStorage.getItem('audioFiles');
    if (savedAudioFiles) {
        audioFiles = JSON.parse(savedAudioFiles);
    }
}

// 试听铃声
function testRingtone() {
    const ringtoneName = document.getElementById('ringtone-name').value;
    playRingtone(ringtoneName);
}

// 保存提醒
function saveReminder() {
    const reminderType = document.getElementById('reminder-type').value;
    const timeAdjustment = parseInt(document.getElementById('time-adjustment').value) || 10;
    const ringtoneName = document.getElementById('ringtone-name').value;
    
    if (!examConfig || !examConfig.exams || examConfig.exams.length === 0) {
        alert('没有可用的考试信息，请先导入考试配置。');
        return;
    }
    
    // 获取当前考试
    const currentExam = examConfig.exams[currentExamIndex];
    
    // 计算提醒时间
    let reminderTime = '';
    let reminderName = '';
    
    switch (reminderType) {
        case 'before-start':
            reminderTime = calculateReminderTime(currentExam.date, currentExam.startTime, -timeAdjustment);
            reminderName = `开考前${timeAdjustment}分钟`;
            break;
        case 'before-end':
            reminderTime = calculateReminderTime(currentExam.date, currentExam.endTime, -timeAdjustment);
            reminderName = `结束前${timeAdjustment}分钟`;
            break;
        case 'start':
            reminderTime = `${currentExam.date} ${currentExam.startTime}:00`;
            reminderName = '开始考试';
            break;
        case 'end':
            reminderTime = `${currentExam.date} ${currentExam.endTime}:00`;
            reminderName = '结束考试';
            break;
    }
    
    // 创建新提醒
    const newReminder = {
        id: Date.now().toString(),
        type: reminderType,
        timeAdjustment: timeAdjustment,
        time: reminderTime,
        name: reminderName,
        ringtoneName: ringtoneName,
        examIndex: currentExamIndex,
        paused: false // 添加暂停状态属性，默认为false
    };
    
    // 添加到提醒列表
    reminders.push(newReminder);
    
    // 保存到本地存储
    saveRemindersToStorage();
    
    // 渲染提醒列表
    renderReminderList();
    
    // 隐藏表单
    document.getElementById('reminder-form').style.display = 'none';
}

// 计算提醒时间
function calculateReminderTime(date, time, minutesAdjustment) {
    const dateTime = new Date(`${date}T${time}:00`);
    dateTime.setMinutes(dateTime.getMinutes() + minutesAdjustment);
    
    const year = dateTime.getFullYear();
    const month = String(dateTime.getMonth() + 1).padStart(2, '0');
    const day = String(dateTime.getDate()).padStart(2, '0');
    const hours = String(dateTime.getHours()).padStart(2, '0');
    const minutes = String(dateTime.getMinutes()).padStart(2, '0');
    const seconds = String(dateTime.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 渲染考试表格
function renderExamTable() {
    const examList = document.getElementById('exam-list');
    examList.innerHTML = '';
    
    if (!examConfig || !examConfig.exams) return;
    
    examConfig.exams.forEach(exam => {
        const row = document.createElement('tr');
        
        // 计算考试状态
        const status = getExamStatus(exam);
        
        row.innerHTML = `
            <td>${formatDate(exam.date)}</td>
            <td>${exam.subject}</td>
            <td>${exam.startTime}</td>
            <td>${exam.endTime}</td>
            <td><span class="status status-${status.class}">${status.text}</span></td>
        `;
        
        examList.appendChild(row);
    });
}

// 获取考试状态
function getExamStatus(exam) {
    const now = new Date();
    const startTime = new Date(`${exam.date}T${exam.startTime}:00`);
    const endTime = new Date(`${exam.date}T${exam.endTime}:00`);
    
    if (now < startTime) {
        return { text: '未开始', class: 'not-started' };
    } else if (now >= startTime && now <= endTime) {
        return { text: '进行中', class: 'in-progress' };
    } else {
        return { text: '已结束', class: 'completed' };
    }
}

// 更新当前考试索引
function updateCurrentExamIndex() {
    if (!examConfig || !examConfig.exams || examConfig.exams.length === 0) return;
    
    const now = new Date();
    let nextExamIndex = -1;
    
    // 查找下一个未开始或进行中的考试
    for (let i = 0; i < examConfig.exams.length; i++) {
        const exam = examConfig.exams[i];
        const endTime = new Date(`${exam.date}T${exam.endTime}:00`);
        
        // 添加2分钟延迟切换，确保结束提醒能够播放
        const delayedEndTime = new Date(endTime);
        delayedEndTime.setMinutes(delayedEndTime.getMinutes() + 2);
        
        if (now <= delayedEndTime) {
            nextExamIndex = i;
            break;
        }
    }
    
    // 如果所有考试都已结束，则使用最后一个考试
    if (nextExamIndex === -1) {
        nextExamIndex = examConfig.exams.length - 1;
    }
    
    // 如果当前考试索引发生变化，则更新提醒
    if (currentExamIndex !== nextExamIndex) {
        currentExamIndex = nextExamIndex;
        updateRemindersForNewExam();
    } else {
        currentExamIndex = nextExamIndex;
    }
}

// 为新考试更新提醒
function updateRemindersForNewExam() {
    if (reminders.length === 0) return;
    
    // 获取当前考试
    const currentExam = examConfig.exams[currentExamIndex];
    
    // 更新所有提醒的考试索引和时间
    reminders.forEach(reminder => {
        reminder.examIndex = currentExamIndex;
        
        // 重新计算提醒时间
        switch (reminder.type) {
            case 'before-start':
                reminder.time = calculateReminderTime(currentExam.date, currentExam.startTime, -reminder.timeAdjustment);
                break;
            case 'before-end':
                reminder.time = calculateReminderTime(currentExam.date, currentExam.endTime, -reminder.timeAdjustment);
                break;
            case 'start':
                reminder.time = `${currentExam.date} ${currentExam.startTime}:00`;
                break;
            case 'end':
                reminder.time = `${currentExam.date} ${currentExam.endTime}:00`;
                break;
        }
    });
    
    // 保存更新后的提醒
    saveRemindersToStorage();
    
    // 重新渲染提醒列表
    renderReminderList();
}

// 渲染提醒列表
function renderReminderList() {
    const reminderList = document.getElementById('reminder-list');
    reminderList.innerHTML = '';
    
    reminders.forEach(reminder => {
        const li = document.createElement('li');
        li.className = 'reminder-item';
        li.dataset.id = reminder.id;
        
        // 添加暂停状态的样式
        if (reminder.paused) {
            li.classList.add('paused');
        }
        
        li.innerHTML = `
            <div class="drag-handle"><i class="fas fa-grip-lines"></i></div>
            <div class="reminder-info">
                <div class="reminder-name">${reminder.name}</div>
                <div class="reminder-time">提醒时间: ${formatDateTime(reminder.time)} | 铃声: ${reminder.ringtoneName}</div>
            </div>
            <div class="reminder-actions">
                <button class="action-btn test" title="试听"><i class="fas fa-play"></i></button>
                <button class="action-btn toggle-pause" title="${reminder.paused ? '恢复' : '暂停'}">
                    <i class="fas ${reminder.paused ? 'fa-play-circle' : 'fa-pause-circle'}"></i>
                </button>
                <button class="action-btn edit" title="编辑"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" title="删除"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        // 添加事件监听器
        li.querySelector('.action-btn.test').addEventListener('click', () => {
            playRingtone(reminder.ringtoneName);
        });
        
        // 添加暂停/恢复按钮事件监听器
        li.querySelector('.action-btn.toggle-pause').addEventListener('click', () => {
            toggleReminderPause(reminder.id);
        });
        
        li.querySelector('.action-btn.edit').addEventListener('click', () => {
            editReminder(reminder);
        });
        
        li.querySelector('.action-btn.delete').addEventListener('click', () => {
            deleteReminder(reminder.id);
        });
        
        reminderList.appendChild(li);
    });
    
    // 重新初始化拖拽排序
    initSortable();
}

// 编辑提醒
function editReminder(reminder) {
    // 填充表单
    document.getElementById('reminder-type').value = reminder.type;
    document.getElementById('time-adjustment').value = reminder.timeAdjustment || 10;
    document.getElementById('ringtone-name').value = reminder.ringtoneName;
    
    // 显示/隐藏时间调节框
    handleReminderTypeChange();
    
    // 显示表单
    document.getElementById('reminder-form').style.display = 'block';
    
    // 修改保存按钮行为
    const saveButton = document.getElementById('save-reminder');
    
    // 移除旧的事件监听器
    const newSaveButton = saveButton.cloneNode(true);
    saveButton.parentNode.replaceChild(newSaveButton, saveButton);
    
    // 添加新的事件监听器
    newSaveButton.addEventListener('click', () => {
        // 删除旧提醒
        deleteReminder(reminder.id);
        
        // 保存新提醒
        saveReminder();
        
        // 恢复保存按钮原始行为
        const originalSaveButton = newSaveButton.cloneNode(true);
        newSaveButton.parentNode.replaceChild(originalSaveButton, newSaveButton);
        originalSaveButton.addEventListener('click', saveReminder);
    });
}

// 删除提醒
function deleteReminder(id) {
    reminders = reminders.filter(reminder => reminder.id !== id);
    saveRemindersToStorage();
    renderReminderList();
}

// 切换提醒的暂停状态
function toggleReminderPause(id) {
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        reminder.paused = !reminder.paused;
        saveRemindersToStorage();
        renderReminderList();
    }
}

// 保存提醒到本地存储
function saveRemindersToStorage() {
    localStorage.setItem('reminders', JSON.stringify(reminders));
}

// 重置提醒的播报状态
function resetAnnouncedStatus() {
    let hasChanges = false;
    
    reminders.forEach(reminder => {
        const reminderTime = new Date(reminder.time);
        const now = new Date();
        
        // 如果提醒时间已过，且不是当前分钟，重置状态
        if (reminder.announced && 
            (reminderTime.getMinutes() !== now.getMinutes() || 
             reminderTime.getHours() !== now.getHours() || 
             reminderTime.getDate() !== now.getDate())) {
            reminder.announced = false;
            hasChanges = true;
        }
    });
    
    // 如果有变化，保存到本地存储
    if (hasChanges) {
        saveRemindersToStorage();
    }
}

// 从本地存储加载提醒
function loadRemindersFromStorage() {
    const savedReminders = localStorage.getItem('reminders');
    if (savedReminders) {
        reminders = JSON.parse(savedReminders);
        
        // 初始化announced和paused属性
        reminders.forEach(reminder => {
            if (reminder.announced === undefined) {
                reminder.announced = false;
            }
            if (reminder.paused === undefined) {
                reminder.paused = false;
            }
        });
        
        renderReminderList();
    }
}

// 检查提醒
function checkReminders() {
    if (reminders.length === 0) return;
    
    const now = new Date();
    const currentTimeStr = formatDateTimeForComparison(now);
    
    reminders.forEach(reminder => {
        // 跳过已暂停的提醒
        if (reminder.paused) return;
        
        const reminderTimeStr = formatDateTimeForComparison(new Date(reminder.time));
        
        // 检查是否匹配当前时间且尚未播报
        if (currentTimeStr === reminderTimeStr && !reminder.announced) {
            // 标记为已播报
            reminder.announced = true;
            
            // 保存状态到本地存储
            saveRemindersToStorage();
            
            // 播放提醒铃声
            playRingtone(reminder.ringtoneName);
            
            // 显示提醒通知
            if (Notification.permission === 'granted') {
                const exam = examConfig.exams[reminder.examIndex];
                new Notification(`${exam.subject} - ${reminder.name}`, {
                    body: `时间: ${formatDateTime(reminder.time)}`,
                    icon: '/favicon.ico'
                });
            }
        }
    });
}

// 更新时钟和倒计时
function updateClock() {
    const now = new Date();
    const currentMinute = now.getMinutes();
    
    // 检查分钟是否变化，如果变化则重置提醒状态
    if (window.lastMinute !== currentMinute) {
        resetAnnouncedStatus();
        window.lastMinute = currentMinute;
    }
    
    // 更新当前时间
    document.getElementById('current-time').textContent = formatTime(now);
    
    // 更新日期和星期
    document.getElementById('date-info').textContent = formatDateWithWeekday(now);
    
    // 更新倒计时
    updateCountdown(now);
    
    // 更新当前考试索引
    updateCurrentExamIndex();
    
    // 更新考试表格状态
    updateExamTableStatus();
}

// 更新倒计时
function updateCountdown(now) {
    if (!examConfig || !examConfig.exams || examConfig.exams.length === 0) return;
    
    const currentExam = examConfig.exams[currentExamIndex];
    const startTime = new Date(`${currentExam.date}T${currentExam.startTime}:00`);
    const endTime = new Date(`${currentExam.date}T${currentExam.endTime}:00`);
    
    let countdownText = '';
    let targetTime = null;
    
    if (now < startTime) {
        // 考试未开始，倒计时到开始
        countdownText = '距离开始考试:';
        targetTime = startTime;
    } else if (now >= startTime && now <= endTime) {
        // 考试进行中，倒计时到结束
        countdownText = '距离考试结束:';
        targetTime = endTime;
    } else if (currentExamIndex < examConfig.exams.length - 1) {
        // 当前考试已结束，但还有下一场考试
        const nextExam = examConfig.exams[currentExamIndex + 1];
        const nextStartTime = new Date(`${nextExam.date}T${nextExam.startTime}:00`);
        countdownText = '距离下一场考试开始:';
        targetTime = nextStartTime;
    } else {
        // 所有考试已结束
        document.getElementById('countdown').textContent = '所有考试已结束';
        return;
    }
    
    // 计算时间差
    const timeDiff = targetTime - now;
    
    if (timeDiff <= 0) {
        updateCurrentExamIndex(); // 重新计算当前考试
        updateCountdown(now); // 重新计算倒计时
        return;
    }
    
    // 转换为天、时、分、秒
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    // 格式化倒计时
    let formattedTime = '';
    if (days > 0) {
        // 如果超过24小时，显示天数
        formattedTime = `${days}天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        // 否则只显示时分秒
        formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // 更新倒计时文本
    document.getElementById('countdown').textContent = `${countdownText} ${formattedTime}`;
}

// 更新考试表格状态
function updateExamTableStatus() {
    if (!examConfig || !examConfig.exams) return;
    
    const rows = document.querySelectorAll('#exam-list tr');
    
    examConfig.exams.forEach((exam, index) => {
        if (index < rows.length) {
            const statusCell = rows[index].querySelector('td:last-child span');
            const status = getExamStatus(exam);
            
            statusCell.className = `status status-${status.class}`;
            statusCell.textContent = status.text;
        }
    });
}

// 格式化时间 (HH:MM:SS)
function formatTime(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.error('无效的日期对象:', date);
        return '00:00:00';
    }
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}

// 格式化日期 (YYYY-MM-DD)
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// 格式化日期和时间 (YYYY-MM-DD HH:MM:SS)
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return `${formatDate(date)} ${formatTime(date)}`;
}

// 格式化日期和星期
function formatDateWithWeekday(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}年${month}月${day}日 星期${weekday}`;
}

// 格式化日期时间用于比较 (YYYY-MM-DD HH:MM)
function formatDateTimeForComparison(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 请求通知权限
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}
