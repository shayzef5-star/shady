const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздаем статические файлы из папки public
app.use(express.static('public'));

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Создаем папку для загрузок
if (!fs.existsSync('./public/uploads')) {
    fs.mkdirSync('./public/uploads', { recursive: true });
}

// Подключение к базе данных
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Ошибка БД:', err);
    else console.log('✅ База данных подключена');
});

// Создание таблиц
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'student',
        school TEXT,
        class TEXT,
        points INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        color TEXT DEFAULT '#3b82f6'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        category_id INTEGER,
        date TEXT,
        deadline TEXT,
        points INTEGER,
        max_participants INTEGER DEFAULT 0,
        requirements TEXT,
        organizer_id INTEGER,
        FOREIGN KEY(category_id) REFERENCES categories(id),
        FOREIGN KEY(organizer_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS participations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        activity_id INTEGER,
        status TEXT DEFAULT 'registered',
        materials TEXT,
        awarded_points INTEGER,
        comment TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(activity_id) REFERENCES activities(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        message TEXT,
        type TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Добавляем тестовые категории
    db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
        if (row && row.count === 0) {
            const categories = [
                ['Спорт', '#ef4444'],
                ['Творчество', '#10b981'],
                ['Наука', '#3b82f6'],
                ['Волонтерство', '#f59e0b']
            ];
            categories.forEach(cat => {
                db.run("INSERT INTO categories (name, color) VALUES (?, ?)", cat);
            });
            console.log('✅ Добавлены тестовые категории');
        }
    });

    // Добавляем тестового организатора
    db.get("SELECT COUNT(*) as count FROM users WHERE role = 'organizer'", (err, row) => {
        if (row && row.count === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run("INSERT INTO users (name, email, password, role, school) VALUES (?, ?, ?, ?, ?)",
                ['Администратор', 'admin@school.ru', hashedPassword, 'organizer', 'Школа №1']
            );
            console.log('✅ Добавлен тестовый организатор (admin@school.ru / admin123)');
        }
    });
});

// ============= API РОУТЫ =============

// Регистрация
app.post('/api/register', async (req, res) => {
    const { name, email, password, school, class: className } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(`INSERT INTO users (name, email, password, role, school, class) 
            VALUES (?, ?, ?, 'student', ?, ?)`,
        [name, email, hashedPassword, school, className],
        function(err) {
            if (err) return res.status(400).json({ error: 'Email уже существует' });
            res.json({ id: this.lastID, message: 'Регистрация успешна' });
        }
    );
});

// Вход
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (!user) return res.status(400).json({ error: 'Пользователь не найден' });
        
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Неверный пароль' });
        
        res.json({ id: user.id, name: user.name, role: user.role, school: user.school, class: user.class });
    });
});

// Получить все активности
app.get('/api/activities', (req, res) => {
    db.all(`SELECT a.*, c.name as category_name, c.color as category_color,
            (SELECT COUNT(*) FROM participations WHERE activity_id = a.id) as participants_count
            FROM activities a LEFT JOIN categories c ON a.category_id = c.id
            ORDER BY a.date DESC`, [], (err, rows) => {
        res.json(rows || []);
    });
});

// Получить активность по ID
app.get('/api/activities/:id', (req, res) => {
    db.get(`SELECT a.*, c.name as category_name, c.color as category_color
            FROM activities a LEFT JOIN categories c ON a.category_id = c.id
            WHERE a.id = ?`, [req.params.id], (err, row) => {
        res.json(row);
    });
});

// Получить список участников активности
app.get('/api/activities/:id/participants', (req, res) => {
    db.all(`
        SELECT u.name, u.class, p.status, p.materials, p.awarded_points
        FROM participations p
        JOIN users u ON p.user_id = u.id
        WHERE p.activity_id = ?
        ORDER BY p.status DESC, u.name ASC
    `, [req.params.id], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
        } else {
            res.json(rows || []);
        }
    });
});

