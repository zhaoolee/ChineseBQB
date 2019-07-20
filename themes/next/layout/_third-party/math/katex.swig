<link rel="stylesheet" href="{{ theme.math.katex.cdn }}"/>
{% if theme.math.katex.copy_tex.enable %}
  {% if theme.math.katex.copy_tex.copy_tex_js %}
    <script src="{{ theme.math.katex.copy_tex.copy_tex_js }}"></script>
  {% endif %}
  {% if theme.math.katex.copy_tex.copy_tex_css %}
    <link rel="stylesheet" href="{{ theme.math.katex.copy_tex.copy_tex_css }}"/>
  {% endif %}
{% endif %}
