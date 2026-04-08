/* eslint-disable no-underscore-dangle */
const DEFAULT_FACTORY_CONFIG = {
  BASE_FACTORY_NAMESPACED_API_KEY: 'base-factory-namespaced-api',
  BASE_FACTORY_CLUSTERSCOPED_API_KEY: 'base-factory-clusterscoped-api',
  BASE_FACTORY_NAMESPACED_BUILTIN_KEY: 'base-factory-namespaced-builtin',
  BASE_FACTORY_CLUSTERSCOPED_BUILTIN_KEY: 'base-factory-clusterscoped-builtin',
  BASE_NAMESPACE_FACTORY_KEY: 'base-factory-clusterscoped-builtin',
} as const

export const OPENAPI_UI_BASEPREFIX = '/openapi-ui'

const getWindowEnv = (): Record<string, string | undefined> => (typeof window === 'undefined' ? {} : window._env_ ?? {})

export const getRuntimeFactoryConfig = () => {
  const env = getWindowEnv()

  return {
    baseFactoryNamespacedAPIKey:
      env.BASE_FACTORY_NAMESPACED_API_KEY ?? DEFAULT_FACTORY_CONFIG.BASE_FACTORY_NAMESPACED_API_KEY,
    baseFactoryClusterSceopedAPIKey:
      env.BASE_FACTORY_CLUSTERSCOPED_API_KEY ?? DEFAULT_FACTORY_CONFIG.BASE_FACTORY_CLUSTERSCOPED_API_KEY,
    baseFactoryNamespacedBuiltinKey:
      env.BASE_FACTORY_NAMESPACED_BUILTIN_KEY ?? DEFAULT_FACTORY_CONFIG.BASE_FACTORY_NAMESPACED_BUILTIN_KEY,
    baseFactoryClusterSceopedBuiltinKey:
      env.BASE_FACTORY_CLUSTERSCOPED_BUILTIN_KEY ?? DEFAULT_FACTORY_CONFIG.BASE_FACTORY_CLUSTERSCOPED_BUILTIN_KEY,
    baseNamespaceFactoryKey: env.BASE_NAMESPACE_FACTORY_KEY ?? DEFAULT_FACTORY_CONFIG.BASE_NAMESPACE_FACTORY_KEY,
  }
}
