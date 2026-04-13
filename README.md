# Yandex Wordstat Dashboard

Веб-интерфейс для работы с [Yandex Search API Wordstat](https://aistudio.yandex.ru/docs/ru/search-api/concepts/wordstat) — анализ поисковых запросов, динамики и региональной статистики.

![Python](https://img.shields.io/badge/Python-3.12+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Возможности

- **Топ запросов** — похожие и связанные запросы с количеством показов (до 2000 результатов)
- **Динамика** — графики частоты запросов и доли за выбранный период (день/неделя/месяц) с интерактивным календарём
- **Регионы** — распределение запросов по городам и регионам с сортировкой по колонкам
- **Raw API** — просмотр и копирование сырых JSON-ответов API
- Фильтрация по устройствам (десктоп, телефон, планшет)
- Автообновление результатов при изменении любого фильтра
- Сохранение состояния фильтров в localStorage

## Стек

| Слой | Технологии |
|------|-----------|
| Backend | Python, FastAPI, Uvicorn, Httpx, Jinja2 |
| Frontend | Vanilla JS, Chart.js, CSS3 |
| Инфра | Docker, Docker Compose, uv |

## Быстрый старт

### Предварительные требования

- [API-ключ](https://aistudio.yandex.ru/docs/ru/search-api/operations/wordsearch#api-key_1) Yandex Cloud и ID каталога (роль `search-api.webSearch.user`)
- Python 3.12+ или Docker

### Установка

1. Клонируйте репозиторий:

```bash
git clone https://github.com/your-username/search_api_wordstat.git
cd search_api_wordstat
```

2. Создайте `.env` файл:

```env
YANDEX_API_KEY=your_api_key
YANDEX_FOLDER_ID=your_folder_id
```

3. Запустите одним из способов:

**Docker Compose (рекомендуется):**

```bash
docker compose up
```

**Локально через uv:**

```bash
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Приложение будет доступно по адресу `http://localhost:8000`.

## Структура проекта

```
app/
├── main.py                # Инициализация FastAPI, маршруты страниц
├── config.py              # Настройки (Pydantic Settings)
├── wordstat_client.py     # Async-клиент Yandex Wordstat API
├── routes/
│   └── api.py             # API-эндпоинты (POST /api/top, /api/dynamics, /api/regions)
├── templates/             # Jinja2-шаблоны (top, dynamics, regions, raw)
└── static/
    ├── app.js             # Фронтенд-логика
    └── style.css          # Стили
```

## API приложения

Приложение проксирует запросы к [Yandex Wordstat API](https://aistudio.yandex.ru/docs/ru/search-api/concepts/wordstat#api) (`searchapi.api.cloud.yandex.net/v2/wordstat`), автоматически подставляя `folderId` и авторизацию.

| Метод | Эндпоинт | Yandex API | Описание |
|-------|----------|------------|----------|
| POST | `/api/top` | [GetTop](https://aistudio.yandex.ru/docs/ru/search-api/operations/wordstat-gettop) | Топ связанных и похожих запросов (до 2000) |
| POST | `/api/dynamics` | [GetDynamics](https://aistudio.yandex.ru/docs/ru/search-api/operations/wordstat-getdynamics) | Динамика запросов за период (день/неделя/месяц) |
| POST | `/api/regions` | [GetRegionsDistribution](https://aistudio.yandex.ru/docs/ru/search-api/operations/wordstat-getregionsdistribution) | Распределение по регионам и городам |
| GET | `/api/regions-tree` | [GetRegionsTree](https://aistudio.yandex.ru/docs/ru/search-api/operations/wordstat-getregiontree) | Дерево регионов |
| GET | `/health` | — | Health check |
