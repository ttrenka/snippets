# Various Standalone microlibraries
This space will be used to house various utilities I've written over the years using JScript for Classic ASP.
Each snippet will be explained below.

## WinLESS
Version 3 of the application I was in charge of at my previous job used LESS as a CSS Proprocessor; one of the
application requirements was to be able to build customized stylesheets on-the-fly, including a logo, to rebrand
the application. As part of the requirements, we didn't want to have to recompile all of the possible branded
stylesheets every time we made a change.

It turned out someone had written a handy Windows utility called WinLESS that not only watched the file system for
potential changes in `.less` files, but included a compiler written entirely for Windows Script Host. So I adapted
that compile script to run under IIS, complete with a base64-encoded logo image (adjusted for size) any time a 
change in branded styling was made.

