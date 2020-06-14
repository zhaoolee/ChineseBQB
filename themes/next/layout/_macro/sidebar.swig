{% macro render(is_post) %}
  <div class="sidebar-toggle">
    <div class="sidebar-toggle-line-wrap">
      <span class="sidebar-toggle-line sidebar-toggle-line-first"></span>
      <span class="sidebar-toggle-line sidebar-toggle-line-middle"></span>
      <span class="sidebar-toggle-line sidebar-toggle-line-last"></span>
    </div>
  </div>

  <aside id="sidebar" class="sidebar">
    <div class="sidebar-inner">

      {% set display_toc = is_post and theme.toc.enable or is_page and theme.toc.enable %}

      {% if display_toc and toc(page.content).length > 1 %}
        <ul class="sidebar-nav motion-element">
          <li class="sidebar-nav-toc sidebar-nav-active" data-target="post-toc-wrap">
            {{ __('sidebar.toc') }}
          </li>
          <li class="sidebar-nav-overview" data-target="site-overview-wrap">
            {{ __('sidebar.overview') }}
          </li>
        </ul>
      {% endif %}

      <div class="site-overview-wrap sidebar-panel{% if not display_toc or toc(page.content).length <= 1 %} sidebar-panel-active{% endif %}">
        <div class="site-overview">
          <div class="site-author motion-element" itemprop="author" itemscope itemtype="http://schema.org/Person">
            {% if theme.avatar.url %}
              <img class="site-author-image" itemprop="image"
                src="{{ url_for( theme.avatar.url | default(theme.images + '/avatar.gif') ) }}"
                alt="{{ author }}"/>
            {% endif %}
              <p class="site-author-name" itemprop="name">{{ author }}</p>
              <div class="site-description motion-element" itemprop="description">{{ description }}</div>
          </div>

          {% if theme.site_state %}
            <nav class="site-state motion-element">
              {% if config.archive_dir != '/' and site.posts.length > 0 %}
                <div class="site-state-item site-state-posts">
                {% if theme.menu.archives %}
                  <a href="{{ url_for(theme.menu.archives).split('||')[0] | trim }}">
                {% else %}
                  <a href="{{ url_for(config.archive_dir) }}">
                {% endif %}
                    <span class="site-state-item-count">{{ site.posts.length }}</span>
                    <span class="site-state-item-name">{{ __('state.posts') }}</span>
                  </a>
                </div>
              {% endif %}

              {% if site.categories.length > 0 %}
                {% set categoriesPageQuery = site.pages.find({type: 'categories'}, {lean: true}) %}
                {% set hasCategoriesPage = categoriesPageQuery.length > 0 %}
                <div class="site-state-item site-state-categories">
                  {% if hasCategoriesPage %}
                    {% if theme.menu.categories %}
                      <a href="{{ url_for(theme.menu.categories).split('||')[0] | trim }}">
                    {% else %}
                      <a href="{{ url_for(config.category_dir) + '/' }}">
                    {% endif %}
                  {% endif %}
                    {% set visibleCategories = 0 %}
                    {% for cat in site.categories %}
                      {% if cat.length %}{% set visibleCategories += 1 %}{% endif %}
                    {% endfor %}
                    <span class="site-state-item-count">{{ visibleCategories }}</span>
                    <span class="site-state-item-name">{{ __('state.categories') }}</span>
                  {% if hasCategoriesPage %}</a>{% endif %}
                </div>
              {% endif %}

              {% if site.tags.length > 0 %}
                {% set tagsPageQuery = site.pages.find({type: 'tags'}, {lean: true}) %}
                {% set hasTagsPage = tagsPageQuery.length > 0 %}
                <div class="site-state-item site-state-tags">
                  {% if hasTagsPage %}
                    {% if theme.menu.tags %}
                      <a href="{{ url_for(theme.menu.tags).split('||')[0] | trim }}">
                    {% else %}
                      <a href="{{ url_for(config.tag_dir) + '/' }}">
                    {% endif %}
                  {% endif %}
                    {% set visibleTags = 0 %}
                    {% for tag in site.tags %}
                      {% if tag.length %}{% set visibleTags += 1 %}{% endif %}
                    {% endfor %}
                    <span class="site-state-item-count">{{ visibleTags }}</span>
                    <span class="site-state-item-name">{{ __('state.tags') }}</span>
                  {% if hasTagsPage %}</a>{% endif %}
                </div>
              {% endif %}
            </nav>
          {% endif %}

          {% if theme.rss %}
            <div class="feed-link motion-element">
              <a href="{{ url_for(theme.rss) }}" rel="alternate">
                <i class="fa fa-rss"></i>
                RSS
              </a>
            </div>
          {% endif %}

          {% if theme.chat.enable and theme.chat.service !== '' %}
            <div class="chat motion-element">
              {% if theme.chat.service == 'chatra' and theme.chatra.enable %}
                <a onclick="Chatra('openChat', true)">
              {% endif %}
              {% if theme.chat.service == 'tidio' and theme.tidio.enable %}
                <a onclick="tidioChatApi.open();">
              {% endif %}
              {% if theme.chat.icon %}<i class="fa fa-{{ theme.chat.icon }}"></i>{% endif %}
                  {{ theme.chat.text }}
                </a>
            </div>
          {% endif %}

          {% if theme.social %}
            <div class="links-of-author motion-element">
              {% for name, link in theme.social %}
                <span class="links-of-author-item">
                  {% set sidebarURL = link.split('||')[0] | trim %}
                  {% if not (theme.social_icons.enable) or (not theme.social_icons.icons_only) %}
                    {% set sidebarText = name %}
                  {% endif %}
                  {% if theme.social_icons.enable %}
                    {% set sidebarIcon = '<i class="fa fa-fw fa-' + link.split('||')[1] | trim | default('globe') + '"></i>' %}
                  {% endif %}
                  {{ next_url(sidebarURL, sidebarIcon + sidebarText, {title: name + ' &rarr; ' + sidebarURL}) }}
                </span>
              {% endfor %}
            </div>
          {% endif %}

          {% if theme.creative_commons.license and theme.creative_commons.sidebar %}
             <div class="cc-license motion-element" itemprop="license">
              {% set ccLanguage = theme.creative_commons.language %}
              {% if theme.creative_commons.license === 'zero' %}
                {% set ccType = 'publicdomain/zero/1.0/' + ccLanguage %}
              {% else %}
                {% set ccType = 'licenses/' + theme.creative_commons.license + '/4.0/' + ccLanguage %}
              {% endif %}
              {% set ccURL = 'https://creativecommons.org/' + ccType %}
              {% set ccImage = '<img src="' + url_for(theme.images + '/cc-' + theme.creative_commons.license + '.svg') + '" alt="Creative Commons"/>' %}
              {{ next_url(ccURL, ccImage, {class: 'cc-opacity'}) }}
             </div>
          {% endif %}

          {# Blogroll #}
          {% if theme.links %}
            <div class="links-of-blogroll motion-element {{ "links-of-blogroll-" + theme.links_layout | default('inline') }}">
              <div class="links-of-blogroll-title">
                <i class="fa  fa-fw fa-{{ theme.links_icon | default('globe') | lower }}"></i>
                {{ theme.links_title }}
              </div>
              <ul class="links-of-blogroll-list">
                {% for blogrollText, blogrollURL in theme.links %}
                  <li class="links-of-blogroll-item">
                    {{ next_url(blogrollURL, blogrollText, {title: blogrollURL}) }}
                  </li>
                {% endfor %}
              </ul>
            </div>
          {% endif %}

          {% if theme.custom_file_path.sidebar %}
            {% set custom_sidebar = '../../../../' + theme.custom_file_path.sidebar %}
          {% else %}
            {% set custom_sidebar = '../_custom/sidebar.swig' %}
          {% endif %}
          {% include custom_sidebar %}
        </div>
      </div>

      {% if display_toc and toc(page.content).length > 1 %}
      <!--noindex-->
        <div class="post-toc-wrap motion-element sidebar-panel sidebar-panel-active">
          <div class="post-toc">

            {% set next_toc_number = theme.toc.number %}
            {% if page.toc_number !== undefined %}
              {% set next_toc_number = page.toc_number %}
            {% endif %}
            {% set next_toc_max_depth = page.toc_max_depth|default(theme.toc.max_depth)|default(6) %}
            {% set toc = toc(page.content, { "class": "nav", list_number: next_toc_number, max_depth: next_toc_max_depth }) %}

            {% if toc.length <= 1 %}
              <p class="post-toc-empty">{{ __('post.toc_empty') }}</p>
            {% else %}
              <div class="post-toc-content">{{ toc }}</div>
            {% endif %}

          </div>
        </div>
      <!--/noindex-->
      {% endif %}

      {% if theme.back2top.enable and theme.back2top.sidebar %}
        <div class="back-to-top">
          <i class="fa fa-arrow-up"></i>
          {% if theme.back2top.scrollpercent %}
            <span id="scrollpercent"><span>0</span>%</span>
          {% endif %}
        </div>
      {% endif %}

    </div>
  </aside>
  {% if theme.sidebar.dimmer %}
    <div id="sidebar-dimmer"></div>
  {% endif %}
{% endmacro %}
