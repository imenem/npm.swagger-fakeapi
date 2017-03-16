# swagger-fakeapi

Run a contracts (Swagger 2.0) based server that generates fake data.

## Install

```
$ npm install swagger-fakeapi
```

## Usage






### Extended X- properties support

The mocker understands a few extention properties which allow defining things that a vanilla Swagger contract would otherwise not allow.

#### `x-mocker-format`

The mocker tries to guess what style a value should be based on the type, format, and names of the property and the object's property ancestry. This allows you to override that and direct the mocker to any of the mock-types the API supports. As-is, this is only really useful for strings. The current list of values is:

* city
* country
* currency
* date
* email
* id
* imageUrl
* locale
* paragraph
* path
* phoneNumber
* slug
* dateTime
* title
* type
* url
* word

This example schema:

    User:
      required:
        - username
        - password
      properties:
        username:
          type: string
          x-mocker-format: email
        password:
          type: string
          x-mocker-format: id

Will generate:

    {
      "username": "femimo@example.com",
      "password": "X5DCG1H"
    }



#### `x-mocker-keyformat`

In the scenario where a contract allows `additionalProperties` the Swagger API does not define any means of control over what the actuall properties themselves look like, only the values. The mocker defaults to producing slug-like keys but this property corresponds to `x-mocker-format` and allows control over the generated keys' format.

This example schema:

    Article:
      required:
        - title
        - date
      properties:
        title:
          type: string
        date:
          type: string
          format: date
      additionalProperties:
        x-mocker-keyformat: id
        required:
          - key
          - value
        properties:
          key:
            type: string
          value:
            type: string

Will generate:

    {
      "title": "Ruworuma a y ykeba sofimi",
      "date": "2010-10-12",
      "X5DCG1H": { ... }
    }


#### `x-mocker-value`

Allows control over the returned output in the cases where the mocker should repeat values of path or query parameters, or other values from the schema.

This comes in 4 flavours:

  - `x-mocker-value: "#name"`

    returns the parameter name as the value: `{ "title": "title" }`

  - `x-mocker-value: "#key"`

    returns the first ancestor parameter name as the value:

    ```
    {
      "X5DCG1H": {
        "id": "X5DCG1H"
      }
    }
    ```

  - `x-mocker-value: "?queryParam"`

    returns the value of the query parameter corresponding to the name following the question mark.


  - `x-mocker-value: "{pathParam}"`

    returns the value of the path parameter corresponding to the name enclosed in the brackets.

