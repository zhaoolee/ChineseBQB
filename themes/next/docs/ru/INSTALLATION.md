<h1 align="center">Установка</h1>

<h2 align="center">Шаг 1 &rarr; Идём в директорию Hexo</h2>

Меняем каталог на **корневой hexo**. Там должны находиться `node_modules`, `source`, `themes` и другие папки:
   ```sh
   $ cd hexo
   $ ls
   _config.yml  node_modules  package.json  public  scaffolds  source  themes
   ```

<h2 align="center">Шаг 2 &rarr; Скачиваем NexT</h2>

<p align="center">Скачиваем тему с GitHub.</br>
Имеются <b>3 способа</b> как зделать это, нужно <b>выбрать только 1</b> из них.</p>

### Способ 1: Скачиваем [последнюю версию релиза][releases-latest-url]

   В большинстве случаев **стабильна**. Рекомендуется для начинающих пользователей.

   * Установка с помощью [curl & tar & wget][curl-tar-wget-url]:

     ```sh
     $ mkdir themes/next
     $ curl -s https://api.github.com/repos/theme-next/hexo-theme-next/releases/latest | grep tarball_url | cut -d '"' -f 4 | wget -i - -O- | tar -zx -C themes/next --strip-components=1
     ```
     Этим способом Вы скачаете **только последнюю версию релиза** (без директории `.git` внутри).\
     Поэтому, в дальнейшем будет невозможно обновить эту версию через `git`.\
     Зато всегда можно использовать отдельную конфигурацию (т.е. [дата-файлы][docs-data-files-url]) и скачивать новую версию перезаписывая старую (или создать новый каталог и переопределить параметр `theme` в конфиге Hexo), без потери старой конфигурации.

### Способ 2: Скачиваем [указанную версию релиза][releases-url]

   В редких случаях полезно, но не рекомендуется.\
   Необходимо указать версию. Замените `v6.0.0` на любую версию из [списка тэгов][tags-url].

   * Вариант 1: Установка с помощью [curl & tar][curl-tar-url]:

     ```sh
     $ mkdir themes/next
     $ curl -L https://api.github.com/repos/theme-next/hexo-theme-next/tarball/v6.0.0 | tar -zxv -C themes/next --strip-components=1
     ```
     То же, что и описано выше в способе `curl & tar & wget`, но скачает **только конкретную версию**.

   * Вариант 2: Установка с помощью [git][git-url]:

     ```sh
     $ git clone --branch v6.0.0 https://github.com/theme-next/hexo-theme-next themes/next
     ```
     Этот вариант скачает **указанную версию релиза** (включая директорию `.git` внутри).\
     И в любой момент Вы можете переключиться на любую весию тэга, но с лимитом до указанной версии.

### Способ 3: Скачиваем [последнюю мастер-ветку][download-latest-url]

   Иногда может быть **нестабильна**, но включает самые последние нововведения. Рекомендуется для продвинутых пользователей и для разработчиков.

   * Вариант 1: Установка с помощью [curl & tar][curl-tar-url]:

     ```sh
     $ mkdir themes/next
     $ curl -L https://api.github.com/repos/theme-next/hexo-theme-next/tarball | tar -zxv -C themes/next --strip-components=1
     ```
     То же, что и описано выше в варианте `curl & tar & wget`, но скачает **только последнюю мастер-ветку**.\
     В некоторых случаях полезно для разработчиков.

   * Вариант 2: Установка с помощью [git][git-url]:

     ```sh
     $ git clone https://github.com/theme-next/hexo-theme-next themes/next
     ```

     Этот вариант скачает **весь репозиторий** (включая директорию `.git` внутри).\
     И в любой момент Вы можете [обновить текущую версию через git][update-with-git-url] и переключиться на любую версию тэга или на последнюю мастер или любую другую ветку.\
     В большинстве случаев полезно как для пользователей, так и для разработчиков.

     Смотрим список тэгов:

     ```sh
     $ cd themes/next
     $ git tag -l
     …
     v6.0.0
     v6.0.1
     v6.0.2
     ```

     Например, Вы хотите переключиться на [версию релиза][tags-url] `v6.0.1`. Вводим следующую команду:

     ```sh
     $ git checkout tags/v6.0.1
     Note: checking out 'tags/v6.0.1'.
     …
     HEAD is now at da9cdd2... Release v6.0.1
     ```

     И если вы хотите переключиться обратно на [мастер-ветку][commits-url], вводим следующее:

     ```sh
     $ git checkout master
     ```

<h2 align="center">Шаг 3 &rarr; Конфигурируем</h2>

Устанавливаем параметр темы в конфиге `_config.yml` **корневой директории hexo**:

```yml
theme: next
```

[download-latest-url]: https://github.com/theme-next/hexo-theme-next/archive/master.zip
[releases-latest-url]: https://github.com/theme-next/hexo-theme-next/releases/latest
[releases-url]: https://github.com/theme-next/hexo-theme-next/releases
[tags-url]: https://github.com/theme-next/hexo-theme-next/tags
[commits-url]: https://github.com/theme-next/hexo-theme-next/commits/master

[git-url]: http://lmgtfy.com/?q=linux+git+install
[curl-tar-url]: http://lmgtfy.com/?q=linux+curl+tar+install
[curl-tar-wget-url]: http://lmgtfy.com/?q=linux+curl+tar+wget+install

[update-with-git-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/ru/README.md#%D0%A3%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0
[docs-data-files-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/ru/DATA-FILES.md
