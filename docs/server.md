# Сервер для выкладки

Подготовлен 22.11.2026. Секретов здесь нет: ключи и пароли лежат только в `.env` на сервере.

## Где

| Что | Значение |
| --- | --- |
| Облако | Yandex Cloud, зона `ru-central1-a`, ВМ `dekanat` |
| Конфигурация | Ubuntu 24.04, 2 vCPU (50%), 2 ГБ RAM + swap 2 ГБ, HDD 20 ГБ |
| IP | `62.84.113.209` (статический) |
| Адрес сайта | `62-84-113-209.sslip.io` → `DOMAIN` в `.env`, Caddy сам получит HTTPS |
| Вход | `ssh dekanat` (алиас в `~/.ssh/config`) = `ssh -p 2222 -i ~/.ssh/dekanat_vps deploy@62.84.113.209` |
| Папка проекта | `/opt/dekanat` (владелец `deploy`) |
| Оплата | грант Yandex Cloud 4 000 ₽ до 21.01.2027, ≈ 1 814 ₽/мес |

**Порт SSH — 2222.** Порт 22 тоже открыт, но VPN на компьютере разработчика его режет.

## Что установлено

- Docker 29 и docker compose v2 из репозитория Ubuntu (`download.docker.com` из РФ работает ненадёжно).
- Зеркало реестра `mirror.gcr.io` в `/etc/docker/daemon.json`: Docker Hub ограничивает IP из РФ. `postgres:18-alpine`, `caddy:2-alpine` и `node:22.13-alpine` скачиваются.
- Ротация логов Docker: 10 МБ × 3 файла.
- ufw открывает только 22, 2222, 80 и 443. fail2ban включён, unattended-upgrades включён.
- SSH пускает только по ключу, вход под root запрещён.

## Особенности

- Сборка Next.js на 2 ГБ RAM и 50% CPU идёт медленно. Swap спасает от OOM. Если сборка будет мешать, образ можно собирать в GitHub Actions и только скачивать на сервер.
- Диск HDD, а не SSD: новым аккаунтам Яндекс даёт всего 10 ГБ SSD на зону.
## GigaChat

- Проект «Цифровой деканат» в Studio, Freemium: до 22.11.2027 бесплатно 250 млн токенов Lite, 40 млн Pro, 25 млн Max и 50 млн Ultra, запросы идут в 1 поток.
- Ключ `GIGACHAT_AUTH_KEY` уже лежит в `.env` локально и в `/opt/dekanat/.env` на сервере (права 600). В git его нет.
- Токен: `POST https://ngw.devices.sberbank.ru:9443/api/v2/oauth`, scope `GIGACHAT_API_PERS`, действует 30 мин. Запросы к API идут на `https://api.giga.chat/v1/...`.
- Проверено 22.11.2026 с сервера: токен выдаётся, `/v1/models` отвечает (GigaChat-2, -2-Pro, -2-Max, GigaChat-3-Lightning/Pro/Ultra), `chat/completions` работает.
- **У `ngw.devices.sberbank.ru` сертификат НУЦ Минцифры.** На хосте сертификат установлен в системное хранилище. Node внутри контейнера его не видит. Публичные сертификаты лежат в `docker/certs/`: в образ или контейнер нужно передать `NODE_EXTRA_CA_CERTS=/app/certs/russian_trusted_ca_bundle.pem`. Для локальной разработки — то же самое с путём `docker/certs/russian_trusted_ca_bundle.pem`. Отключать проверку TLS (`NODE_TLS_REJECT_UNAUTHORIZED=0`) нельзя.

## После конкурса

Удалить ВМ **и** статический IP в консоли Yandex Cloud (раздел VPC → IP-адреса). Статический адрес тарифицируется даже без машины. Когда грант кончится, деньги начнут списываться с привязанной карты.
