# MDL-Cards
This is one aspect of the last major project (a visual analysis system, similar to Google AdWords or Google
Analytics) I was working on. It entails a card-based UX system, along with some aspects of card-data management.

_NOTE: This project was conceived and started when both React and Web Components were in their infancy; therefore
it is considered more a "home-grown" system than anything else. Had this project been started a year or two ago
(2019/2020), I would have opted to use Web Components out of the box._

There are several aspects to this system:
* XHR/Fetch management
* A base Card "class", upon which all actual cards are derived
* A Theme system, that was also used for white-label/branding of the application
* An example card in actual use (sans HTML/CSS)
* Some "components" (see `/cmps`); for now, only a DateRangePicker is included (see below for details)
* A few "menu" components (meant to be shown via a dropdown within a card itself)

Due to the sensitive nature of some of this code, a lot of code has been omitted.

An explanation of the various aspects of this system is detailed below.

## The XHR Queue
The XHR Queue handles a number of global aspects of in-line data loading, including:
* Making sure that a data request is not repeated by several cards at once
* Indicators showing that a data load is in progress or completed
* Indicators to show whether an empty data-set was returned
* Some application-specific data handling concepts
* A way of converting specific global variables for inclusion with each request for data

The basic idea is to make sure that if several cards on a shown panel are asking for the same data
request, that request is only called once, and upon reciept the raw resultset is sent to each and 
every card that asked for it. This was accomplished by using a pub/sub system; a card would make a request
and subscribe to a "topic"; it would then receive that data upon the topic's publishing mechanism. The
system was designed this way because a future scope feature was to be able to configure custom dashboards
of cards, some of which may share the same API feed.

## The Console
The client-side portion of the Console system (see `/CS/SiteUtils/` for details), this system would allow
the server to send its own JS console messages so that certain user roles (Administrator and Developer) could
use them to debug various issues.

## The `Card` base class
The object from which data-specific cards "inherited", this contains various methods and property settings 
required by all cards in the system.

## Theming
The application in question also had a method of switching "themes" on-the-fly, which included various branding
needs. Only two themes were included by default, as shown in the video below:

https://user-images.githubusercontent.com/76838/122682126-46b19780-d1bd-11eb-8be7-84f8cf34017c.mov

## The DateRangePicker (`/cmps/DateRangePicker.js`)
One of two major "global" components in the application, this is a full-featured component that allows a user
to select a date range is a visually-intuitive way. As part of the functionality, it allowed a user to select either
an _absolute_ date range, or a _relative_ one. _Absolute_ ranges are date-specific; if you chose `6/1/2021 - 8/31/2021`,
the data pulled would always fall between those dates. If you chose a _relative_ date range (such as *This Month* or
*Last 90 Days*), the DateRangePicker would figure out your date range for you, based on the current date.

The following video clip shows the DateRangePicker in conjunction with a Bookmarking feature of the application (not included
in this repository, as it was very application-specific) to show both the functionality of the picker itself, as well as 
how that affected parts of the system.

https://user-images.githubusercontent.com/76838/122682092-21bd2480-d1bd-11eb-9320-402a35bc336c.mov

## The Downloader, Search and View Options menu components
Each card in the application, depending on its purpose, could include any number of "menu items" within its title bar.
Each is detailed below.

### The Downloader
Included in this repo are three of the most common menus: a way to download the data from the card in a specific format
(depending on the card itself), as well as a ZIP file that included the most common types of downloads. For instance, if
the card was a visualization, you could get a PNG or an SVG representation of the visualization itself (see the Theming
video clip, above); in addition, you could get a CSV representation of the data used to render the visualization.

All of these downloads are created directly within the browser; no round trip to a server is needed.

### Search
A card containing tabular data often included a keyword search mechanism; this could be set to search among multiple
columns within the tabular data-set. It is set to "throttle" so that it waits for a keyboard pause before executing a
search; this value was adjustable but in general set to 150ms.

### ViewOptions
Lastly, a ViewOptions menu allowed for either view switching (radio button-based) or filtering (checkbox-based) options.
For example, in a card that was map-based (the application used Google Maps for geo-based data) could include a ViewOptions
menu that allowed one to switch from a marker-based view to a heatmap-based one; another possibility was to switch between
a "light touch" location and a "converting" one (in other words, if the geo point in question was someone just viewing an
internet ad, or if that ad resulted in generating a lead). Mutliple ViewOption menus were allowed per card.

