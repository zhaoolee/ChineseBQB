{% if not is_home() && not is_post() %}
  {% if theme.menu %}

    {% import '../../_macro/menu/menu-item.swig' as menu_item %}

    {# Submenu & Submenu-2 #}
    {% for name, value in theme.menu %}
      {% set respath = value %}
      {% if value == '[object Object]' %}

        {# If current URL is value of parent submenu 'default' path #}
        {% set currentParentUrl = page.path.split('/')[0] | trim %}
        {% if currentParentUrl == value.default.split('||')[0] | trim | replace('/', '', 'g') %}

          {# Submenu items #}
          <ul id="sub-menu" class="sub-menu menu">
          {% for subname, subvalue in value %}
            {# For main submenu items #}
            {% if subvalue != '[object Object]' %}
              {% set itemName = subname.toLowerCase() %}
              {% if itemName == 'default' %}
                {% set parentValue = subvalue.split('||')[0] | trim %}
              {% else %}
                {% if subvalue.indexOf('http') == 0 %}
                  {% set respath = subvalue %}
                {% else %}
                  {% set respath = parentValue + subvalue %}
                {% endif %}
                {{ menu_item.render(subname, respath) }}
              {% endif %}
            {% else %}
              {# For 'default' submenu item in main submenu #}
              {% set itemName = subname.toLowerCase() %}
              {% for subname2, subvalue2 in subvalue %}
                {% if subname2 == 'default' %}
                  {% set respath = parentValue + subvalue2 %}
                  {{ menu_item.render(subname, respath) }}
                {% endif %}
              {% endfor %}
            {% endif %}
          {% endfor %}
          </ul>
          {# End Submenu items #}

          {# Submenu-2 #}
          {% for name, value in theme.menu %}
            {% set respath = value %}
            {% if value == '[object Object]' %}

              {% for subname, subvalue in value %}
                {% set itemName = subname.toLowerCase() %}
                {% if itemName == 'default' %}
                  {% set parentValue = subvalue.split('||')[0] | trim %}
                {% endif %}
                {% if subvalue == '[object Object]' %}

                  {# If current URL is value of parent submenu 'default' path #}
                  {% set paths = page.path.split('/') %}
                  {% if paths.length > 2 %}
                    {% if paths[1] == subvalue.default.split('||')[0] | trim | replace('/', '', 'g') %}

                      {# Submenu-2 items #}
                      <ul id="sub-menu-2" class="sub-menu menu">
                      {% for subname2, subvalue2 in subvalue %}
                        {% set respath2 = subvalue %}
                        {% set itemName = subname2.toLowerCase() %}
                        {% if itemName == 'default' %}
                          {% set parentSubValue = subvalue2.split('||')[0] | trim %}
                        {% else %}
                          {% if subvalue2.indexOf('http') == 0 %}
                            {% set respath2 = subvalue2 %}
                          {% else %}
                            {% set respath2 = parentValue + parentSubValue + subvalue2 %}
                          {% endif %}
                          {{ menu_item.render(subname2, respath2) }}
                        {% endif %}
                      {% endfor %}
                      </ul>
                      {# End Submenu-2 items #}

                    {% endif %}
                  {% endif %}
                  {# End URL & path comparing #}

                {% endif %}
              {% endfor %}

            {% endif %}
          {% endfor %}
          {# End Submenu-2 #}

        {% endif %}
        {# End URL & path comparing #}

      {% endif %}
    {% endfor %}
    {# End Submenu & Submenu-2 #}

  {% endif %}
{% endif %}
