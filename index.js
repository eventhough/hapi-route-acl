// Load modules

var Boom = require('boom');
var Hoek = require('hoek');
var _ = require('lodash');

// Declare internals

var internals = {};
internals.pluginName = 'hapiRouteAcl';

exports.register = function (server, options, next) {
  Hoek.assert(options.permissionsFunc, 'options.permissionsFunc is required');
  Hoek.assert(typeof options.permissionsFunc === 'function', 'options.permissionsFunc must be a valid function');

  internals.permissionsFunc = options.permissionsFunc;

  server.ext('onPostAuth', internals.implementation);
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};

internals.implementation = function(request, reply) {
  if (!_.isEmpty(request.route.settings.plugins[internals.pluginName])) {
    var requiredPermissions = request.route.settings.plugins[internals.pluginName].permissions;
    if (!_.isEmpty(requiredPermissions)) {
      internals.permissionsFunc(request.auth.credentials, function(error, userPermissions) {
        if (error) {
          return reply(Boom.wrap(error));
        } else {
          var result = internals.checkPermissions(requiredPermissions, userPermissions);
          if (_.isError(result)) {
            return reply(Boom.wrap(result));
          } else if (result) {
            return reply.continue();
          } else {
            return reply(Boom.unauthorized('Access denied'));
          }
        }
      });
    } else {
      return reply.continue();
    }
  } else {
    return reply.continue();
  }
};

internals.checkPermissions = function(requiredPermissions, userPermissions) {
  var permissionMap = {};

  _.forEach(requiredPermissions, function(requiredPermission) {
    var parts = requiredPermission.split(':');

    if (parts.length !== 2) {
      return new Error('permission must match format: [routeName]:[read|create|edit|delete]');
    } else {
      var routeName = parts[0];
      var crud = parts[1];

      permissionMap[requiredPermission] = userPermissions[routeName][crud];
    }
  });

  var result = _.reduce(permissionMap, function(result, permission, requiredPermission) {
    return result && permissionMap[requiredPermission];
  }, true);

  return result;
};
