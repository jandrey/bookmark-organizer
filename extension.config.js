import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
/** @type {import('extension').FileConfig} */
export default {
  browser: {
    chrome: {
      profile: path.join(__dirname, 'dist', 'chrome-profile'),
      browserFlags: [
        '--enable-experimental-web-platform-features',
        '--enable-prompt-api',
        '--enable-features=PromptApiForGeminiNano,OptimizationGuideOnDeviceModel'
      ]
    },
  }
}