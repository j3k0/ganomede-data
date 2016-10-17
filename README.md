# ganomede-data

Expose public data.

## Configuration

Environment variables:

* `HOST` — interface to listen on (`'127.0.0.1'`);
* `PORT` — port to listen on (`'127.0.0.1'`);
* `API_SECRET` — non-empty string for authorizing non-read operations;
* `REDIS_HOST` — hostname of Redis instance to store documents in;
* `REDIS_PORT` — port of Redis instance to store documents in.

## API

### Create document `/data/v1/docs/ [POST]`

#### Body

``` js
{ "secret": "API_SECRET",
  "document": {/*…*/}      // JSON to insert.
}
```

#### Response `[200 OK]`

``` js
{ "id": "idString" }  // ID of created document.
```

#### Response `[403 Forbidden]`

Invalid secret.

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

