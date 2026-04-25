import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '..', 'data')
const historyFile = path.resolve(dataDir, 'history.json')

async function ensureHistoryFile() {
  await fs.mkdir(dataDir, { recursive: true })
  try {
    await fs.access(historyFile)
  } catch {
    await fs.writeFile(historyFile, '[]', 'utf8')
  }
}

export async function loadLocalHistory() {
  await ensureHistoryFile()
  const raw = await fs.readFile(historyFile, 'utf8')
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveLocalHistory(history) {
  await ensureHistoryFile()
  await fs.writeFile(historyFile, JSON.stringify(history, null, 2), 'utf8')
}

export async function addLocalHistoryItem(item) {
  const history = await loadLocalHistory()
  history.unshift(item)
  await saveLocalHistory(history)
  return item
}

export async function deleteLocalHistoryItem(id) {
  const history = await loadLocalHistory()
  const next = history.filter((item) => String(item.id) !== String(id))
  const deleted = next.length !== history.length
  await saveLocalHistory(next)
  return deleted
}
