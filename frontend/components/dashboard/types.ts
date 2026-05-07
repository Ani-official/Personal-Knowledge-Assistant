export type DocumentItem = {
  doc_id: string
  filename: string
  status: string
  upload_time: string
}

export type Source = {
  doc_id: string
  filename: string
  score: number
}

export type ChatMessage = {
  type: "user" | "ai"
  text: string
  sources?: Source[]
}

export type ConversationSummary = {
  id: string
  title: string
  scope: "document" | "workspace"
  doc_id: string | null
  created_at: string
  updated_at: string
  document_filename: string | null
  document_deleted: boolean
  message_count: number
}

export type ConversationDetail = ConversationSummary & {
  messages: Array<{
    id: number
    role: "user" | "ai"
    content: string
    sources: Source[]
    created_at: string
  }>
}

