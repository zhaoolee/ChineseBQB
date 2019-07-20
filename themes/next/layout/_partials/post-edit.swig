{% if theme.post_edit.enable -%}
  {% set editIcon = '<i class="fa fa-pencil"></i>' -%}
  {{ next_url(theme.post_edit.url + page.source, editIcon, {class: 'post-edit-link', title: __('post.edit') }) }}
{%- endif %}
