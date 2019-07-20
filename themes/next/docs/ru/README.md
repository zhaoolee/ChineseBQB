<div align="right">Язык: <a title="Английский" href="../../README.md">:us:</a>
<a title="Китайский" href="../../docs/zh-CN/README.md">:cn:</a>
:ru:</div>

# <div align="center"><a title="Репозиторий сайта NexT" href="https://github.com/theme-next/theme-next.org"><img align="center" width="56" height="56" src="https://raw.githubusercontent.com/theme-next/hexo-theme-next/master/source/images/logo.svg?sanitize=true"></a> e x T</div>

<p align="center">«NexT» — элегантная высококачественная тема под <a href="http://hexo.io">Hexo</a>. Сделана с нуля, с любовью.</p>

<p align="center">
  <a href="https://bestpractices.coreinfrastructure.org/projects/2625"><img src="https://bestpractices.coreinfrastructure.org/projects/2625/badge" title="Инициатива базовой инфраструктуры: передовой опыт"></a>
  <a href="https://www.codacy.com/app/theme-next/hexo-theme-next?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=theme-next/hexo-theme-next&amp;utm_campaign=Badge_Grade"><img src="https://api.codacy.com/project/badge/Grade/72f7fe7609c2438a92069f448e5a341a" title="Оценка проекта"></a>
  <a href="https://travis-ci.org/theme-next/hexo-theme-next?branch=master"><img src="https://travis-ci.org/theme-next/hexo-theme-next.svg?branch=master" title="Travis CI [Linux]"></a>
  <a href="https://crwd.in/theme-next"><img src="https://d322cqt584bo4o.cloudfront.net/theme-next/localized.svg" title="Добавить или улучшить перевод за несколько секунд!"></a>
  <a href="https://github.com/theme-next/hexo-theme-next/releases"><img src="https://badge.fury.io/gh/theme-next%2Fhexo-theme-next.svg"></a>
  <a href="http://hexo.io"><img src="https://img.shields.io/badge/hexo-%3E%3D%203.5.0-blue.svg"></a>
  <a href="https://github.com/theme-next/hexo-theme-next/blob/master/LICENSE.md"><img src="https://img.shields.io/badge/license-%20AGPL-blue.svg"></a>
</p>

## Демо

