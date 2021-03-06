# towel 

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/lukasdietrich/towel?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![npm version](https://badge.fury.io/js/towel.png)](http://badge.fury.io/js/towel)

A flexible content management system written in and for node.js !

## Install

Prerequisite:

1. Node.js (<http://nodejs.org/>)
2. MongoDB (<http://www.mongodb.org/>)

```bash
$ sudo npm install -g towel
```

## Guide

Towel is meant as an executeable to "run" your projects.  
A project is structured as follows:

```js
└─ "root/"
   ├─ "models/"       // folder for models, describing behaviour
   ├─ "templates/"    // folder for ".jade" template files
   ├─ "static/"       // static resources, like stylesheets
   │
   ├─ "routes.json"   // describes which model handels which route
   └─ "config.json"   // configuration file
```

### 1.1) config.json
```js
{
    "mongodb": "localhost/test", // connection string for mongodb client 
    "port": 80                   // port for express web server
}
```

### 1.2) routes.json
```js
{
    "/": {
        "model": "blog",         // bind model "blog" to "/"
        "name": "Blog"           // and name it "Blog", to be used when rendering layouts
    },                           // Hint: "name" can be used to generate site navigations

    "/avatars": "avatars"        // shorthand for { "model": "avatars" }
}                                // name is optional and can be omitted
```

### 2) Models

Models describe behaviour and are defined in .js files.  
You can define a Model by creating a file like "blog.js"
in the "models/" folder.

```js
~/model/blog.js

module.exports = function (collection, route, types, objectid) {

    // First we need to define a collection.
    // As an example we create a collection named "blog",
    // that has a name of type string and a post of type markdown.
    // Every collection also has some autogenerated fields:
    // - "_id" which is a MongoDB ObjectID
    // - "_created" which is the creation date of an entry
    // - "_modified" which is the last modification date of an entry
    collection("blog", {
        name: types.string,
        post: types.markdown
    })

    // Now we need to define a routes to be handled.
    // These will be called relative to the route we define in "routes.json".

    // Every route has 3 arguments:
    // a raw express.js request, collections and a method to serve data.
    // To retrieve and manipulate data one can simply call a collection by name
    // and use standard mongodb methods like find, findOne and insert.

    // Example: render the last 10 posts in a blog
    route("/", function (req, collections, serve) {
        collections.blog.find()
                        .sort({ _id: -1 })
                        .limit(10)
                        .toArray(function (err, docs) {
                            serve("blog", docs); 
                        })
    })

}
```

#### 2.1) Model Arguments

- `collection(name: string, structure: object, [(optional) significantKey: string])`  
  creates a collection, that validates a given structure.  
  If a significant key is specified, it will be shown in backend list.

- `route(url: string, handler: function)`  
  creates a route in the context of a model  

  - `serve(template: string, data: object)`  
    renders a jade template  
  - `serve.send(data: string, [(optional) mime: string])`  
    sends raw data and sets a mime type if given  
  - `serve.sendFile(path: string)`  
    sends a file

- `types` is an object of available collection types
  1. number
  2. date
  3. string
  4. text
  5. markdown

- `objectid` is just MongoDB.ObjectID passed as an argument

### 3) Templates

Templates are `.jade` files in the "templates/" folder. (Read more about jade on <http://jade-lang.com/>).  
From within a jade template you have access to three variables: `views`, `view` and `data`.

- `views` is a list of all routes, that have a name. Each entry has two attribues. 
  1. `view.base` is the url specified in `routes.json`
  2. `view.model` is the name of the handling model, also specified in `routes.json`

- `view` is an entry of `views`, that matches the current site.
- `data` is the data passed via `serve(...)` (see: [Model Parameters](#21-model-parameters))

### 4) Usage

First you need to add a user to the database:

```bash
$ towel -p "/path/of/project" adduser
```

then you can start up the service with

```bash
$ towel -p "/path/of/project" start
```

now a webinterface is accessible at `http://host:port/towel`

## License

```plain
The MIT License (MIT)

Copyright (c) 2015 Lukas Dietrich

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
