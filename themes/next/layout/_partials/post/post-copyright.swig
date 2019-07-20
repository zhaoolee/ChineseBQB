{% set ccLicense = theme.creative_commons.license | lower %}
{% set ccLanguage = theme.creative_commons.language %}
{% set ccIcon = '<i class="fa fa-fw fa-creative-commons"></i>' %}
{% set ccText = ccLicense | upper %}
{% if ccLicense === 'zero' %}
  {% set ccType = 'publicdomain/zero/1.0/' + ccLanguage %}
{% else %}
  {% set ccType = 'licenses/' + ccLicense + '/4.0/' + ccLanguage %}
{% endif %}
{% set ccURL = 'https://creativecommons.org/' + ccType %}

<ul class="post-copyright">
  <li class="post-copyright-author">
    <strong>{{ __('post.copyright.author') + __('symbol.colon') }} </strong>{#
  #}{{ post.author || author }}{#
#}</li>
  <li class="post-copyright-link">
    <strong>{{ __('post.copyright.link') + __('symbol.colon') }}</strong>
    {% set postURL = post.url || post.permalink %}
    {{ next_url(postURL, postURL, {title: post.title}) }}
  </li>
  <li class="post-copyright-license">
    <strong>{{ __('post.copyright.license_title') + __('symbol.colon') }} </strong>{#
  #}{{ __('post.copyright.license_content', next_url(ccURL, ccIcon + ccText)) }}{#
#}</li>
</ul>
