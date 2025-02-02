import * as Path from '../Path/Path.js'
import * as Root from '../Root/Root.js'

export const getPtyHostPath = () => {
  return Path.join(Root.root, '@lvce-editor', 'pty-host')
}
