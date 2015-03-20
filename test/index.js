'use strict';

// Load modules

var Code = require('code');
var Lab = require('lab');
var Hapi = require('hapi');

// Declare internals

var internals = {};

internals.permissionsFunc = function(credentials, callback) {
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
    },
    abilities: {
      read: false,
      create: false,
      edit: false,
      delete: false
    }
  };

  callback(null, userPermissions);
};

// Test shortcuts

var lab = exports.lab = Lab.script();
var before = lab.before;
var beforeEach = lab.beforeEach;
var after = lab.after;
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

describe('hapi-route-acl', function() {

  describe('registration', function() {
    var server;

    beforeEach(function(done) {
      server = new Hapi.Server();
      server.connection();
      done();
    });

    it('should return an error if options.permissionsFunc is not defined', function(done) {
      server.register({
        register: require('./../')
      }, function(err) {
        expect(err).to.exist();
        done();
      });
    });

    it('should return an error if options.permissionsFunc is not a function', function(done) {
      server.register({
        register: require('./../'),
        options: {
          permissionsFunc: 123
        }
      }, function(err) {
        expect(err).to.exist();
        done();
      });
    });

  });

  describe('route protection', function() {
    var server;

    beforeEach(function(done) {
      server = new Hapi.Server();
      server.connection();
      server.register({
        register: require('./../'),
        options: {
          permissionsFunc: internals.permissionsFunc
        }
      }, function(err) {
        if (err) {
          throw err;
        }
      });
      done();
    });

    it('should allow access to a route if plugin configuration is not defined in route config', function(done) {
      server.route({
        method: 'GET',
        path: '/unprotected1',
        config: {
          handler: function(request, reply) {
            reply('hola mi amigo');
          }
        }
      });
      server.inject({
        method: 'GET',
        url: '/unprotected1'
      }, function(res) {
        expect(res.statusCode).to.equal(200);
        done();
      });
    });

    it('should allow access to a route if required permission array is empty', function(done) {
      server.route({
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
      });
      server.inject({
        method: 'GET',
        url: '/unprotected2'
      }, function(res) {
        expect(res.statusCode).to.equal(200);
        done();
      });
    });

    it('should allow access to a route if user has permission', function(done) {
      server.route({
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
      });
      server.inject({
        method: 'GET',
        url: '/cars'
      }, function(res) {
        expect(res.statusCode).to.equal(200);
        done();
      });
    });

    it('should allow access for permissions defined as a string', function(done) {
      server.route({
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
      });
      server.inject({
        method: 'GET',
        url: '/cars/1'
      }, function(res) {
        expect(res.statusCode).to.equal(200);
        done();
      });
    });

    it('should deny access to a route if user does not have permission', function(done) {
      server.route({
        method: 'POST',
        path: '/cars',
        config: {
          handler: function(request, reply) {
            reply('car created!');
          },
          plugins: {
            hapiRouteAcl: {
              permissions: ['cars:create']
            }
          }
        }
      });
      server.inject({
        method: 'POST',
        url: '/cars'
      }, function(res) {
        expect(res.statusCode).to.equal(401);
        done();
      });
    });

    it('should throw an exception if route permission is not a string', function(done) {
      server.ext('onPostAuth', function (request, reply) {
        request.domain.on('error', function (error) {
          request.caughtError = error;
        });

        return reply.continue();
      }, { before: ['hapi-route-acl'] });

      server.route({
        method: 'GET',
        path: '/cars',
        config: {
          handler: function(request, reply) {
            reply(['Toyota Camry', 'Honda Accord', 'Ford Fusion']);
          },
          plugins: {
            hapiRouteAcl: {
              permissions: [12345]
            }
          }
        }
      });

      server.inject({
        method: 'GET',
        url: '/cars'
      }, function(res) {
        var error = res.request.caughtError;

        expect(error).to.be.an.instanceof(Error);
        expect(error.message).to.equal('Uncaught error: permission must be a string');
        done();
      });
    });

    it('should throw an exception if route permission is not formatted properly', function(done) {
      server.ext('onPostAuth', function (request, reply) {
        request.domain.on('error', function (error) {
          request.caughtError = error;
        });

        return reply.continue();
      }, { before: ['hapi-route-acl'] });

      server.route({
        method: 'GET',
        path: '/cars',
        config: {
          handler: function(request, reply) {
            reply(['Toyota Camry', 'Honda Accord', 'Ford Fusion']);
          },
          plugins: {
            hapiRouteAcl: {
              permissions: ['carsread'] // missing colon
            }
          }
        }
      });

      server.inject({
        method: 'GET',
        url: '/cars'
      }, function(res) {
        var error = res.request.caughtError;

        expect(error).to.be.an.instanceof(Error);
        expect(error.message).to.equal('Uncaught error: permission must be formatted: [routeName]:[read|create|edit|delete]');
        done();
      });
    });

    it('should deny access to a route if user permission is not defined for the route', function(done) {
      server.route({
        method: 'DELETE',
        path: '/foobar/{id}',
        config: {
          handler: function(request, reply) {
            reply('car deleted!');
          },
          plugins: {
            hapiRouteAcl: {
              permissions: ['foobar:delete']
            }
          }
        }
      });
      server.inject({
        method: 'DELETE',
        url: '/foobar/1'
      }, function(res) {
        expect(res.statusCode).to.equal(401);
        done();
      });
    });

    it('should allow access to a route with multiple permission requirements if user has permissions', function(done) {
      server.route({
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
      });
      server.inject({
        method: 'GET',
        url: '/cars/1/drivers'
      }, function(res) {
        expect(res.statusCode).to.equal(200);
        done();
      });
    });

    it('should deny access to a route with two permission requirements if user does not have permissions', function(done) {
      server.route({
        method: 'DELETE',
        path: '/cars/{carId}/drivers/{driverId}',
        config: {
          handler: function(request, reply) {
            reply('driver deleted!');
          },
          plugins: {
            hapiRouteAcl: {
              permissions: ['drivers:delete', 'cars:read']
            }
          }
        }
      });
      server.inject({
        method: 'DELETE',
        url: '/cars/1/drivers/1'
      }, function(res) {
        expect(res.statusCode).to.equal(401);
        done();
      });
    });

    it('should deny access to a route with multiple permission requirements if user does not have permissions', function(done) {
      server.route({
        method: 'GET',
        path: '/cars/{carId}/drivers/{driverId}/abilities/{abilitiesId}',
        config: {
          handler: function(request, reply) {
            reply('driver deleted!');
          },
          plugins: {
            hapiRouteAcl: {
              permissions: ['drivers:read', 'cars:read', 'abilities:read']
            }
          }
        }
      });
      server.inject({
        method: 'GET',
        url: '/cars/1/drivers/1/abilities/1'
      }, function(res) {
        expect(res.statusCode).to.equal(401);
        done();
      });
    });

  });

});
