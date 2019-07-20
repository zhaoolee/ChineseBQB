<h1 align="center">Обновление из-под NexT v5.1.x</h1>

Между версиями 5.1.x и 6.0.x нет жёстких изменений. Версия сменилась на мажорную 6 по следующим причинам:

1. Основной репозиторий перебазировался из профиля [iissnan'а](https://github.com/iissnan/hexo-theme-next) в [theme-next](https://github.com/theme-next) организацию.
2. Большинство библиотек в `next/source/lib` директории были вынесены в [отдельные репозитории под организацией NexT](https://github.com/theme-next).
3. 3rd-party плагин [`hexo-wordcount`](https://github.com/willin/hexo-wordcount) был заменён на [`hexo-symbols-count-time`](https://github.com/theme-next/hexo-symbols-count-time) т.к. `hexo-symbols-count-time` не имеет никаких сторонних nodejs зависимостей, не имеет [языкового фильтра](https://github.com/willin/hexo-wordcount/issues/7) что обеспечивает улучшенную производительность при генерации сайта.

Поэтому, я предлагаю обновиться с версии 5 на версию 6 следующим способом:

1. Вы не трогаете старую директорию `next`, а всего-лишь делаете резервные копии файлов NexT:\
   1.1. `config.yml` или `next.yml` (если Вы использовали [дата-файлы](DATA-FILES.md)).\
   1.2. Пользовательских CSS-стилей, которые расположены в `next/source/css/_custom/*` и `next/source/css/_variables/*` директориях.\
   1.3. Пользовательских layout-стилей, которые расположены в `next/layout/_custom/*`.\
   1.4. Любые другие всевозможные пользовательские изменения, которые могут быть найдены любым инструментом для сравнения файлов.
2. Склонировать новый v6.x репозиторий в любую другую директорию, отличную от `next`. Например, в директорию `next-reloaded`: `git clone https://github.com/theme-next/hexo-theme-next themes/next-reloaded`. Итак, нет необходимости трогать старую NexT 5.1.x директорию и можно работать с новой `next-reloaded`.
3. Открываем главную Hexo-конфигурацию и устанавливаем параметр темы: `theme: next-reloaded`. Так Ваша директория `next-reloaded` должна грузиться при генерации. Если Вы будете наблюдать какие-либо баги или Вам попросту не нравится эта новая версия, в любой момент Вы можете использовать старую 5.1.x.

А как активировать 3rd-party библиотеки, смотрим здесь [здесь](https://github.com/theme-next/hexo-theme-next/blob/master/docs/ru/INSTALLATION.md#%D0%9F%D0%BB%D0%B0%D0%B3%D0%B8%D0%BD%D1%8B).
