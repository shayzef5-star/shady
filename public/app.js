// ============= Глобальные переменные =============
let currentUser = null;
let currentPage = 'calendar';
let currentYear = 2026;
let currentMonth = 2; // Март (0-индексация: 0=январь, 2=март)
let currentActivities = [];

// ============= Проверка авторизации при загрузке =============
window.onload = () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        renderApp();
    } else {
        showAuthForm();
    }
};

// ============= Отображение формы входа/регистрации =============
function showAuthForm() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container" style="max-width: 400px; margin-top: 50px;">
            <div class="card">
                <h2 style="text-align: center; margin-bottom: 1.5rem;">🏫 Школьный календарь</h2>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                    <button class="btn btn-primary" onclick="showLogin()" style="flex: 1;">Вход</button>
                    <button class="btn btn-outline" onclick="showRegister()" style="flex: 1;">Регистрация</button>
                </div>
                
                <div id="auth-form"></div>
            </div>
        </div>
    `;
    showLogin();
}

function showLogin() {
    const formDiv = document.getElementById('auth-form');
    formDiv.innerHTML = `
        <form onsubmit="login(event)">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="login-email" required>
            </div>
            <div class="form-group">
                <label>Пароль</label>
                <input type="password" id="login-password" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Войти</button>
        </form>
        <p style="text-align: center; margin-top: 1rem; font-size: 0.875rem; color: #6b7280;">
            Тестовый организатор: admin@school.ru / admin123
        </p>
    `;
}

function showRegister() {
    const formDiv = document.getElementById('auth-form');
    formDiv.innerHTML = `
        <form onsubmit="register(event)">
            <div class="form-group">
                <label>Имя</label>
                <input type="text" id="reg-name" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="reg-email" required>
            </div>
            <div class="form-group">
                <label>Пароль</label>
                <input type="password" id="reg-password" required>
            </div>
            <div class="form-group">
                <label>Школа</label>
                <input type="text" id="reg-school" required>
            </div>
            <div class="form-group">
                <label>Класс</label>
                <input type="text" id="reg-class" placeholder="Например: 10А">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Зарегистрироваться</button>
        </form>
    `;
}

async function login(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (res.ok) {
        currentUser = await res.json();
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        renderApp();
    } else {
        const error = await res.json();
        alert('Ошибка: ' + error.error);
    }
}

async function register(e) {
    e.preventDefault();
    const user = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        school: document.getElementById('reg-school').value,
        class: document.getElementById('reg-class').value
    };
    
    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    
    if (res.ok) {
        alert('Регистрация успешна! Теперь войдите.');
        showLogin();
    } else {
        const error = await res.json();
        alert('Ошибка: ' + error.error);
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    showAuthForm();
}

// ============= Рендер основного приложения =============
async function renderApp() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="navbar">
            <div class="logo">🏫 Календарь активностей</div>
            <div class="nav-links">
                <a href="#" onclick="changePage('calendar')" id="nav-calendar">📅 Календарь</a>
                <a href="#" onclick="changePage('activities')" id="nav-activities">📋 Задания</a>
                <a href="#" onclick="changePage('uploads')" id="nav-uploads">📤 Мои загрузки</a>
                <a href="#" onclick="changePage('rating')" id="nav-rating">🏆 Рейтинг</a>
                ${currentUser.role === 'organizer' ? '<a href="#" onclick="changePage(\'admin\')" id="nav-admin">⚙️ Админ</a>' : ''}
            </div>
            <div class="user-info">
                <span class="user-name">${currentUser.name} (${currentUser.role === 'organizer' ? 'Организатор' : currentUser.class || 'Ученик'})</span>
                <button class="btn-logout" onclick="logout()">Выйти</button>
            </div>
        </div>
        <div class="container" id="page-content">
            <div class="loading">Загрузка...</div>
        </div>
    `;
    
    updateActiveNav();
    await loadPage(currentPage);
}

function updateActiveNav() {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.getElementById(`nav-${currentPage}`);
    if (activeLink) activeLink.classList.add('active');
}

function changePage(page) {
    currentPage = page;
    updateActiveNav();
    loadPage(page);
}