// Создать активность
app.post('/api/activities', (req, res) => {
    const { title, description, category_id, date, deadline, points, max_participants, requirements, organizer_id } = req.body;
    db.run(`INSERT INTO activities (title, description, category_id, date, deadline, points, max_participants, requirements, organizer_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, category_id, date, deadline, points, max_participants, requirements, organizer_id],
        function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Удалить активность
app.delete('/api/activities/:id', (req, res) => {
    const activityId = req.params.id;
    
    db.run("DELETE FROM participations WHERE activity_id = ?", [activityId], function(err) {
        db.run("DELETE FROM activities WHERE id = ?", [activityId], function(err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            res.json({ message: 'Активность успешно удалена' });
        });
    });
});

// Зарегистрироваться на активность
app.post('/api/activities/:id/register', (req, res) => {
    const { user_id } = req.body;
    const activity_id = req.params.id;
    
    db.get("SELECT max_participants FROM activities WHERE id = ?", [activity_id], (err, activity) => {
        db.get("SELECT COUNT(*) as count FROM participations WHERE activity_id = ?", [activity_id], (err, part) => {
            if (activity && activity.max_participants > 0 && part.count >= activity.max_participants) {
                return res.status(400).json({ error: 'Нет свободных мест' });
            }
            
            db.get("SELECT * FROM participations WHERE user_id = ? AND activity_id = ?", [user_id, activity_id], (err, existing) => {
                if (existing) return res.status(400).json({ error: 'Вы уже зарегистрированы' });
                
                db.run("INSERT INTO participations (user_id, activity_id) VALUES (?, ?)", [user_id, activity_id], function(err) {
                    if (err) return res.status(400).json({ error: err.message });
                    res.json({ message: 'Успешно зарегистрированы' });
                });
            });
        });
    });
});

// Загрузить материалы
app.post('/api/upload', upload.single('file'), (req, res) => {
    const { user_id, activity_id } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    
    db.get("SELECT id FROM participations WHERE user_id = ? AND activity_id = ?", [user_id, activity_id], (err, part) => {
        if (!part) return res.status(400).json({ error: 'Вы не зарегистрированы на эту активность' });
        
        db.run("UPDATE participations SET materials = ?, status = 'materials_uploaded' WHERE id = ?", 
            [fileUrl, part.id], function(err) {
                res.json({ message: 'Материалы загружены', file: fileUrl });
            });
    });
});

// Получить мои загрузки
app.get('/api/my-uploads/:user_id', (req, res) => {
    db.all(`SELECT p.*, a.title as activity_title, a.points as activity_points
            FROM participations p
            JOIN activities a ON p.activity_id = a.id
            WHERE p.user_id = ? AND p.materials IS NOT NULL
            ORDER BY p.id DESC`, [req.params.user_id], (err, rows) => {
        res.json(rows || []);
    });
});

// Получить рейтинг классов
app.get('/api/rating/:school', (req, res) => {
    db.all(`SELECT class, SUM(points) as total_points, COUNT(*) as participants_count
            FROM users
            WHERE school = ? AND class IS NOT NULL AND class != ''
            GROUP BY class
            ORDER BY total_points DESC`, [req.params.school], (err, rows) => {
        res.json(rows || []);
    });
});

// Получить категории
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories", [], (err, rows) => {
        res.json(rows || []);
    });
});

// Проверка материалов
app.post('/api/review/:participation_id', (req, res) => {
    const { awarded_points, comment, status } = req.body;
    db.run(`UPDATE participations SET awarded_points = ?, comment = ?, status = ? WHERE id = ?`,
        [awarded_points, comment, status, req.params.participation_id], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            
            db.get("SELECT user_id FROM participations WHERE id = ?", [req.params.participation_id], (err, part) => {
                if (awarded_points && part) {
                    db.run("UPDATE users SET points = points + ? WHERE id = ?", [awarded_points, part.user_id]);
                }
            });
            res.json({ message: 'Проверено' });
        });
});

// Получить уведомления
app.get('/api/notifications/:user_id', (req, res) => {
    db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", [req.params.user_id], (err, rows) => {
        res.json(rows || []);
    });
});

// ============= ОТДАЧА ФРОНТЕНДА =============
// Все GET запросы, которые не начинаются с /api, отдаем index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📱 Открыть: http://localhost:${PORT}`);
});
