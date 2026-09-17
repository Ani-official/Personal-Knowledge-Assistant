export type DocumentItem = {
  doc_id: string
  filename: string
  status: string
  upload_time: string
  /** Null for documents indexed before page text was stored. */
  page_count: number | null
  /** "page" for PDFs, "section" for formats without inherent pagination. */
  page_label: string
}

export type Source = {
  doc_id: string
  filename: string
  score: number
  /** The retrieved passage itself — what the answer was grounded in. */
  text?: string
  page?: number | null
}

export type DocumentPage = {
  doc_id: string
  filename: string
  page_number: number
  page_count: number
  page_label: string
  text: string
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

