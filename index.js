// Load modules

const Boom = require('boom');
const Hoek = require('hoek');
const _ = require('lodash');

// Declare internals

let internals = {};
internals.pluginName = 'hapiRouteAcl';

exports.plugin = {  
  register: (server, options) => {
    if (_.isUndefined(options.permissionsFunc)) {
      throw new Error('options.permissionsFunc is required');
    } else if (!_.isFunction(options.permissionsFunc)) {
      throw new Error('options.permissionsFunc must be a valid function');
    } else {
      internals.permissionsFunc = options.permissionsFunc;
      server.ext({type:'onPostAuth', method: internals.implementation});
    }
  },
  pkg: require('./package.json')
}

internals.implementation = function(request, h) {
  if (!_.isEmpty(request.route.settings.plugins[internals.pluginName])) {
    let requiredPermissions = request.route.settings.plugins[internals.pluginName].permissions;
    if (!_.isEmpty(requiredPermissions)) {
      internals.permissionsFunc(request.auth.credentials, function(error, userPermissions) {
        let hasPermission = internals.checkPermissions(requiredPermissions, userPermissions);
        if (hasPermission) {
          return h.continue();
        } else {
          throw Boom.unauthorized('Access denied');
        }
      });
    } else {
      return h.continue();
    }
  } else {
    return h.continue();
  }
};

internals.checkPermissions = function(requiredPermissions, userPermissions) {
  if (_.isString(requiredPermissions)) {
    requiredPermissions = [requiredPermissions];
  }

  let permissionMap = {};

  _.forEach(requiredPermissions, function(requiredPermission) {
    Hoek.assert(_.isString(requiredPermission), 'permission must be a string');

    let parts = requiredPermission.split(':');

    Hoek.assert(parts.length === 2, 'permission must be formatted: [routeName]:[read|create|edit|delete]');

    let routeName = parts[0];
    let crud = parts[1];

    if (_.isUndefined(userPermissions[routeName]) || _.isUndefined(userPermissions[routeName][crud])) {
      permissionMap[requiredPermission] = false;
    } else {
      permissionMap[requiredPermission] = userPermissions[routeName][crud];
    }
  });

  let hasPermission = _.reduce(permissionMap, function(result, permission) {
    result = result && permission;
    return result;
  });

  return hasPermission;
};
