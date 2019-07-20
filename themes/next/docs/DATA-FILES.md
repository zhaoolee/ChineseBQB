<h1 align="center">Data Files</h1>

Currently, it is not smooth to update NexT theme from pulling or downloading new releases. It is quite often running into conflict status when updating NexT theme via `git pull`, or need to merge configurations manually when upgrading to new releases.

 At present, NexT encourages users to store some options in site's `_config.yml` and other options in theme's `_config.yml`. This approach is applicable, but has some drawbacks:
1. Configurations are splitted into two pieces
2. Users may be confused which place should be for options

In order to resolve this issue, NexT will take advantage of Hexo [Data files](https://hexo.io/docs/data-files.html). Because Data files is introduced in Hexo 3, so you need upgrade Hexo to 3.0 (or above) to use this feature.

If you prefer Hexo 2.x, you can still use the old approach for configurations. NexT is still compatible with Hexo 2.x (but errors are possible).

<h2 align="center">Option 1: Hexo-Way</h2>

With this way, all your configurations locate in main hexo config file (`hexo/_config.yml`), you don't need to touch `next/_config.yml` or create any new files. But you must preserve double spaces indents within `theme_config` option.

If there are any new options in new releases, you just need to copy those options from `next/_config.yml`, paste into `hexo/_config.yml` and set their values to whatever you want.

### Usage

1. Check for no exists `hexo/source/_data/next.yml` file (delete it if exists).
2. Copy needed NexT theme options from theme's `next/_config.yml` into `hexo/_config.yml`, then\
   2.1. Move all this settings to the right with two spaces (in Visual Studio Code: select all strings, <kbd>CTRL</kbd> + <kbd>]</kbd>).\
   2.2. Add `theme_config:` parameter above all this settings.

### Useful links

* [Hexo Configuration](https://hexo.io/docs/configuration.html)
* [Hexo Pull #757](https://github.com/hexojs/hexo/pull/757)

<h2 align="center">Option 2: NexT-Way</h2>

With this way, you can put all your configurations into one place (`source/_data/next.yml`), you don't need to touch `next/_config.yml`.
But option may not accurately procces all hexo external libraries with their additional options (for example, `hexo-server` module options may be readed only in default hexo config).

If there are any new options in new releases, you just need to copy those options from `next/_config.yml`, paste into `_data/next.yml` and set their values to whatever you want.

### Usage

1. Please ensure you are using Hexo 3 (or above).
2. Create an file named `next.yml` in site's `hexo/source/_data` directory (create `_data` directory if it did not exists).

<p align="center">And after that steps there are <b>2 variants</b>, need to <b>choose only one</b> of them and <b>resume next steps</b>.</p>

* **Variant 1: `override: false` (default)**:

  1. Check your `override` option in default NexT config, it must set on `false`.\
     In `next.yml` it must not be defined or set on `false` too.
  2. Copy needed options from both site's `_config.yml` and theme's `_config.yml` into `hexo/source/_data/next.yml`.

* **Variant 2: `override: true`**:

  1. In `next.yml` set `override` option on `true`.
  2. Copy **all** NexT theme options from theme's `next/_config.yml` into `hexo/source/_data/next.yml`.

3. Then, in main site's `hexo/_config.yml` need to define `theme: next` option (and if needed, `source_dir: source`).
4. Use standart parameters to start server, generate or deploy (`hexo clean && hexo g -d && hexo s`).

### Useful links

* [NexT Issue #328](https://github.com/iissnan/hexo-theme-next/issues/328)
