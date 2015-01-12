var exports = module.exports || {};

var faker = require('faker'),
    mysql = require('mysql'),
    sync = require('synchronize');

// A simple map of all Faker types
var fakerTypes = {
  'name': [
    'firstName',
    'lastName',
    'findName',
    'prefix',
    'suffix'
  ],

  'address': [
    'zipCode',
    'city',
    'cityPrefix',
    'streetName',
    'streetAddress',
    'streetSuffix',
    'secondaryAddress',
    'county',
    'country',
    'state',
    'stateAbbr',
    'latitude',
    'longitude'
  ],

  'phone': [
    'phoneNumber',
    'phoneNumberFormat',
    'phoneFormats'
  ],
  
  'internet': [
    'avatar',
    'email',
    'userName',
    'domainName',
    'domainSuffix',
    'domainWord',
    'ip',
    'userAgent',
    'color',
    'password'
  ],
  
  'company': [
    'suffixes',
    'companyName',
    'companySuffix',
    'catchPhrase',
    'bs',
    'catchPhraseAdjective',
    'catchPhraseDescriptor',
    'catchPhraseNoun',
    'bsAdjective',
    'bsBuzz',
    'bsNoun'
  ],

  'image': [
    'image',
    'avatar',
    'imageUrl',
    'abstract',
    'animals',
    'business',
    'cats',
    'city',
    'food',
    'nightlife',
    'fashion',
    'people',
    'nature',
    'sports',
    'technics',
    'transport'
  ],

  'lorem': [
    {'words': function(words) { return words.join(' '); }},
    'sentence',
    'sentences',
    'paragraph',
    'paragraphs'
  ],

  'helpers': [
    'randomNumber',
    'randomize',
    'slugify',
    'replaceSymbolWithNumber',
    'shuffle',
    'mustache',
    'createCard',
    'contextualCard',
    'userCard',
    'createTransaction'
  ],

  'date': [
    'past',
    'future',
    'between',
    'recent'
  ],

  'random': [
    'number',
    'array_element',
    'object_element',
    'uuid'
  ],

  'finance': [
    'account',
    'accountName',
    'mask',
    'amount',
    'transactionType',
    'currencyCode',
    'currencyName',
    'currencySymbol'
  ],

  'hacker': [
    'abbreviation',
    'adjective',
    'noun',
    'verb',
    'ingverb',
    'phrase'
  ]
}

/**
 * A simple object which represents a table and tracks the fields to generate
 */
function Table(name, count) {
  this.name = name;
  this.count = count || 1;
  this.columns = {};
}

// Add functions on the Table class for each faker type
for (var definition in fakerTypes) {
  fakerTypes[definition].forEach(function(type) {
    var fn,
        wrapper = null;

    // Handle functions which require a wrapper
    if (typeof type == 'object') {
      wrapper = type[Object.keys(type)[0]];
      type = Object.keys(type)[0];
    }
    fn = faker[definition][type];

    Table.prototype[definition + '_' + type] = function(column) {
      // Partially apply the function with the given arguments
      var args = Array.prototype.slice.call(arguments, 1);
      args.unshift(null);
      var partial_fn = fn.bind.apply(fn, args);

      if (wrapper) {
        this.columns[column] = function() {
          return wrapper(partial_fn());
        }
      } else {
        this.columns[column] = partial_fn;
      }

      return this;
    }
  });
}

/**
 * Produces a single row for the table as JSON
 */
Table.prototype.row = function() {
  var row = {};

  for (var column in this.columns) {
    row[column] = this.columns[column].call();
  }

  return row;
}

/**
 * Insert a given number of rows for the table using the specified connection
 */
function insertCount(connection, table, keys, sql, count) {
  var values = [];

  for (var j = 0; j < count; j++) {
    var row = table.row();
    values.push(keys.map(function(column) { return row[column]; }));
  }

  // Synchronously execute the insert
  sync.await(connection.query({
    sql: sql,
    timeout: 10000
  }, [values], sync.defer()));
}

/**
 * Inserts a given a list of tables into the MySQL
 * database specified by the options parameter
 */
function insert(tables, options) {
  // Connect to the MySQL server
  var connection = mysql.createConnection(options);
  connection.connect();

  // Start a fiber so we can wait for inserts before proceeding
  sync.fiber(function() {
    tables.forEach(function (table) {
      var keys = Object.keys(table.columns),
          sql = 'INSERT INTO ' + table.name,
          total = table.count,
          batches = Math.floor(total / 1000);
      sql += '(' + keys.join(', ') + ') VALUES ?';

      for (var i = 0; i < batches; i++) {
        insertCount(connection, table, keys, sql, 1000);
        total -= 1000;
      }
      if (total > 0) {
        insertCount(connection, table, keys, sql, total);
      }
    });

    connection.end();
  });
}

exports.Table = Table;
exports.insert = insert;
