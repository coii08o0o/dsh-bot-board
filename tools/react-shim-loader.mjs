// Resolves `react` to the shim so the real client modules can be imported in Node.
export async function resolve(specifier, context, next) {
  if (specifier === 'react' || specifier === 'react/jsx-runtime') {
    return { url: new URL('./react-shim.mjs', import.meta.url).href, shortCircuit: true }
  }
  return next(specifier, context)
}
