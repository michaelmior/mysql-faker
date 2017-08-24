# MySQL Faker

[![Greenkeeper badge](https://badges.greenkeeper.io/michaelmior/mysql-faker.svg)](https://greenkeeper.io/)

This module uses the excellent [faker.js](https://github.com/Marak/faker.js/) to easily generate data to populate MySQL database with fake data.
For now, the module assumes that all tables already exist.
To start, create an instance of the `Table` class giving a name and the number of entities to generate.
Faker types can then be chained on this class to add columns to the database.
All types are functions on the `Table` class with an underscore character between the type category and name.
For example, `faker.name.firstName()` is equivalent to `table.name_firstName`.
The first parameter to the type is the name of the column and any additional parameters are passed on to `faker`.

## Example
```
var mysql_faker = require('mysql-faker');

var users = (new mysql_faker.Table('users', 1000000));
users.name_firstName('firstname')
     .name_lastName('lastname')

mysql_faker.insert([users]);
```
