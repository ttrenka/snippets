# Windows Script Host
At my last job, we needed a way to run automated scripts for various reasons; because I was the one most
knowledgeable about the overall system architecture, and our primary infrastructure was a Microsoft tech
stack (IIS/SQL Server/C# ASP.NET/etc.), I ended up writing a mini-library utilizing WSH. These command-line
scripts were triggered using SQL Server Agent and were responsible for either importing data from various
3rd party APIs, or as a set of various monitoring systems.

The main monitoring system had to do with detecting an abnormal volume of proxy phone calls; there is quite
the story behind this but unfortunately it is proprietary and cannot be explaned here.

All actual 3rd party names have been scrubbed to the best of my ability.
