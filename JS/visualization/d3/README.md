# d3.js Visualizations
Various examples of custom visualizations live in this project.

_NOTE: All visualizations here are based on D3.js v3.x; this was a project limitation and will be ported to v.6.x
in the future._

## Sankey
This is an implementation of a Sankey/Alluival chart, which sought to show (on a general basis) the most effective
"paths" through a web site or sites based on page hit volume and the shortest path to a lead. The intention was to
demonstrate how well particular internet ad networks or ad tactics worked, so that clients could invest more on
web site optimizations.

A much better explanation can be found here: https://en.wikipedia.org/wiki/Sankey_diagram but here are a couple of
examples of this particular implementation.

(insert screenshots here)

## Google Map
Part of the goal for this visualization was to be able to plot geographical locations about various internet ad and website
metrics; because of this, we took advantage of the Google JS Map API (along with thier custom styling) to plot a best approximation
of where specific ads were getting responses. This included a way of clustering many data points reported to be at the same
latitude/longitude coordinates, even if they came from different advertisements.

(insert screenshots here)

## Dual Axis LineArea
Along with other date-based visualizations, a Line/Area chart was created in which one could compare specific metrics/KPIs along
a "normalized" pair of Y axes if desired.

(insert video reference here)

## Sparkline
A common method of displaying (usually time-based) data, a Sparkline implimentation was made based on Edward Tufte's famous
examples; this way generic summary information could be displayed with a very small summarization of how that data may have
been affected over time.

(insert screenshots here)

## Donut
This visualization is a classic pie/donut implementation, summing data into categories and displaying information in a
ratio-based way. The approach taken was to use no more than 5 categories (for color scheming), almost always including
an "Other".

Some of the features of this implementation included a mouseover event on a slice to get more details underlying a
specific category, and using a click event to "freeze" the detail display so that a screenshot or download was possible.

(insert screenshots here)

## Trends
This visualization is an implementation of a Bollinger band-type of visualization, with a baseline (the raw data), a
moving average, and high/low Bollinger bands. Originally written as a way of detecting some kind of anomaly (in the
original, a number of phone calls out of an expected range based on historical data), it is useful for stock charts
and other situations where some kind of standard deviation analysis is needed.