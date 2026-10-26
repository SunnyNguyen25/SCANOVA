import { existsSync } from "node:fs"
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const serviceDir = path.join(projectDir, "backend", "ocr_service")
const python = process.platform === "win32"
  ? path.join(serviceDir, ".venv", "Scripts", "python.exe")
  : path.join(serviceDir, ".venv", "bin", "python")

if (!existsSync(python)) {
  console.error("OCR environment is missing. Run the platform setup command first.")
  process.exit(1)
}

const server = spawn(
  python,
  ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "4173"],
  { cwd: serviceDir, stdio: "inherit" },
)

server.on("exit", (code) => process.exit(code ?? 1))
