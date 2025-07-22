import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react"

type Model = {
  id: string
  name: string
  pricing?: string
}

export function ModelSelector({ onChange }: { onChange: (model: string) => void }) {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<string | undefined>()

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/models")
        const data = await res.json()

        // Filter only free models (those that include ":free" in their ID)
        const freeModels = data.data
          .filter((model: any) => model.id.includes(":free"))
          .map((model: any) => ({
            id: model.id,
            name: model.name,
          }))

        setModels(freeModels)
        if (freeModels.length > 0) {
          const stored = localStorage.getItem("selected-model") || freeModels[0].id
          setSelectedModel(stored)
          onChange(stored)
        }
      } catch (err) {
        console.error("Failed to fetch models:", err)
      }
    }

    fetchModels()
  }, [])

  const handleChange = (value: string) => {
    setSelectedModel(value)
    localStorage.setItem("selected-model", value)
    onChange(value)
  }

  return (
    <Select value={selectedModel} onValueChange={handleChange}>
      <SelectTrigger className="w-full truncate">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
