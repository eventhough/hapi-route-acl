// Load modules

var Boom = require('boom');
var Hoek = require('hoek');
var _ = require('lodash');

// Declare internals

var internals = {};
internals.pluginName = 'hapiRouteAcl';

exports.register = function (server, options, next) {
  if (_.isUndefined(options.permissionsFunc)) {
    next(new Error('options.permissionsFunc is required'));
  } else if (!_.isFunction(options.permissionsFunc)) {
    next(new Error('options.permissionsFunc must be a valid function'));
  } else {
    internals.permissionsFunc = options.permissionsFunc;
    server.ext('onPostAuth', internals.implementation);
    next();
  }
};

exports.register.attributes = {
  pkg: require('./package.json')
};

internals.implementation = function(request, reply) {
  if (!_.isEmpty(request.route.settings.plugins[internals.pluginName])) {

    var requiredPermissions = request.route.settings.plugins[internals.pluginName].permissions;

    if (!_.isEmpty(requiredPermissions)) {
      internals.permissionsFunc(request.auth.credentials, function(error, userPermissions) {
        var hasPermission = internals.checkPermissions(requiredPermissions, userPermissions);
        if (hasPermission) {
          return reply.continue();
        } else {
          return reply(Boom.unauthorized('Access denied'));
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
  if (_.isString(requiredPermissions)) {
    requiredPermissions = [requiredPermissions];
  }

  var permissionMap = {};

  _.forEach(requiredPermissions, function(requiredPermission) {
    Hoek.assert(_.isString(requiredPermission), 'permission must be a string');

    var parts = requiredPermission.split(':');

    Hoek.assert(parts.length === 2, 'permission must be formatted: [routeName]:[read|create|edit|delete]');

    var routeName = parts[0];
    var crud = parts[1];

    if (_.isUndefined(userPermissions[routeName]) || _.isUndefined(userPermissions[routeName][crud])) {
      permissionMap[requiredPermission] = false;
    } else {
      permissionMap[requiredPermission] = userPermissions[routeName][crud];
    }
  });

  var hasPermission = _.reduce(permissionMap, function(result, permission) {
    result = result && permission;
    return result;
  });

  return hasPermission;
};
