{% if theme.bookmark and theme.bookmark.enable %}
  {% set bookmark_uri = url_for(theme.vendors._internal + '/bookmark/bookmark.min.js?v=1.0') %}
  {% if theme.vendors.bookmark %}
    {% set bookmark_uri = theme.vendors.bookmark %}
  {% endif %}
  <script src="{{ bookmark_uri }}"></script>
  <script>
  {% if is_post() %}
    bookmark.scrollToMark('{{ theme.bookmark.save }}', "#{{ __('post.more') }}");
  {% else %}
    bookmark.loadBookmark();
  {% endif %}
  </script>
{% endif %}
