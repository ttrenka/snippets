# Visualization
Being somewhat of a broad term, this space is being used to demonstrate various visual aspects of web-based
application development. Only Javascript will be included here (or variants, such as Typescript). For details
on each "project", see below.

The following two projects have hard dependencies on the following libraries:
* Dojo Toolkit, v.1.x line (Dojo base only, plus selected modules) (https://dojotoolkit.org/)
* d3.js, v3.x (https://d3js.org/)
* Material Design Lite (https://getmdl.io/)
The use of the Dojo Toolkit was because of heavy use of a component known as dGrid (https://dgrid.io) and aside
from that component's dependencies, was primarily used for the loading system (a version of 'require.js'), the 
event handling system (both `on` and `topic`, the former a typical event handler attachment system, the latter a
JS implementation of a pub/sub system), and the CSS query system (which internally defaults to the built-in CSS3
Query engine implemented in most modern browsers). Some additional modules were used, such as implementations of
SHA-1 and Promises.

## mdl-cards
The UX/UI basis for the analytics application I was working on, this is a system that uses the concept of the MDL
card (https://getmdl.io/components/index.html#cards-section) as a way of displaying various aspects of a particular
data topic. It includes ways of displaying grids, maps, charts, various "detail" information, and a lot more.

Each card in this system usually relies on some kind of data load and data transformation. This data load may be 
individual to a specific card, or a shared datasource (i.e. more than one card calls the same endpoint at the same
time). Because this, there needed to be a way of not only throttling endpoint (aka XHR) requests, but also making sure
that if a particular endpoint had already been asked for, it was not asked for a second time. This is the purpose of the
`xhr-queue` module.

Also included are a few custom components (such as the DateRangePicker), and some useful menu-type components, including
an inline Downloader component that could export CSV, TSV, SVG and PNG files inline (aka without a round-trip to a
server).

## d3
From the same application above, these are various d3-based chart implementations, including a custom theming system
intended to match certain color palettes defined within sections of said application. Where applicable, a screenshot
of a chart type in question will be included in the README file in that directory.