async function loadPage(page) {
    const contentDiv = document.getElementById('page-content');
    
    switch(page) {
        case 'calendar':
            await loadCalendar(contentDiv);
            break;
        case 'activities':
            await loadActivities(contentDiv);
            break;
        case 'uploads':
            await loadUploads(contentDiv);
            break;
        case 'rating':
            await loadRating(contentDiv);
            break;
        case 'admin':
            await loadAdmin(contentDiv);
            break;
        default:
            contentDiv.innerHTML = '<div class="card">Страница не найдена</div>';
    }
}

// ============= КАЛЕНДАРЬ (с переключением месяцев и русскими названиями) =============
const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

async function loadCalendar(container) {
    const [activities, categories] = await Promise.all([
        fetch('/api/activities').then(r => r.json()),
        fetch('/api/categories').then(r => r.json())
    ]);
    
    currentActivities = activities;
    
    // Получаем количество дней в текущем месяце
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Понедельник как первый день
    
    // Группируем активности по датам
    const eventsByDate = {};
    activities.forEach(act => {
        if (act.date) {
            if (!eventsByDate[act.date]) eventsByDate[act.date] = [];
            eventsByDate[act.date].push(act);
        }
    });
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <button class="btn btn-outline" onclick="changeMonth(-1)">◀ Предыдущий</button>
            <h2 style="margin: 0;">${monthNames[currentMonth]} ${currentYear}</h2>
            <button class="btn btn-outline" onclick="changeMonth(1)">Следующий ▶</button>
        </div>
        
        <div class="filters" id="calendar-filters">
            <span class="filter-chip ${!window.selectedCategory ? 'active' : ''}" onclick="filterCalendarByCategory(null)">Все</span>
            ${categories.map(cat => `
                <span class="filter-chip" data-cat="${cat.id}" style="background: ${window.selectedCategory === cat.id ? '#3b82f6' : 'white'}; color: ${window.selectedCategory === cat.id ? 'white' : '#1f2937'}" onclick="filterCalendarByCategory(${cat.id})">${cat.name}</span>
            `).join('')}
        </div>
        
        <div class="calendar-grid">
            <div class="calendar-day-header-cell">Пн</div>
            <div class="calendar-day-header-cell">Вт</div>
            <div class="calendar-day-header-cell">Ср</div>
            <div class="calendar-day-header-cell">Чт</div>
            <div class="calendar-day-header-cell">Пт</div>
            <div class="calendar-day-header-cell">Сб</div>
            <div class="calendar-day-header-cell">Вс</div>
    `;
    
    // Пустые ячейки до первого дня месяца
    for (let i = 0; i < startOffset; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }
    
    // Дни месяца
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        let events = eventsByDate[dateStr] || [];
        
        // Фильтрация по категории
        if (window.selectedCategory) {
            events = events.filter(e => e.category_id === window.selectedCategory);
        }
        
        html += `
            <div class="calendar-day" onclick="showDayEvents('${dateStr}')">
                <div class="calendar-day-header">${d}</div>
                ${events.slice(0, 2).map(e => `
                    <div class="calendar-event" style="background: ${e.category_color || '#3b82f6'}">
                        ${e.title.length > 20 ? e.title.substring(0, 18) + '...' : e.title}
                    </div>
                `).join('')}
                ${events.length > 2 ? `<div class="calendar-event more">+${events.length - 2}</div>` : ''}
            </div>
        `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function changeMonth(delta) {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    
    if (newMonth < 0) {
        newMonth = 11;
        newYear--;
    } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
    }
    
    currentMonth = newMonth;
    currentYear = newYear;
    loadCalendar(document.getElementById('page-content'));
}

window.filterCalendarByCategory = (catId) => {
    window.selectedCategory = catId;
    loadCalendar(document.getElementById('page-content'));
};

window.showDayEvents = async (date) => {
    const events = currentActivities.filter(a => a.date === date);
    if (window.selectedCategory) {
        events = events.filter(e => e.category_id === window.selectedCategory);
    }
    
    if (events.length === 0) {
        alert('На этот день нет активностей');
        return;
    }
    
    // Показываем список активностей на день с возможностью перейти к деталям
    let message = `📅 Активности на ${date}:\n\n`;
    events.forEach((e, i) => {
        message += `${i + 1}. ${e.title} (⭐ ${e.points} баллов)\n`;
    });
    message += `\nНажми ОК, чтобы перейти к списку активностей.`;
    
    if (confirm(message)) {
        changePage('activities');
    }
};

// ============= Список активностей (с показом участников) =============
async function loadActivities(container) {
    const activities = await fetch('/api/activities').then(r => r.json());
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="card">Пока нет активностей</div>';
        return;
    }
    
    container.innerHTML = `
        <h2 style="margin-bottom: 1rem;">📋 Текущие задания</h2>
        ${activities.map(act => `
            <div class="card" id="activity-card-${act.id}">
                <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap;">
                    <div style="flex: 1;">
                        <span class="filter-chip" style="background: ${act.category_color || '#3b82f6'}; color: white; margin-bottom: 0.5rem; display: inline-block;">
                            ${act.category_name || 'Без категории'}
                        </span>
                        <h3 style="margin: 0.5rem 0;">${act.title}</h3>
                        <p style="color: #6b7280;">📅 ${act.date} | ⭐ ${act.points} баллов</p>
                        <p>${act.description?.substring(0, 100)}...</p>
                        <p>👥 Участников: ${act.participants_count || 0}/${act.max_participants || '∞'}</p>
                    </div>
                    <div>
                        <button class="btn btn-primary" onclick="showActivityDetail(${act.id})">Подробнее</button>
                    </div>
                </div>
                <div id="participants-${act.id}" style="margin-top: 1rem; border-top: 1px solid #e5e7eb; padding-top: 0.5rem; display: none;">
                    <strong>📋 Список участников:</strong>
                    <div id="participants-list-${act.id}">Загрузка...</div>
                </div>
                <button class="btn btn-outline" style="margin-top: 0.5rem; font-size: 0.75rem;" onclick="toggleParticipants(${act.id})">👥 Показать участников</button>
            </div>
        `).join('')}
    `;
}

window.toggleParticipants = async (activityId) => {
    const participantsDiv = document.getElementById(`participants-${activityId}`);
    const isVisible = participantsDiv.style.display === 'block';
    
    if (isVisible) {
        participantsDiv.style.display = 'none';
    } else {
        participantsDiv.style.display = 'block';
        await loadParticipantsList(activityId);
    }
};

async function loadParticipantsList(activityId) {
    const listDiv = document.getElementById(`participants-list-${activityId}`);
    
    // Получаем всех участников через API (нужно добавить endpoint на бэкенде)
    try {
        const res = await fetch(`/api/activities/${activityId}/participants`);
        if (res.ok) {
            const participants = await res.json();
            if (participants.length === 0) {
                listDiv.innerHTML = 'Пока нет участников';
            } else {
                listDiv.innerHTML = participants.map(p => `
                    <div style="padding: 0.25rem 0; border-bottom: 1px solid #f3f4f6;">
                        ${p.name} (${p.class || 'класс не указан'}) 
                        ${p.status === 'verified' ? '✅' : p.status === 'materials_uploaded' ? '⏳' : '📝'}
                    </div>
                `).join('');
            }
        } else {
            listDiv.innerHTML = 'Не удалось загрузить список участников';
        }
    } catch (e) {
        listDiv.innerHTML = 'Ошибка загрузки';
    }
}

window.showActivityDetail = async (id) => {
    const act = await fetch(`/api/activities/${id}`).then(r => r.json());
    
    // Проверяем, зарегистрирован ли пользователь
    const uploads = await fetch(`/api/my-uploads/${currentUser.id}`).then(r => r.json());
    const isRegistered = uploads.some(p => p.activity_id === id);
    
    // Загружаем список участников для модального окна
    let participantsHtml = '<p>Загрузка участников...</p>';
    try {
        const participantsRes = await fetch(`/api/activities/${id}/participants`);
        if (participantsRes.ok) {
            const participants = await participantsRes.json();
            if (participants.length === 0) {
                participantsHtml = '<p>Пока нет участников</p>';
            } else {
                participantsHtml = `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                        <strong>👥 Участники (${participants.length}):</strong>
                        <ul style="margin-top: 0.5rem;">
                            ${participants.map(p => `<li>${p.name} (${p.class || 'класс не указан'}) - ${p.status === 'verified' ? '✅ Зачтено' : p.status === 'materials_uploaded' ? '⏳ На проверке' : '📝 Зарегистрирован'}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
        }
    } catch (e) {
        participantsHtml = '<p>Не удалось загрузить участников</p>';
    }
    
    const modalHtml = `
        <div class="modal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <h2>${act.title}</h2>
                <p><strong>Категория:</strong> <span style="background: ${act.category_color || '#3b82f6'}; color: white; padding: 0.25rem 0.5rem; border-radius: 8px;">${act.category_name || 'Без категории'}</span></p>
                <p><strong>📅 Дата:</strong> ${act.date}</p>
                <p><strong>⏰ Дедлайн:</strong> ${act.deadline || 'Не указан'}</p>
                <p><strong>⭐ Баллы:</strong> ${act.points}</p>
                <p><strong>📝 Описание:</strong> ${act.description || 'Нет описания'}</p>
                <p><strong>📋 Требования:</strong> ${act.requirements || 'Не указаны'}</p>
                <p><strong>👥 Участников:</strong> ${act.participants_count || 0}/${act.max_participants || '∞'}</p>
                
                ${participantsHtml}
                
                <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${!isRegistered ? `
                        <button class="btn btn-primary" onclick="registerForActivity(${act.id})">✅ Участвовать</button>
                    ` : `
                        <button class="btn btn-primary" onclick="uploadMaterial(${act.id})">📤 Загрузить материалы</button>
                        <button class="btn btn-outline" disabled style="opacity: 0.6;">✅ Вы уже участвуете</button>
                    `}
                    <button class="btn btn-outline" onclick="closeModal()">Закрыть</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeModal = (e) => {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
};

window.registerForActivity = async (activityId) => {
    const res = await fetch(`/api/activities/${activityId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id })
    });
    
    if (res.ok) {
        alert('✅ Вы успешно зарегистрировались!');
        closeModal();
        loadPage(currentPage);
    } else {
        const err = await res.json();
        alert('❌ Ошибка: ' + err.error);
    }
};

window.uploadMaterial = async (activityId) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,video/*';
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', currentUser.id);
        formData.append('activity_id', activityId);
        
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (res.ok) {
            alert('📤 Материалы загружены! Ожидайте проверки.');
            closeModal();
            loadPage(currentPage);
        } else {
            const err = await res.json();
            alert('❌ Ошибка: ' + err.error);
        }
    };
    fileInput.click();
};

// ============= Мои загрузки =============
async function loadUploads(container) {
    const uploads = await fetch(`/api/my-uploads/${currentUser.id}`).then(r => r.json());
    
    if (uploads.length === 0) {
        container.innerHTML = '<div class="card">📭 У вас пока нет загруженных материалов</div>';
        return;
    }
    
    container.innerHTML = `
        <h2 style="margin-bottom: 1rem;">📤 Мои загрузки</h2>
        ${uploads.map(u => `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                    <div>
                        <h3>${u.activity_title}</h3>
                        <p>Статус: ${u.status === 'verified' ? '✅ Проверено' : u.status === 'materials_uploaded' ? '⏳ На проверке' : '📝 Зарегистрирован'}</p>
                        ${u.awarded_points ? `<p>⭐ Получено баллов: ${u.awarded_points}</p>` : ''}
                        ${u.comment ? `<p>💬 Комментарий: ${u.comment}</p>` : ''}
                        <small>📅 Загружено: ${new Date().toLocaleDateString()}</small>
                    </div>
                    ${u.materials ? `<a href="${u.materials}" target="_blank" class="btn btn-outline">👁️ Просмотреть</a>` : ''}
                </div>
            </div>
        `).join('')}
    `;
}

// ============= Рейтинг классов =============
async function loadRating(container) {
    const rating = await fetch(`/api/rating/${currentUser.school}`).then(r => r.json());
    
    if (rating.length === 0) {
        container.innerHTML = '<div class="card">🏆 Пока нет данных для рейтинга</div>';
        return;
    }
    
    container.innerHTML = `
        <h2 style="margin-bottom: 1rem;">🏆 Рейтинг классов (${currentUser.school})</h2>
        <table class="rating-table">
            <thead>
                <tr><th>🏅 Место</th><th>📚 Класс</th><th>⭐ Всего баллов</th><th>👥 Участников</th></tr>
            </thead>
            <tbody>
                ${rating.map((r, i) => `
                    <tr>
                        <td>${i + 1}${i === 0 ? ' 👑' : ''}</td>
                        <td><strong>${r.class}</strong></td>
                        <td>⭐ ${r.total_points}</td>
                        <td>👥 ${r.participants_count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============= Админ-панель (с удалением) =============
async function loadAdmin(container) {
    if (currentUser.role !== 'organizer') {
        container.innerHTML = '<div class="card">⛔ Доступ запрещен</div>';
        return;
    }
    
    const [activities, categories] = await Promise.all([
        fetch('/api/activities').then(r => r.json()),
        fetch('/api/categories').then(r => r.json())
    ]);
    
    container.innerHTML = `
        <h2 style="margin-bottom: 1rem;">⚙️ Админ-панель</h2>
        
        <div class="card">
            <h3>➕ Создать активность</h3>
            <form onsubmit="createActivity(event)">
                <div class="form-group">
                    <label>Название</label>
                    <input type="text" id="admin-title" required>
                </div>
                <div class="form-group">
                    <label>Описание</label>
                    <textarea id="admin-description" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>Категория</label>
                    <select id="admin-category">
                        ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Дата проведения</label>
                    <input type="date" id="admin-date" required>
                </div>
                <div class="form-group">
                    <label>Баллы</label>
                    <input type="number" id="admin-points" value="10">
                </div>
                <div class="form-group">
                    <label>Макс. участников (0 - без лимита)</label>
                    <input type="number" id="admin-max" value="0">
                </div>
                <div class="form-group">
                    <label>Требования</label>
                    <textarea id="admin-requirements" rows="2"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">✅ Создать активность</button>
            </form>
        </div>
        
        <div class="card">
            <h3>📋 Управление активностями</h3>
            ${activities.length === 0 ? '<p>Нет активностей</p>' : `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="padding: 0.75rem; text-align: left;">Название</th>
                                <th style="padding: 0.75rem; text-align: left;">Дата</th>
                                <th style="padding: 0.75rem; text-align: left;">Баллы</th>
                                <th style="padding: 0.75rem; text-align: left;">Участники</th>
                                <th style="padding: 0.75rem; text-align: center;">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activities.map(act => `
                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                    <td style="padding: 0.75rem;"><strong>${act.title}</strong></td>
                                    <td style="padding: 0.75rem;">${act.date}</td>
                                    <td style="padding: 0.75rem;">⭐ ${act.points}</td>
                                    <td style="padding: 0.75rem;">👥 ${act.participants_count || 0}/${act.max_participants || '∞'}</td>
                                    <td style="padding: 0.75rem; text-align: center;">
                                        <button class="btn btn-outline" style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.75rem; font-size: 0.75rem;" onclick="deleteActivity(${act.id}, '${act.title.replace(/'/g, "\\'")}')">
                                            🗑️ Удалить
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

// Функция удаления активности
window.deleteActivity = async (activityId, activityTitle) => {
    if (confirm(`❌ Вы уверены, что хотите удалить активность "${activityTitle}"?\n\nВместе с ней будут удалены:\n- Все регистрации участников\n- Все загруженные материалы\n\nЭто действие нельзя отменить!`)) {
        try {
            const res = await fetch(`/api/activities/${activityId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (res.ok) {
                alert(`✅ Активность "${activityTitle}" удалена`);
                loadPage('admin'); // Обновляем админ-панель
            } else {
                const err = await res.json();
                alert(`❌ Ошибка: ${err.error}`);
            }
        } catch (e) {
            alert('❌ Ошибка при удалении');
        }
    }
    window.deleteActivityFromModal = async (activityId, activityTitle) => {
    closeModal(); // Закрываем модальное окно
    if (confirm(`❌ Удалить активность "${activityTitle}"?`)) {
        const res = await fetch(`/api/activities/${activityId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
            alert(`✅ Активность "${activityTitle}" удалена`);
            loadPage(currentPage); // Обновляем текущую страницу
        } else {
            const err = await res.json();
            alert(`❌ Ошибка: ${err.error}`);
        }
    }
};
};
