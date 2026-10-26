import ieltsExtractionSchema from "../schemas/ielts-fields.json"

type ExtractionField = { key: string; label: string }

type IeltsReviewGridProps = {
  data: Record<string, unknown>
  onChange: (key: string, value: string) => void
}

const fields = ieltsExtractionSchema.fields as ExtractionField[]

export function IeltsReviewGrid({ data, onChange }: IeltsReviewGridProps) {
  return (
    <>
      {fields.map(({ key, label }) => {
        const value = data[key]
        return (
          <label key={key}>
            {label}
            <input
              value={
                value == null
                  ? ""
                  : typeof value === "string"
                    ? value
                    : JSON.stringify(value)
              }
              placeholder="Not detected"
              onChange={(event) => onChange(key, event.target.value)}
            />
          </label>
        )
      })}
    </>
  )
}
