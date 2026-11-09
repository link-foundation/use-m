// A default export that already has its own `default` keeps it (issue #83).
const factory = () => 'factory'
factory.default = 'own default'
export default factory
