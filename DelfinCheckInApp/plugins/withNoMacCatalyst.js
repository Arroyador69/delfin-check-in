const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Plugin para deshabilitar Mac Catalyst y evitar crashes en macOS
 */
const withNoMacCatalyst = (config) => {
  return withInfoPlist(config, (config) => {
    // Deshabilitar Mac Catalyst explícitamente
    config.modResults['UIApplicationSupportsIndirectInputEvents'] = false;
    
    // Asegurar que solo funcione en iOS
    if (!config.modResults['LSRequiresIPhoneOS']) {
      config.modResults['LSRequiresIPhoneOS'] = true;
    }
    
    return config;
  });
};

module.exports = withNoMacCatalyst;

