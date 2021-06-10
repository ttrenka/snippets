# crawlr
`crawlr` is an older utility + content management system originally written in 2003 or so. The
core library simplifies a number of server-side operations, such as database access, JSON parse/serialize,
file system access, internet access, emailing and more.

In addition to this, there are wrappers for the standard ASP Request and Response objects; the Request
combines things like SERVER_VARIABLES access, GET/POST/Cookie information, etc. The Response object,
in addition to wrapping the native Response, also adds a method of creating string "buffers" so that
page creation can be done in a non-linear fashion (as opposed to the usual templating system, which
steers more developers into a linear rendering pattern. It was on top of this (plus the file system
access) that a simple but _very_ powerful content management platform was built.
