import { Router } from 'express'
import { supabase } from '../supabaseClient.js'
import { addLocalHistoryItem, deleteLocalHistoryItem, loadLocalHistory } from '../utils/historyStore.js'

export const historyRoute = Router()

historyRoute.post('/history', async (req, res) => {
  try {
    const { prompt, layoutData, ai_model } = req.body || {}

    if (!Array.isArray(layoutData) || layoutData.length === 0) {
      return res.status(400).json({ error: 'layoutData is required to save history' })
    }

    const safePrompt = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : 'Manual save'
    const safeModel = typeof ai_model === 'string' && ai_model.trim() ? ai_model.trim() : 'manual'

    try {
      const { data, error } = await supabase
        .from('city_layouts')
        .insert({
          prompt: safePrompt,
          grid: layoutData,
          ai_model: safeModel,
        })
        .select()
        .single()

      if (error) throw error

      return res.json({
        id: data.id,
        prompt: data.prompt,
        layoutData: data.grid,
        timestamp: new Date(data.created_at).getTime(),
      })
    } catch (dbError) {
      console.warn('Supabase history save failed, using local fallback:', dbError.message || dbError)
      const fallbackItem = {
        id: crypto.randomUUID(),
        prompt: safePrompt,
        layoutData,
        timestamp: Date.now(),
        ai_model: safeModel,
      }
      await addLocalHistoryItem(fallbackItem)
      return res.json({
        id: fallbackItem.id,
        prompt: fallbackItem.prompt,
        layoutData: fallbackItem.layoutData,
        timestamp: fallbackItem.timestamp,
      })
    }
  } catch (error) {
    console.error('Error saving history item:', error)
    res.status(500).json({ error: 'Failed to save history item' })
  }
})

historyRoute.get('/history', async (req, res) => {
  try {
    const localHistory = await loadLocalHistory()

    try {
      const { data, error } = await supabase
        .from('city_layouts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Map to frontend HistoryItem shape
      const history = data.map((row) => ({
        id: row.id,
        prompt: row.prompt,
        layoutData: row.grid,
        timestamp: new Date(row.created_at).getTime(),
      }))

      const seen = new Set(localHistory.map((item) => String(item.id)))
      const merged = [...localHistory, ...history.filter((item) => !seen.has(String(item.id)))]
      merged.sort((a, b) => b.timestamp - a.timestamp)

      return res.json(merged)
    } catch (dbError) {
      console.warn('Supabase history read failed, using local fallback:', dbError.message || dbError)
      return res.json(localHistory)
    }
  } catch (error) {
    console.error('Error fetching history:', error)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

historyRoute.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params
    try {
      const { error } = await supabase.from('city_layouts').delete().eq('id', id)

      if (error) throw error
      return res.json({ success: true })
    } catch (dbError) {
      console.warn('Supabase delete failed, using local fallback:', dbError.message || dbError)
      await deleteLocalHistoryItem(id)
      return res.json({ success: true })
    }
  } catch (error) {
    console.error('Error deleting history item:', error)
    res.status(500).json({ error: 'Failed to delete history item' })
  }
})
