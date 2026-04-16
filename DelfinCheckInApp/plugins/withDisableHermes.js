const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Plugin para FORZAR la deshabilitación de Hermes a nivel de Xcode
 * Esto asegura que JSC se use en lugar de Hermes
 */
const withDisableHermes = (config) => {
  // Modificar el proyecto de Xcode
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    // Buscar todas las configuraciones del proyecto
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    Object.keys(configurations).forEach((configId) => {
      const buildSettings = configurations[configId].buildSettings;
      
      if (buildSettings) {
        // FORZAR deshabilitar Hermes
        buildSettings['USE_HERMES'] = 'NO';
        buildSettings['HERMES_ENABLED'] = 'NO';
        buildSettings['EX_DEV_CLIENT_NETWORK_INSPECTOR'] = 'NO';
        
        // Asegurar que JSC esté habilitado
        buildSettings['USE_JSC'] = 'YES';
        
        // Eliminar cualquier referencia a Hermes en los frameworks
        if (buildSettings['OTHER_LDFLAGS']) {
          const flags = buildSettings['OTHER_LDFLAGS'];
          if (Array.isArray(flags)) {
            buildSettings['OTHER_LDFLAGS'] = flags.filter(
              flag => !flag.includes('hermes') && !flag.includes('Hermes')
            );
          }
        }
        
        // Eliminar referencias a Hermes en FRAMEWORK_SEARCH_PATHS
        if (buildSettings['FRAMEWORK_SEARCH_PATHS']) {
          const paths = buildSettings['FRAMEWORK_SEARCH_PATHS'];
          if (Array.isArray(paths)) {
            buildSettings['FRAMEWORK_SEARCH_PATHS'] = paths.filter(
              p => !p.includes('hermes') && !p.includes('Hermes')
            );
          }
        }
      }
    });
    
    return config;
  });
  
  return config;
};

module.exports = withDisableHermes;
