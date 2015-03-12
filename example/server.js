'use strict';

// Load modules

var Hapi = require('hapi');

// Declare internals

var internals = {};

internals.permissionsFunc = function(credentials, callback) {
  // use credentials here to retrieve permissions for user

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

exports = module.exports = (function() {
  var server = new Hapi.Server();
  server.connection();

  server.register({
    register: require('./../'),
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
      path: '/unprotected1',
      config: {
        handler: function(request, reply) {
          reply('hola mi amigo');
        }
      }
    },
    {
      method: 'GET',
      path: '/unprotected2',
      config: {
        handler: function(request, reply) {
          reply('como estas?');
        },
        plugins: {
          hapiRouteAcl: {
            permissions: []
          }
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
            permissions: ['random:delete']
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

  server.start(function() {
    console.log('Server running at: ' + server.info.uri);
  });

  return server;
})();
