// A namespace whose only export is a callable default (issue #83).
const greet = (name) => `hello ${name}`
greet.version = '1.0.0'
export default greet
