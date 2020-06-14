{% if page.prev or page.next %}
  <nav class="pagination">
    {{
      paginator({
        prev_text: '<i class="fa fa-angle-left" aria-label="'+__('accessibility.prev_page')+'"></i>',
        next_text: '<i class="fa fa-angle-right" aria-label="'+__('accessibility.next_page')+'"></i>',
        mid_size: 1
      })
    }}
  </nav>
{% endif %}
