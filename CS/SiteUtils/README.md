# SiteUtils
This is a small utility library I wrote that handles some very basic aspects of a SaaS/ReST-like API
application. I combined some techniques I've been building over the years to make some basic but verbose
operations very easy to use, with a lot of flexibility built in.

Each class has a specific purpose and are explained below.

## Console
I have been working on this particular class for a number of years, to aid in debugging. What it does is
create an "interface" that mimics that Console API within a major browser, but messages are all written
on the server-side--so that _you can view debugging messages in a JS console from *both* the server and
the client_.

To say this system has saved me a ton of time in terms of development is a very big understatement, especially
when you are dealing with separate DBAs and trying to debug their query results and the resulting serialized
output (in this case, almost always JSON). Using this system I was able to capture metrics such as how long
a particular SQL query took, how long it took to serialize, how long the full endpoint took, any errors that
might have been thrown, etc.

## Utilities
Originally written to simplify database access tremendously--and translate the resulting dataset into a format
easily serializable to a variety of formats to be returned over the wire--it also has an "in-progress" set of
methods that were intended to serve as a proxy to other 3rd party API calls (incomplete because of project
requirements and other deadlines).

For the most part, this class allows you to pass an SQL Command and any parameters for said command to a database,
get the raw resultset and translate it to a List of key/value pairs. Depending on the need, one can serialize
directly to a transport format (JSON, CSV, TSV, etc) _or_ can get the raw `List<Dictionary<String, Object>>` in case
additional data tranformations are needed to the resultset before serializing.

## PageParams
This particular application relied on a fixed set of HTTP GET/POST variables, the schema of which were known beforehand.
It took care of getting vital information about a topic being viewed/manipulated via either an HTTP POST or an HTTP GET.
The majority of this is application-specific but the approach is enough for me to want to keep it around for future
reference.

## User
Like the `PageParams` class, this is rather application-specific; I will not go into details about this but I do want a
copy for personal reference.