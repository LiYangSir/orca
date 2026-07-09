import { ipcMain } from 'electron'
import {
  listLocalTasks,
  getLocalTask,
  createLocalTask,
  updateLocalTask,
  deleteLocalTask
} from '../local-tasks/store'
import {
  listLocalTaskLabels,
  createLocalTaskLabel,
  updateLocalTaskLabel,
  deleteLocalTaskLabel,
  listTaskComments,
  createTaskComment,
  deleteTaskComment,
  listTaskActivities
} from '../local-tasks/store-secondary'
import {
  isLocalTaskStatus,
  isLocalTaskPriority,
  isValidHexColor
} from '../../shared/local-task-types'

export function registerLocalTaskHandlers(): void {
  ipcMain.handle('localTasks:list', async (_event, args?: unknown) => {
    try {
      const raw = (args ?? {}) as Record<string, unknown>
      const filter = {
        repoPath: typeof raw.repoPath === 'string' ? raw.repoPath : undefined,
        parentId:
          raw.parentId === null ? null : typeof raw.parentId === 'string' ? raw.parentId : undefined
      }
      return { ok: true, data: listLocalTasks(filter) }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('localTasks:get', async (_event, args: { id: string }) => {
    try {
      const id = typeof args?.id === 'string' ? args.id.trim() : ''
      if (!id) {
        return { ok: false, error: 'Missing task id' }
      }
      return { ok: true, data: getLocalTask(id) }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('localTasks:create', async (_event, args: unknown) => {
    try {
      const raw = (args ?? {}) as Record<string, unknown>
      const title = typeof raw.title === 'string' ? raw.title.trim() : ''
      if (!title) {
        return { ok: false, error: 'Title is required' }
      }
      return {
        ok: true,
        data: createLocalTask({
          title,
          status: isLocalTaskStatus(raw.status) ? raw.status : undefined,
          priority: isLocalTaskPriority(raw.priority) ? raw.priority : undefined,
          description: typeof raw.description === 'string' ? raw.description : undefined,
          labelIds: Array.isArray(raw.labelIds)
            ? (raw.labelIds as unknown[]).filter((v): v is string => typeof v === 'string')
            : undefined,
          parentId: typeof raw.parentId === 'string' ? raw.parentId : undefined,
          repoPath: typeof raw.repoPath === 'string' ? raw.repoPath : undefined,
          dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : undefined
        })
      }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('localTasks:update', async (_event, args: unknown) => {
    try {
      const raw = (args ?? {}) as Record<string, unknown>
      const id = typeof raw.id === 'string' ? raw.id.trim() : ''
      if (!id) {
        return { ok: false, error: 'Missing task id' }
      }
      return {
        ok: true,
        data: updateLocalTask(id, {
          title: typeof raw.title === 'string' ? raw.title : undefined,
          status: isLocalTaskStatus(raw.status) ? raw.status : undefined,
          priority: isLocalTaskPriority(raw.priority) ? raw.priority : undefined,
          description: typeof raw.description === 'string' ? raw.description : undefined,
          labelIds: Array.isArray(raw.labelIds)
            ? (raw.labelIds as unknown[]).filter((v): v is string => typeof v === 'string')
            : undefined,
          parentId: typeof raw.parentId === 'string' ? raw.parentId : undefined,
          repoPath: typeof raw.repoPath === 'string' ? raw.repoPath : undefined,
          dueDate:
            raw.dueDate === null ? null : typeof raw.dueDate === 'string' ? raw.dueDate : undefined,
          archivedAt:
            raw.archivedAt === null
              ? null
              : typeof raw.archivedAt === 'number'
                ? raw.archivedAt
                : undefined
        })
      }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('localTasks:delete', async (_event, args: { id: string }) => {
    try {
      const id = typeof args?.id === 'string' ? args.id.trim() : ''
      if (!id) {
        return { ok: false, error: 'Missing task id' }
      }
      return { ok: true, deleted: deleteLocalTask(id) }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  // --- Label handlers ---

  ipcMain.handle('localTaskLabels:list', async () => {
    try {
      return { ok: true, data: listLocalTaskLabels() }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('localTaskLabels:create', async (_event, args: unknown) => {
    try {
      const raw = (args ?? {}) as Record<string, unknown>
      const name = typeof raw.name === 'string' ? raw.name.trim() : ''
      if (!name) {
        return { ok: false, error: 'Label name is required' }
      }
      if (!isValidHexColor(raw.color)) {
        return { ok: false, error: 'Invalid color format (expected #RRGGBB)' }
      }
      return { ok: true, data: createLocalTaskLabel({ name, color: raw.color }) }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('localTaskLabels:update', async (_event, args: unknown) => {
    try {
      const raw = (args ?? {}) as Record<string, unknown>
      const id = typeof raw.id === 'string' ? raw.id.trim() : ''
      if (!id) {
        return { ok: false, error: 'Missing label id' }
      }
      if (raw.color !== undefined && !isValidHexColor(raw.color)) {
        return { ok: false, error: 'Invalid color format (expected #RRGGBB)' }
      }
      return {
        ok: true,
        data: updateLocalTaskLabel(id, {
          name: typeof raw.name === 'string' ? raw.name : undefined,
          color: isValidHexColor(raw.color) ? raw.color : undefined
        })
      }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('localTaskLabels:delete', async (_event, args: { id: string }) => {
    try {
      const id = typeof args?.id === 'string' ? args.id.trim() : ''
      if (!id) {
        return { ok: false, error: 'Missing label id' }
      }
      return { ok: true, deleted: deleteLocalTaskLabel(id) }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  // --- Comment handlers ---

  ipcMain.handle('localTaskComments:list', async (_event, args: { taskId: string }) => {
    try {
      const taskId = typeof args?.taskId === 'string' ? args.taskId.trim() : ''
      if (!taskId) {
        return { ok: false, error: 'Missing task id' }
      }
      return { ok: true, data: listTaskComments(taskId) }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('localTaskComments:create', async (_event, args: unknown) => {
    try {
      const raw = (args ?? {}) as Record<string, unknown>
      const taskId = typeof raw.taskId === 'string' ? raw.taskId.trim() : ''
      const content = typeof raw.content === 'string' ? raw.content.trim() : ''
      if (!taskId) {
        return { ok: false, error: 'Missing task id' }
      }
      if (!content) {
        return { ok: false, error: 'Comment content is required' }
      }
      return { ok: true, data: createTaskComment(taskId, content) }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  ipcMain.handle('localTaskComments:delete', async (_event, args: { id: string }) => {
    try {
      const id = typeof args?.id === 'string' ? args.id.trim() : ''
      if (!id) {
        return { ok: false, error: 'Missing comment id' }
      }
      return { ok: true, deleted: deleteTaskComment(id) }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  // --- Activity handlers ---

  ipcMain.handle('localTaskActivities:list', async (_event, args: { taskId: string }) => {
    try {
      const taskId = typeof args?.taskId === 'string' ? args.taskId.trim() : ''
      if (!taskId) {
        return { ok: false, error: 'Missing task id' }
      }
      return { ok: true, data: listTaskActivities(taskId) }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
