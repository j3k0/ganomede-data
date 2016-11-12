# ganomede-data

Expose public data.

## Configuration

Environment variables:

* `HOST` — interface to listen on (`'127.0.0.1'`);
* `PORT` — port to listen on (`'127.0.0.1'`);
* `API_SECRET` — non-empty string for authorizing non-read operations;
* `REDIS_DATA_PORT_6379_TCP_ADDR` — hostname of Redis instance to store documents in;
* `REDIS_DATA_PORT_6379_TCP_PORT` — port of Redis instance to store documents in.

## API

### Create document `/data/v1/docs/ [POST]`

#### Body

``` js
{ "secret": "API_SECRET",
  "document": {/*…*/}      // JSON to insert.
  "id": "idString"         // Optional ID to insert document with
                           // (if missing, newly created UUID v4 is used).
}
```

#### Response `[200 OK]`

``` js
{ "id": "idString" }  // ID of created document.
```

#### Response `[403 Forbidden]`

Invalid secret.

### List or Search Documents' IDs `/data/v1/docs [GET]`

List IDs of all documents, or specify `q` query string parameter to filter only matching set (substring or [redis glob](http://redis.io/commands/keys)).

#### Response `[200 OK]`

``` js
[
  "matchin-id",
  "another-matching-id",
  // …
]
```

### Read document `/data/v1/docs/:id [GET]`

#### Response `[200 OK]`

``` js
{ /*…*/ }  // Document itself as created (without id).
```

#### Response `[404 Not Found]`

Document with specified `:id` was not found.

### Replace document `/data/v1/docs/:id [POST]`

#### Body

``` js
{ "secret": "API_SECRET" }
```

#### Response `[200 OK]`

Document replaced.

#### Response `[404 Not Found]`

Document with specified `:id` was not found.

#### Response `[403 Forbidden]`

Invalid secret.


### Delete document `/data/v1/docs/:id [DELETE]`

#### Body

``` js
{ "secret": "API_SECRET" }
```

#### Response `[200 OK]`

Document deleted or does not exist.

#### Response `[403 Forbidden]`

Invalid secret.

