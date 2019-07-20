{% extends '_layout.swig' %}
{% import '_macro/sidebar.swig' as sidebar_template %}

  {% block title %}{#
  #}{% set page_title_suffix = ' | ' + title %}{#

  #}{% if page.type === 'categories' and not page.title %}{#
    #}{{ __('title.category') + page_title_suffix }}{#
  #}{% elif page.type === 'tags' and not page.title %}{#
    #}{{ __('title.tag') + page_title_suffix }}{#
  #}{% elif page.type === 'schedule' and not page.title %}{#
    #}{{ __('title.schedule') + page_title_suffix }}{#
  #}{% else %}{#
    #}{{ page.title + page_title_suffix }}{#
  #}{% endif %}{#
#}{% endblock %}

{% block page_class %}page-post-detail{% endblock %}

{% block content %}

  <div id="posts" class="posts-expand">
    {##################}
    {### PAGE BLOCK ###}
    {##################}
    <div class="post-block page">
      {% include '_partials/page/page-header.swig' %}
      {#################}
      {### PAGE BODY ###}
      {#################}
      <div class="post-body{% if theme.han %} han-init-context{% endif %}{% if page.direction && page.direction.toLowerCase() === 'rtl' %} rtl{% endif %}">
        {# tagcloud page support #}
        {% if page.type === 'tags' %}
          <div class="tag-cloud">
            <div class="tag-cloud-title">
              {% set visibleTags = 0 %}
              {% for tag in site.tags %}
                {% if tag.length %}
                  {% set visibleTags += 1 %}
                {% endif %}
              {% endfor %}
              {{ _p('counter.tag_cloud', visibleTags) }}
            </div>
            <div class="tag-cloud-tags">
              {% if not theme.tagcloud %}
                {{ tagcloud({min_font: 12, max_font: 30, amount: 200, color: true, start_color: '#ccc', end_color: '#111'}) }}
              {% else %}
                {{ tagcloud({min_font: theme.tagcloud.min, max_font: theme.tagcloud.max, amount: theme.tagcloud.amount, color: true, start_color: theme.tagcloud.start, end_color: theme.tagcloud.end}) }}
              {% endif %}
            </div>
          </div>
        {% elif page.type === 'categories' %}
          <div class="category-all-page">
            <div class="category-all-title">
              {% set visibleCategories = 0 %}
              {% for cat in site.categories %}
                {% if cat.length %}
                  {% set visibleCategories += 1 %}
                {% endif %}
              {% endfor %}
              {{ _p('counter.categories', visibleCategories) }}
            </div>
            <div class="category-all">
              {{ list_categories() }}
            </div>
          </div>
        {% elif page.type === 'schedule' %}
          {% include 'schedule.swig' %}
        {% else %}
          {{ page.content }}
        {% endif %}
      </div>
      {#####################}
      {### END PAGE BODY ###}
      {#####################}
    </div>
    {% include '_partials/page/breadcrumb.swig' %}
    {######################}
    {### END PAGE BLOCK ###}
    {######################}
  </div>

{% endblock %}

{% block sidebar %}
  {{ sidebar_template.render(false) }}
{% endblock %}

{% block script_extra %}
  {% include '_scripts/pages/post-details.swig' %}
{% endblock %}
