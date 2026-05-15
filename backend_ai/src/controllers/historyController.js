import { supabase } from '../config/supabase.js'
import { addLocalHistoryItem, deleteLocalHistoryItem, loadLocalHistory } from '../services/historyStore.js'
import { asyncHandler } from '../middlewares/errorHandler.js'

export const createHistoryItem = asyncHandler(async (req, res) => {
  const { id, prompt, layoutData, ai_model } = req.body || {}

  if (!Array.isArray(layoutData) || layoutData.length === 0) {
    const error = new Error('layoutData is required to save history')
    error.statusCode = 400
    throw error
  }

  const safePrompt = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : 'Manual save'
  const safeModel = typeof ai_model === 'string' && ai_model.trim() ? ai_model.trim() : 'manual'

  try {
    let data;
    let error;

    if (id) {
      // Update existing record
      ({ data, error } = await supabase
        .from('city_layouts')
        .update({
          prompt: safePrompt,
          grid: layoutData,
          ai_model: safeModel,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single());
        
      // If error or not found, try inserting instead of failing
      if (error || !data) {
        ({ data, error } = await supabase
          .from('city_layouts')
          .insert({
            id,
            prompt: safePrompt,
            grid: layoutData,
            ai_model: safeModel,
          })
          .select()
          .single());
      }
    } else {
      // Insert new record
      ({ data, error } = await supabase
        .from('city_layouts')
        .insert({
          prompt: safePrompt,
          grid: layoutData,
          ai_model: safeModel,
        })
        .select()
        .single());
    }

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
      id: id || crypto.randomUUID(),
      prompt: safePrompt,
      layoutData,
      timestamp: Date.now(),
      ai_model: safeModel,
    }
    
    // Check if item exists in local store and delete it before adding if we are doing an "update"
    if (id) {
      await deleteLocalHistoryItem(id);
    }
    await addLocalHistoryItem(fallbackItem)
    
    return res.json({
      id: fallbackItem.id,
      prompt: fallbackItem.prompt,
      layoutData: fallbackItem.layoutData,
      timestamp: fallbackItem.timestamp,
    })
  }
})

export const getHistory = asyncHandler(async (req, res) => {
  const localHistory = await loadLocalHistory()

  try {
    const { data, error } = await supabase
      .from('city_layouts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

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
})

export const deleteHistoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params
  try {
    const { error } = await supabase.from('city_layouts').delete().eq('id', id)
    if (error) throw error
    await deleteLocalHistoryItem(id)
    return res.json({ success: true, id })
  } catch (dbError) {
    console.warn('Supabase history delete failed, trying local fallback:', dbError.message || dbError)
    const localDeleted = await deleteLocalHistoryItem(id)
    if (localDeleted) {
      return res.json({ success: true, id })
    }
    const error = new Error('Failed to delete history item')
    error.statusCode = 500
    throw error
  }
})
