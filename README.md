# CUPRA TERRAMAR — Interactive 3D Film

React + TypeScript + Three.js (React Three Fiber) приложение.
Скролл-управляемый кинематографический опыт: Studio → Day → Sunset → Night → Rain → Finale.
Постпроцессинг: Bloom, Depth of Field, Vignette, Film Grain.
Конфигуратор: цвет кузова, ambient-подсветка, двери (реальные анимации модели), exploded view.

## Запуск локально
    npm install
    npm run dev

## Деплой (GitHub → Vercel), как делали раньше
1. Создайте новый репозиторий на github.com (например `cupra`).
2. Загрузите ВСЕ файлы проекта, кроме папок node_modules и dist
   (кнопка Add file → Upload files; каждый файл < 25 МБ, включая модель 6.5 МБ —
   веб-загрузчик пропустит; можно и через терминал: git init, add, commit, push).
3. Vercel → Add New → Project → Import репозиторий.
   - Framework Preset: Vite (определится сам)
   - Build Command: npm run build
   - Output Directory: dist
4. Deploy → Visit.

## Структура
    public/cupra-terramar.glb   — 3D-модель (сжата с 30 МБ до 6.5 МБ: meshopt + WebP)
    src/App.tsx                 — Canvas, эффекты, синхронизация скролла
    src/components/Stage.tsx    — свет, фазы окружения, дождь, пол
    src/components/CarModel.tsx — модель: краска, DRL, двери, explode
    src/components/CameraRig.tsx— кинематографическая камера + parallax
    src/components/Overlay.tsx  — preloader, START, HUD, панели, конфигуратор
