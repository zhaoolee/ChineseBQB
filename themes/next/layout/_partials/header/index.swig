{{ partial('_partials/header/brand.swig', {}, {cache: theme.cache.enable}) }}
{% include 'menu.swig' %}

{% if theme.custom_file_path.header %}
  {% set custom_header = '../../../../../' + theme.custom_file_path.header %}
{% else %}
  {% set custom_header = '../../_custom/header.swig' %}
{% endif %}
{% include custom_header %}
