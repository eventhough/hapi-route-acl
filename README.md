# Hapi Route ACL

Fine-grained route ACL based on CRUD for [Hapi.js](http://hapijs.com/)

## Description

This plugin allows you to specify certain ACL requirements for each of your routes using CRUD. For example let's say you have a resource called "cars". You could protect each route with the following permissions:

`'cars:read'`, `'cars:create'`, `'cars:edit'`, `'cars:delete'`

Routes can be protected by multiple permissions. For example you might have a route for drivers of cars that looks like: `POST /cars/1/drivers/1`

You can protect this route with: `['cars:read', 'drivers:create']`

## Usage

### Example

```javascript
var Hapi = require('hapi');

var internals = {};

internals.permissionsFunc = function(credentials, callback) {
  // use credentials here to retrieve permissions for user
  // in this example we just return some permissions

  var userPermissions = {
    cars: {
      read: true,
      create: false,
      edit: true,
      delete: true
    },
    drivers: {
      read: true,
      create: false,
      edit: false,
      delete: false
    }
  };

  callback(null, userPermissions);
};

var server = new Hapi.Server();
server.connection();

server.register({
  register: require('hapi-route-acl'),
  options: {
    permissionsFunc: internals.permissionsFunc
  }
}, function(err) {
  if (err) {
    console.log(err);
  }
});

server.route([
  {
    method: 'GET',
    path: '/unprotected',
    config: {
      handler: function(request, reply) {
        reply('hola mi amigo');
      }
    }
  },
  {
    method: 'GET',
    path: '/cars',
    config: {
      handler: function(request, reply) {
        reply(['Toyota Camry', 'Honda Accord', 'Ford Fusion']);
      },
      plugins: {
        hapiRouteAcl: {
          permissions: ['cars:read']
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/cars/{id}',
    config: {
      handler: function(request, reply) {
        reply('Toyota Camry');
      },
      plugins: {
        hapiRouteAcl: {
          permissions: 'cars:read'
        }
      }
    }
  },
  {
    method: 'DELETE',
    path: '/cars/{id}',
    config: {
      handler: function(request, reply) {
        reply('car deleted!');
      },
      plugins: {
        hapiRouteAcl: {
          permissions: ['cars:delete']
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/cars/{id}/drivers',
    config: {
      handler: function(request, reply) {
        reply(['Greg', 'Tom', 'Sam']);
      },
      plugins: {
        hapiRouteAcl: {
          permissions: ['cars:read', 'drivers:read']
        }
      }
    }
  },
  {
    method: 'DELETE',
    path: '/cars/{carId}/drivers/{driverId}',
    config: {
      handler: function(request, reply) {
        reply('driver deleted!');
      },
      plugins: {
        hapiRouteAcl: {
          permissions: ['cars:read', 'drivers:delete']
        }
      }
    }
  }]
);

server.start();
```

This plugin requires a permissionsFunc which takes credentials (from request.auth.credentials) and a callback with format: `callback(err, permissions)`.

The permission format should look something like this:

```javascript
{
  cars: {
    read: true,
    create: false,
    edit: true,
    delete: true
  },
  drivers: {
    read: true,
    create: false,
    edit: false,
    delete: false
  }
};
```
Where the keys are route names with objects that map each crud type to a boolean for access.

A full example has been provided in the example/ folder. You can run this example with `node example/server.js` and send requests to it.
