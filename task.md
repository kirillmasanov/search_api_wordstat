Требуется написать веб-приложение, которое реализует функциональность Вордстат.

Приложение должно быть реализовано на FastAPI, для управления зависимостями использовать uv.

Аутентификационные данные - в файле .env (YANDEX_API_KEY, YANDEX_FOLDER_ID).

Функционал реализуется на основе API Wordstat. Описание API в документации (будем использовать REST API):
https://aistudio.yandex.ru/docs/ru/search-api/api-ref/Wordstat/index.html
https://aistudio.yandex.ru/docs/ru/search-api/api-ref/Wordstat/getTop.html
https://aistudio.yandex.ru/docs/ru/search-api/api-ref/Wordstat/getDynamics.html
https://aistudio.yandex.ru/docs/ru/search-api/api-ref/Wordstat/getRegionsDistribution.html
https://aistudio.yandex.ru/docs/ru/search-api/api-ref/Wordstat/getRegionsTree.html

Аутентификация в API:
https://aistudio.yandex.ru/docs/ru/search-api/api-ref/authentication.html?tabs=authentication_service-account

Вот для примера руководства:
Получить топ результатов по ключевой фразе - https://aistudio.yandex.ru/docs/ru/search-api/operations/wordstat-gettop.html
Получить динамику изменений частоты запросов по ключевой фразе - https://aistudio.yandex.ru/docs/ru/search-api/operations/wordstat-getdynamics.html
Получить распределение количества запросов с ключевой фразой по регионам - https://aistudio.yandex.ru/docs/ru/search-api/operations/wordstat-getregionsdistribution.html

Возможно тебе будет полезна информация:
Коды ошибок - https://aistudio.yandex.ru/docs/ru/search-api/reference/error-codes.html
Диагностика ошибок в API - https://aistudio.yandex.ru/docs/ru/search-api/api-ref/support-headers.html
Язык поисковых запросов и поисковые операторы - https://aistudio.yandex.ru/docs/ru/search-api/concepts/search-operators.html
Регионы поиска - https://aistudio.yandex.ru/docs/ru/search-api/reference/regions.html

То что описано выше - это API wordstat в Yandex Cloud.
Сейчас есть wordstat большого Yandex со своей api - https://wordstat.yandex.ru
Хотелось бы повторить функциональность в веб-интерфейсе, на столько на сколько позволяет это API  в Yandex Cloud.
