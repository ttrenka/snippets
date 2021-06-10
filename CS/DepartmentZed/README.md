# DepartmentZed

Originally written for an e-commerce site, this "namespace" contains three libraries, each of which are explained
below.

## eCommerce
The core of the e-commerce system, this handles any online transactions, the results of those transactions, and
a number of data structures (mimicking the original database schema design) to effiently store and track things
like a shopping cart, wish lists, orders, recurring orders, returns, promotions, shipping rules, etc.

## Automation
These are a set of classes designed to interface with 3rd party systems, such as:
* The Amazon Merchant API
* Automatic shipments
* Confirmation of an order shipment
* Retrieving site tracking information (using an older library called LinkShare but analogous to Google
Analytics)
* Emailed instructions on product usage once shipped

## TaskManager
The TaskManager is a console-based application designed to run once a day, to handle all of the external API
access and internal systems cleanup.
