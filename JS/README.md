# Javascript
Various pieces of Javascript lives in this folder, either as examples of previous work or for 
personal reference.

## The Dojo Toolkit
As a contributor/former project lead for the Dojo Toolkit, I have included examples of modules
I either wrote outright, or worked in collaboration with one or two other contributors on. The
version included here is from the v1.6x line, only because in later versions of the releases,
authorship credits were stripped from the releases.

## Windows Script Host
Included are examples of JS code written for the Windows Script Host, for automated/scheduled tasks.
Included is a basic hand-rolled templating system (for use in the automated generation of emails).

## UI/Visualization
This folder contains any UX/UI code, and will continue to expand as time goes on. The current two
projects--`d3` and `mdl-cards`--are examples of custom visualizations (including a JSON-based theming
system) and an implementation of a card-based UX, piggy-backing off of Material Design Lite.

## Miscellaneous
Any one-off microlibraries will live in the `/misc` folder. Currently there is only the QuickParser,
a black-box function that will take an English event phrase and transform it into a JS object suitable
for use in a variety of calender systems. Example phrases may include:
* "Doctor's Appointment on Monday at 2:30p at doctor's office"
* "Writing session every other Thursday between 8p and 10p"
...etc.