* :heart_decoration: Muse тема: [LEAFERx](https://leaferx.online) | [Alex LEE](http://saili.science) | [Miaia](https://11.tt)
* :six_pointed_star: Mist тема: [uchuhimo](http://uchuhimo.me) | [xirong](http://www.ixirong.com)
* :pisces: Pisces тема: [Vi](http://notes.iissnan.com) | [Acris](https://acris.me) | [Jiaxi He](http://jiaxi.io)
* :gemini: Gemini тема: [Ivan.Nginx](https://almostover.ru) | [Raincal](https://raincal.com) | [Dandy](https://dandyxu.me)

Больше примеров «NexT» [здесь](https://github.com/iissnan/hexo-theme-next/issues/119).

## Установка

Простейший вариант установки — склонировать весь репозиторий:

   ```sh
   $ cd hexo
   $ git clone https://github.com/theme-next/hexo-theme-next themes/next
   ```

Или предлагаю почитать [детальные инструкции по установке][docs-installation-url], если вариант выше не устраивает.

## Плагины

В конфиге NexT'а теперь можно найти зависимости на каждый модуль, который был вынесен во внешние репозитории, которые могут быть найдены по [ссылке основной организации](https://github.com/theme-next).

Например, Вы хотите использовать `fancybox` для своего сайта. Открываем конфиг NexT'а и находим:

```yml
# Fancybox
# Dependencies: https://github.com/theme-next/theme-next-fancybox
fancybox: false
```

Затем включаем параметр `fancybox` и переходим по ссылке «Dependencies» с дальнейшеми инструкциями по установке этого модуля.

## Обновление

Можно обновить до последней мастер-ветки следующей командой:

```sh
$ cd themes/next
$ git pull
```

А если всплывают ошибки во время обновления (что-то наподобии **«Commit your changes or stash them before you can merge»**), рекомендуется ознакомиться с особенностью хранения [дата-файлов в Hexo][docs-data-files-url].\
Как бы то ни было, можно обойти ошибки при обновлении если «Закомитить», «Стэшнуть» или «Откатить» локальные изменения. Смотрим  [здесь](https://stackoverflow.com/a/15745424/5861495) как это сделать.

**Если нужно обновиться с версии v5.1.x на v6.0.x, читаем [здесь][docs-update-5-1-x-url].**

## Известные баги

Для тех, кто столкнулся с ошибкой **«[Error: Cannot find module 'hexo-util'](https://github.com/iissnan/hexo-theme-next/issues/1490)»**, следует проверить версию NPM.

* `> 3`: Всё равно не работает? Удалите директорию `node_modules` и переустановите с помощью `npm install`.
* `< 3`: Добавьте `hexo-util` принудительно командой `npm install --save-dev hexo-util` к основным пакетам с Hexo.

## Содействие

Приветсвуется любое содействие, не стесняйтесь сообщать «Баги», брать «Форки» и вливать «Пулы».

## Обратная связь

* Задать вопрос на [Stack Overflow][stack-url].
* Сообщить об ошибке в разделе [GitHub Issues][issues-bug-url].
* Запросить новую возможность на [GitHub][issues-feat-url].
* Голосовать за [популярные запросы возможностей][feat-req-vote-url].
* Вступить в наши [Gitter][gitter-url] / [Riot][riot-url] / [Telegram][t-chat-url] чаты.
* Подписаться на новости через [канал Telegram'а][t-news-url].

## Сторонние приложения

* :triangular_flag_on_post: <a title="Маркдаун Редактор под Hexo" href="https://github.com/zhuzhuyule/HexoEditor" target="_blank">HexoEditor</a>

## Благодарности

<p align="center">
«NexT» выражает особую благодарность этим замечательным сервисам, которые спонсируют нашу основную инфраструктуру:
</p>

<p align="center"><a href="https://github.com"><img align="center" width="100" src="https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png"></a>
&nbsp;<a href="https://www.netlify.com"><img align="center" width="150" src="https://cdn.netlify.com/15ecf59b59c9d04b88097c6b5d2c7e8a7d1302d0/1b6d6/img/press/logos/full-logo-light.svg"></a></p>
<p align="center">
  <sub>GitHub позволяет нам хостить Git-репозиторий, Netlify позволяет нам деплоить документацию.</sub>
</p>

<p align="center"><a href="https://crowdin.com"><img align="center" width="180" src="https://support.crowdin.com/assets/logos/crowdin-logo1-small.png"></a></p>
<p align="center">
  <sub>Crowdin позволяет нам удобно переводить документацию.</sub>
</p>

<p align="center"><a href="https://codacy.com"><img align="center" width="155" src="https://user-images.githubusercontent.com/16944225/55026017-623f8f00-5002-11e9-88bf-0d6a5884c6c2.png"></a>
&nbsp;<a href="https://www.browserstack.com"><img align="center" width="140" src="https://www.browserstack.com/images/mail/browserstack-logo-footer.png"></a></p>
<p align="center">
  <sub>Codacy позволяет нам запускать набор тестов, BrowserStack позволяет нам тестировать в реальных браузерах.</sub>
</p>

[browser-image]: https://img.shields.io/badge/browser-%20chrome%20%7C%20firefox%20%7C%20opera%20%7C%20safari%20%7C%20ie%20%3E%3D%209-lightgrey.svg
[browser-url]: https://www.browserstack.com

[stack-url]: https://stackoverflow.com/questions/tagged/theme-next
[issues-bug-url]: https://github.com/theme-next/hexo-theme-next/issues/new?assignees=&labels=Bug&template=bug-report.md
[issues-feat-url]: https://github.com/theme-next/hexo-theme-next/issues/new?assignees=&labels=Feature+Request&template=feature-request.md
[feat-req-vote-url]: https://github.com/theme-next/hexo-theme-next/issues?q=is%3Aopen+is%3Aissue+label%3A%22Feature+Request%22+sort%3Areactions-%2B1-desc

[gitter-url]: https://gitter.im/theme-next
[riot-url]: https://riot.im/app/#/room/#theme-next:matrix.org
[t-chat-url]: https://t.me/theme_next
[t-news-url]: https://t.me/theme_next_news

<!--[rel-image]: https://img.shields.io/github/release/theme-next/hexo-theme-next.svg-->
<!--[rel-image]: https://badge.fury.io/gh/theme-next%2Fhexo-theme-next.svg-->
<!--[mnt-image]: https://img.shields.io/maintenance/yes/2018.svg-->

[download-latest-url]: https://github.com/theme-next/hexo-theme-next/archive/master.zip
[releases-latest-url]: https://github.com/theme-next/hexo-theme-next/releases/latest
<!--[releases-url]: https://github.com/theme-next/hexo-theme-next/releases-->
[tags-url]: https://github.com/theme-next/hexo-theme-next/tags
[commits-url]: https://github.com/theme-next/hexo-theme-next/commits/master

[docs-installation-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/ru/INSTALLATION.md
[docs-data-files-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/ru/DATA-FILES.md
[docs-update-5-1-x-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/ru/UPDATE-FROM-5.1.X.md
