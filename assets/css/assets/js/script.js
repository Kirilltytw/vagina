// Конфигурация PeerJS (используем публичный сервер)
const peer = new Peer({
    host: 'peerjs-server.herokuapp.com',
    secure: true,
    path: '/'
});

let conn = null;
const roomId = window.location.hash.substring(1) || generateRoomId();
let isHost = false;

// Элементы страницы
const videoFrame = document.getElementById('video-frame');
const statusEl = document.getElementById('status');
const chatMessagesEl = document.getElementById('chat-messages');

// Генератор ID комнаты
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8);
}

// Инициализация PeerJS
peer.on('open', (id) => {
    if (!window.location.hash) {
        // Создаем новую комнату
        window.location.hash = id;
        isHost = true;
        statusEl.textContent = `Вы создали комнату: ${id}`;
        statusEl.style.color = '#2ecc71';
        
        // Ожидаем подключений
        peer.on('connection', (connection) => {
            conn = connection;
            setupEventListeners();
        });
    } else {
        // Подключаемся к существующей комнате
        conn = peer.connect(roomId);
        setupEventListeners();
    }
});

// Обработчик ошибок PeerJS
peer.on('error', (err) => {
    console.error('PeerJS error:', err);
    statusEl.textContent = 'Ошибка подключения. Перезагрузите страницу.';
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Получение данных от другого участника
    conn.on('data', (data) => {
        switch(data.type) {
            case 'video':
                loadVideo(data.url);
                break;
            case 'play':
                videoFrame.contentWindow.postMessage('play', '*');
                break;
            case 'pause':
                videoFrame.contentWindow.postMessage('pause', '*');
                break;
            case 'chat':
                addMessage(data.sender, data.text);
                break;
        }
    });

    // Кнопка загрузки видео
    document.getElementById('load-btn').addEventListener('click', () => {
        const url = document.getElementById('video-url').value.trim();
        if (url) {
            loadVideo(url);
            if (conn && conn.open) {
                conn.send({ type: 'video', url: url });
            }
        }
    });

    // Кнопки управления
    document.getElementById('play-btn').addEventListener('click', () => {
        if (conn && conn.open) {
            conn.send({ type: 'play' });
        }
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
        if (conn && conn.open) {
            conn.send({ type: 'pause' });
        }
    });

    // Чат
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// Загрузка видео
function loadVideo(url) {
    if (url.includes('vk.com')) {
        const videoId = url.match(/video(-?\d+_\d+)/)[1];
        videoFrame.src = `https://vk.com/video_ext.php?oid=${videoId.split('_')[0]}&id=${videoId.split('_')[1]}`;
    } else if (url.includes('rutube.ru')) {
        const videoId = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/)[1];
        videoFrame.src = `https://rutube.ru/play/embed/${videoId}`;
    }
    statusEl.textContent = `Видео загружено: ${url}`;
}

// Отправка сообщения
function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (text && conn && conn.open) {
        conn.send({ type: 'chat', sender: isHost ? 'Хост' : 'Участник', text: text });
        addMessage('Вы', text);
        input.value = '';
    }
}

// Добавление сообщения в чат
function addMessage(sender, text) {
    const message = document.createElement('div');
    message.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatMessagesEl.appendChild(message);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}
