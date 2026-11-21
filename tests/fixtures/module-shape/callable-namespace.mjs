export let calls = 0
export const name = 'named export'
export const $ = () => 'named helper'

function greet(who) {
  if (new.target) {
    this.greeting = `hello ${who}`
    return
  }
  calls++
  return `${this?.prefix ?? 'hello'} ${who}`
}

Object.defineProperties(greet, {
  $: { value: () => 'default helper' },
  attached: { value: () => 'attached method' },
  default: { value: 'existing default property' },
  then: { value: () => { throw new Error('attached then must not run during loading') } },
})
Object.freeze(greet)

export default greet
