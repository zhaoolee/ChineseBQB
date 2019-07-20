<h1 align="center">Installation</h1>

<h2 align="center">Step 1 &rarr; Go to Hexo dir</h2>

Change dir to **hexo root** directory. There must be `node_modules`, `source`, `themes` and other directories:
   ```sh
   $ cd hexo
   $ ls
   _config.yml  node_modules  package.json  public  scaffolds  source  themes
   ```

<h2 align="center">Step 2 &rarr; Get NexT</h2>

<p align="center">Download theme from GitHub.</br>
There are <b>3 options</b> to do it, need to <b>choose only one</b> of them.</p>

### Option 1: Download [latest release version][releases-latest-url]

   At most cases **stable**. Recommended for beginners.

   * Install with [curl & tar & wget][curl-tar-wget-url]:

     ```sh
     $ mkdir themes/next
     $ curl -s https://api.github.com/repos/theme-next/hexo-theme-next/releases/latest | grep tarball_url | cut -d '"' -f 4 | wget -i - -O- | tar -zx -C themes/next --strip-components=1
     ```
     This variant will give to you **only latest release version** (without `.git` directory inside).\
     So, there is impossible to update this version with `git` later.\
     Instead you always can use separate configuration (e.g. [data-files][docs-data-files-url]) and download new version inside old directory (or create new directory and redefine `theme` in Hexo config), without losing your old configuration.

### Option 2: Download [tagged release version][releases-url]

   In rare cases useful, but not recommended.\
   You must define version. Replace `v6.0.0` with any version from [tags list][tags-url].

   * Variant 1: Install with [curl & tar][curl-tar-url]:

     ```sh
     $ mkdir themes/next
     $ curl -L https://api.github.com/repos/theme-next/hexo-theme-next/tarball/v6.0.0 | tar -zxv -C themes/next --strip-components=1
     ```
     Same as above under `curl & tar & wget` variant, but will download **only concrete version**.

   * Variant 2: Install with [git][git-url]:

     ```sh
     $ git clone --branch v6.0.0 https://github.com/theme-next/hexo-theme-next themes/next
     ```
     This variant will give to you the **defined release version** (with `.git` directory inside).\
     And in any time you can switch to any tagged release, but with limit to defined version.

### Option 3: Download [latest master branch][download-latest-url]

   May be **unstable**, but includes latest features. Recommended for advanced users and for developers.

   * Variant 1: Install with [curl & tar][curl-tar-url]:

     ```sh
     $ mkdir themes/next
     $ curl -L https://api.github.com/repos/theme-next/hexo-theme-next/tarball | tar -zxv -C themes/next --strip-components=1
     ```
     Same as above under `curl & tar & wget` variant, but will download **only latest master branch version**.\
     At some cases useful for developers.

   * Variant 2: Install with [git][git-url]:

     ```sh
     $ git clone https://github.com/theme-next/hexo-theme-next themes/next
     ```

     This variant will give to you the **whole repository** (with `.git` directory inside).\
     And in any time you can [update current version with git][update-with-git-url] and switch to any tagged release or on latest master or any other branch.\
     At most cases useful as for users and for developers.

     Get tags list:

     ```sh
     $ cd themes/next
     $ git tag -l
     …
     v6.0.0
     v6.0.1
     v6.0.2
     ```

     For example, you want to switch on `v6.0.1` [tagged release version][tags-url]. Input the following command:

     ```sh
     $ git checkout tags/v6.0.1
     Note: checking out 'tags/v6.0.1'.
     …
     HEAD is now at da9cdd2... Release v6.0.1
     ```

     And if you want to switch back on [master branch][commits-url], input this command:

     ```sh
     $ git checkout master
     ```

<h2 align="center">Step 3 &rarr; Set it up</h2>

Set theme in main **hexo root config** `_config.yml` file:

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

[update-with-git-url]: https://github.com/theme-next/hexo-theme-next/blob/master/README.md#update
[docs-data-files-url]: https://github.com/theme-next/hexo-theme-next/blob/master/docs/DATA-FILES.md
