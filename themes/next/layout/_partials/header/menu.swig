{% import '../../_macro/menu/menu-item.swig' as menu_item %}

<nav class="site-nav">
  {% if theme.menu %}
    <ul id="menu" class="menu">
      {% for name, path in theme.menu %}
        {% set respath = path %}
        {% if path == '[object Object]' %}
        {# Main Menu (default menu item for Submenu) #}
          {% for subname, subpath in path %}
            {% set itemName = subname.toLowerCase() %}
            {% set respath = subpath %}
            {% if itemName == 'default' %}
              {% set itemName = name.toLowerCase() %}
              {{ menu_item.render(name, respath) }}
            {% endif %}
          {% endfor %}
        {% else %}
        {# Main Menu (standart menu items) #}
          {% set itemName = name.toLowerCase() %}
          {{- menu_item.render(name, respath) | trim -}}
        {%- endif -%}
      {%- endfor %}

      {% set hasSearch = theme.swiftype_key || theme.algolia_search.enable || theme.local_search.enable %}
      {% if hasSearch %}
        <li class="menu-item menu-item-search">
          {% if theme.swiftype_key %}
            <a href="javascript:;" class="st-search-show-outputs">
          {% elif theme.local_search.enable || theme.algolia_search.enable %}
            <a href="javascript:;" class="popup-trigger">
          {% endif %}
            {% if theme.menu_settings.icons %}
              <i class="menu-item-icon fa fa-search fa-fw"></i> <br/>{#
          #}{% endif %}{#
          #}{{ __('menu.search') }}{#
        #}</a>
        </li>
      {% endif %}
    </ul>
  {% endif %}

  {% if theme.scheme === 'Muse' || theme.scheme === 'Mist' %}
    {% include 'sub-menu.swig' %}
  {% endif %}

  {% if hasSearch %}
    <div class="site-search">
      {% include '../search/index.swig' %}
    </div>
  {% endif %}
</nav>
