{% if theme.calendar.enable && page.type === 'schedule' %}

<script>
// Initialization
function _n(arg) {
  if (arg) return arg;
  else return void 0;
}

var now = new Date();
var timeMax = new Date();
var timeMin = new Date();

// Read config form theme config file
var calId        = _n('{{ theme.calendar.calendar_id  }}')               ;
var apiKey       = _n('{{ theme.calendar.api_key      }}')               ;
var orderBy      = _n('{{ theme.calendar.ordarBy      }}') || 'startTime';
var showLocation = _n('{{ theme.calendar.showLocation }}') || 'false'    ;
var offsetMax    = _n( {{ theme.calendar.offsetMax    }} ) || 72         ;
var offsetMin    = _n( {{ theme.calendar.offsetMin    }} ) || 4          ;
var showDeleted  = _n( {{ theme.calendar.showDeleted  }} ) || 'false'    ;
var singleEvents = _n( {{ theme.calendar.singleEvents }} ) || 'true'     ;
var maxResults   = _n( {{ theme.calendar.maxResults   }} ) || '250'      ;

timeMax.setHours(now.getHours() + offsetMax);
timeMin.setHours(now.getHours() - offsetMin);

// Build URL
BASE_URL           = 'https://www.googleapis.com/calendar/v3/calendars/';
FIELD_KEY          = 'key';
FIELD_ORDERBY      = 'orderBy';
FIELD_TIMEMAX      = 'timeMax';
FIELD_TIMEMIN      = 'timeMin';
FIELD_SHOWDELETED  = 'showDeleted';
FIELD_SINGLEEVENTS = 'singleEvents';
FIELD_MAXRESULTS   = 'maxResults';

timeMaxISO         = timeMax.toISOString();
timeMinISO         = timeMin.toISOString();

request_url = BASE_URL + calId + '/events?' +
  FIELD_KEY          + '=' + apiKey       + '&' +
  FIELD_ORDERBY      + '=' + orderBy      + '&' +
  FIELD_TIMEMAX      + '=' + timeMaxISO   + '&' +
  FIELD_TIMEMIN      + '=' + timeMinISO   + '&' +
  FIELD_SHOWDELETED  + '=' + showDeleted  + '&' +
  FIELD_SINGLEEVENTS + '=' + singleEvents + '&' +
  FIELD_MAXRESULTS   + '=' + maxResults;

fetchData();
var queryLoop = setInterval(fetchData, 60000);

function fetchData() {
  $.ajax({
    dataType: 'json',
    url: request_url,
    success: function(data) {

      $eventList = $('#schedule #event-list');

      // clean the event list
      $eventList.html('');
      var prevEnd = 0; // used to decide where to insert an <hr/>

      data.items.forEach((event) => {

        // parse data
        var utc   = new Date().getTimezoneOffset() * 60000;
        var start = event.start.dateTime = new Date(event.start.dateTime || (new Date(event.start.date).getTime() + utc));
        var end   = event.end.dateTime = new Date(event.end.dateTime || (new Date(event.end.date).getTime() + utc));

        tense = judgeTense(now, start, end); // 0:now 1:future -1:past

        if (tense == 1 && prevEnd < now) $eventList.append('<hr/>');

        eventDOM = buildEventDOM(tense, event);
        $eventList.append(eventDOM);

        prevEnd = end;
      });
    }
  });
}

function getRelativeTime(current, previous) {
  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = current - previous;
  var tense = elapsed > 0 ? 'ago' : 'later';

  elapsed = Math.abs(elapsed);

  if      ( elapsed < msPerHour  ) {
    return Math.round(elapsed/msPerMinute) + ' minutes ' + tense;
  }
  else if ( elapsed < msPerDay   ) {
    return Math.round(elapsed/msPerHour) + ' hours ' + tense;
  }
  else if ( elapsed < msPerMonth ) {
    return 'about ' + Math.round(elapsed/msPerDay) + ' days ' + tense;
  }
  else if ( elapsed < msPerYear  ) {
    return 'about ' + Math.round(elapsed/msPerMonth) + ' months ' + tense;
  }
  else {
    return 'about' + Math.round(elapsed/msPerYear) + ' years' + tense;
  }
}

function judgeTense(now, eventStart, eventEnd) {
  if      (eventEnd   < now) { return -1; }
  else if (eventStart > now) { return  1; }
  else                       { return  0; }
}

function buildEventDOM(tense, event) {
  var tenseClass = '';
  var start      = event.start.dateTime;
  var end        = event.end.dateTime;
  switch(tense) {
    case 0 : // now
      tenseClass = 'event-now';
      break;
    case 1 : // future
      tenseClass = 'event-future';
      break;
    case -1: // past
      tenseClass = 'event-past';
      break;
    default:
      throw 'Time data error';
  }
  durationFormat = {
    weekday: 'short',
    hour   : '2-digit',
    minute : '2-digit'
  };
  relativeTimeStr = (tense == 0) ? 'NOW' : getRelativeTime(now, start);
  durationStr = start.toLocaleTimeString([], durationFormat) + ' - ' +
                end.toLocaleTimeString([], durationFormat);

  liOpen  = '<li class="event ' + tenseClass + '">';
  liClose = '</li>';
  h2Open  = '<h2 class="event-summary">';
  h2Close = '</h2>';

  locationDOM     = '';
  if (showLocation && event.location) {
    locationDOM   = '<span class="event-location event-details">' + event.location + '</span>';
  }
  relativeTimeDOM = '<span class="event-relative-time">' + relativeTimeStr + '</span>';
  durationDOM     = '<span class="event-duration event-details">' + durationStr + '</span>';

  eventContent =
    liOpen +
      h2Open +
        event.summary +
        relativeTimeDOM+
      h2Close +
      locationDOM +
      durationDOM +
    liClose;
  return eventContent;
}
</script>

{% endif %}
