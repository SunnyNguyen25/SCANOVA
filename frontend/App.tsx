import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { Session } from "@supabase/supabase-js"
import {
  Certificate,
  listCertificates,
  saveCertificate,
  seedDemoCertificates,
} from "./lib/certificates"
import { extractCertificate } from "./lib/ocr"
import { supabase } from "./lib/supabase"
import { IeltsReviewGrid } from "./components/IeltsReviewGrid"

type Page = "home" | "jobs" | "processing" | "assistant"
type JobStatus = "Completed" | "Processing"

type Job = {
  id: string
  creator: string
  type: "IELTS" | "TOEFL" | "TOEIC"
  operation: "Import" | "Export"
  status: JobStatus
  completed: number
  processing: number
  errors: number
  total: number
  processedAt: string
  holder: string
  score: string
}

const jobs: Job[] = [
  {
    id: "JSB-009",
    creator: "Vo Minh Nghia",
    type: "IELTS",
    operation: "Import",
    status: "Completed",
    completed: 142,
    processing: 8,
    errors: 3,
    total: 153,
    processedAt: "2025-06-25 09:41",
    holder: "Nguyen Minh Anh",
    score: "7.5",
  },
  {
    id: "JSB-010",
    creator: "Nguyen Thanh Thao",
    type: "IELTS",
    operation: "Export",
    status: "Processing",
    completed: 58,
    processing: 12,
    errors: 7,
    total: 77,
    processedAt: "2025-06-25 08:15",
    holder: "Tran Bao Chau",
    score: "8.0",
  },
  {
    id: "JSB-011",
    creator: "Nguyen Duy Huan",
    type: "TOEFL",
    operation: "Import",
    status: "Processing",
    completed: 97,
    processing: 2,
    errors: 1,
    total: 100,
    processedAt: "2025-06-25 10:00",
    holder: "Le Hoang Nam",
    score: "104",
  },
  {
    id: "JSB-012",
    creator: "Song Anh",
    type: "TOEFL",
    operation: "Import",
    status: "Completed",
    completed: 210,
    processing: 0,
    errors: 4,
    total: 214,
    processedAt: "2025-06-25 10:05",
    holder: "Pham My Linh",
    score: "112",
  },
  {
    id: "JSB-013",
    creator: "Do Huyen",
    type: "TOEIC",
    operation: "Export",
    status: "Completed",
    completed: 86,
    processing: 3,
    errors: 2,
    total: 91,
    processedAt: "2025-06-24 16:20",
    holder: "Hoang Gia Bao",
    score: "875",
  },
  {
    id: "JSB-014",
    creator: "Linh Tran",
    type: "IELTS",
    operation: "Import",
    status: "Processing",
    completed: 33,
    processing: 16,
    errors: 1,
    total: 50,
    processedAt: "2025-06-24 14:10",
    holder: "Vu Thu Ha",
    score: "6.5",
  },
]

const navItems: { key: Page label: string }[] = [
  { key: "home", label: "Home" },
  { key: "jobs", label: "Certificates" },
  { key: "processing", label: "Add Certificate" },
  { key: "assistant", label: "AI Assistant" },
]

function Icon({ name, size = 18 }: { name: string size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
      </>
    ),
    file: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="m4 6 .5.5L6 5M4 12l.5.5L6 11M4 18l.5.5L6 17" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    upload: (
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M5 15v4h14v-4" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.2 4.3L17 9l-3.8 1.7L12 15l-1.2-4.3L7 9l3.8-1.7L12 3Z" />
        <path d="m18.5 15 .6 2.2L21 18l-1.9.8-.6 2.2-.6-2.2L16 18l1.9-.8.6-2.2Z" />
      </>
    ),
    send: (
      <>
        <path d="m3 11 18-8-8 18-2-8-8-2Z" />
        <path d="M11 13 21 3" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 6v5h-5" />
        <path d="M4 18v-5h5" />
        <path d="M18.5 9A7 7 0 0 0 6 6.5L4 11M5.5 15A7 7 0 0 0 18 17.5l2-4.5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  }
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function AppShell({
  page,
  onNavigate,
  children,
}: {
  page: Page
  onNavigate: (page: Page) => void
  children: ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => onNavigate("home")}
          aria-label="Go to home"
        >
          <span className="brand-mark">
            <span>ϟ</span>
          </span>
          <span>SCANOVA</span>
        </button>
        <button
          className="mobile-menu"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
        <nav
          className={mobileOpen ? "main-nav open" : "main-nav"}
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <button
              key={item.key}
              className={page === item.key ? "active" : ""}
              onClick={() => {
                onNavigate(item.key)
                setMobileOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <button className="icon-button" aria-label="Toggle theme">
            <Icon name="sun" />
          </button>
          <button className="icon-button" aria-label="Language">
            <Icon name="globe" />
          </button>
          <button className="avatar" aria-label="User profile">
            A
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}

function SearchField({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="search-field">
      <Icon name="search" size={17} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search">
          <Icon name="close" size={14} />
        </button>
      )}
    </label>
  )
}

function Hero() {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <span>Welcome to</span>
        <h1>SCANOVA</h1>
        <p>
          Scan English certificates quickly and
          <br />
          accurately with OCR.
        </p>
      </div>
      <div className="sun-disc" />
      <div className="mountains" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </section>
  )
}

function Stats() {
  const stats = [
    { label: "Certificates", value: "8", trend: "+10.86%", icon: "file" },
    { label: "Processed", value: "3", trend: "+26.50%", icon: "check" },
    { label: "Pending", value: "5", trend: "+10.92%", icon: "clock" },
    { label: "Completion Rate", value: "38%", trend: "+38.50%", icon: "list" },
  ]
  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <article className="stat-card" key={stat.label}>
          <div>
            <span>{stat.label}</span>
            <strong>
              {stat.value} <small>{stat.trend}</small>
            </strong>
          </div>
          <span className="stat-icon">
            <Icon name={stat.icon} size={22} />
          </span>
        </article>
      ))}
    </div>
  )
}

function LineChart() {
  const values =
    "0,31 42,109 84,106 126,83 168,25 210,52 252,62 294,72 336,87 378,60 420,35 462,34"
  return (
    <div className="chart-wrap">
      <div className="chart-y">
        <span>500</span>
        <span>400</span>
        <span>300</span>
        <span>200</span>
        <span>100</span>
        <span>0</span>
      </div>
      <svg
        className="line-chart"
        viewBox="0 0 462 130"
        preserveAspectRatio="none"
        role="img"
        aria-label="Monthly certificates line chart"
      >
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#3d8cff" stopOpacity=".2" />
            <stop offset="1" stopColor="#3d8cff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75, 100, 125].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="462"
            y2={y}
            stroke="#cfd2ec"
            strokeDasharray="3 4"
          />
        ))}
        <polygon points={`${values} 462,130 0,130`} fill="url(#lineFill)" />
        <polyline
          points={values}
          fill="none"
          stroke="#3185ff"
          strokeWidth="2.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="chart-x">
        {[
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  )
}

function BarChart() {
  const bars = [
    [52, 34, 18],
    [36, 0, 23],
    [24, 0, 64],
    [69, 48, 21],
    [42, 0, 28],
    [25, 0, 0],
  ]
  return (
    <div className="bar-chart">
      <div className="bar-plot">
        {bars.map((set, i) => (
          <div className="bar-stack" key={i}>
            {set.map(
              (height, j) =>
                height > 0 && (
                  <i
                    key={j}
                    className={`bar c${j}`}
                    style={{ height: `${height}px` }}
                  />
                ),
            )}
          </div>
        ))}
      </div>
      <div className="legend">
        <span>
          <i className="blue" />
          Completed
        </span>
        <span>
          <i className="cyan" />
          Pending
        </span>
        <span>
          <i className="pink" />
          Failed
        </span>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: JobStatus }) {
  return (
    <span className={`status ${status.toLowerCase()}`}>
      <i />
      {status}
    </span>
  )
}

function RecentJobs({ query }: { query: string }) {
  const filtered = jobs.filter((job) =>
    `${job.id} ${job.creator} ${job.type}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <h2>Recent Certificates</h2>
        <span>{filtered.length} certificates</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Certificate</th>
              <th>Holder</th>
              <th>Type</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.id}>
                <td>{job.id}</td>
                <td>
                  <strong>{job.holder}</strong>
                </td>
                <td>
                  <span className="operation">{job.type}</span>
                </td>
                <td>
                  <strong>{job.score}</strong>
                </td>
                <td><StatusPill status={job.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty-row">No certificates match your search.</div>
        )}
      </div>
    </section>
  )
}

function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [query, setQuery] = useState("")
  return (
    <div className="page page-home">
      <div className="content home-content">
        <Hero />
        <div className="home-search">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search certificates or people..."
          />
          <button className="search-action" onClick={() => onNavigate("jobs")}>
            ⌘ K
          </button>
        </div>
        <Stats />
        <div className="chart-grid">
          <section className="panel overview-panel">
            <div className="panel-title">
              <div>
                <h2>Certificates Overview</h2>
                <p>
                  <b>+5 more</b> last month
                </p>
              </div>
            </div>
            <LineChart />
          </section>
          <section className="panel status-panel">
            <div className="panel-title">
              <h2>Certificate processing status</h2>
            </div>
            <BarChart />
          </section>
        </div>
        <RecentJobs query={query} />
      </div>
    </div>
  )
}

function CertificatePreview({
  compact = false,
  imageUrl,
}: {
  compact?: boolean
  imageUrl?: string
}) {
  if (imageUrl)
    return (
      <div
        className={`certificate-preview uploaded ${compact ? "compact" : ""}`}
      >
        <img src={imageUrl} alt="Uploaded certificate" />
      </div>
    )
  return (
    <div className={`certificate-preview no-preview ${compact ? "compact" : ""}`} />
  )
}

function JobListPage() {
  const [query, setQuery] = useState("")
  const [type, setType] = useState("All")
  const [status, setStatus] = useState("All")
  const [selected, setSelected] = useState<Job | null>(null)
  const filtered = jobs.filter(
    (job) =>
      (type === "All" || job.type === type) &&
      (status === "All" || job.status === status) &&
      `${job.id} ${job.creator} ${job.type}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  return (
    <div className="page jobs-page">
      <div className="jobs-layout">
        <aside className="jobs-sidebar">
          <div className="sidebar-heading">
            <h1>Certificates</h1>
            <button
              onClick={() => {
                setQuery("")
                setType("All")
                setStatus("All")
              }}
              aria-label="Reset filters"
            >
              <Icon name="refresh" size={16} />
            </button>
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search certificates..."
          />
          <div className="filters">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Certificate type"
            >
              <option>All</option>
              <option>IELTS</option>
              <option>TOEFL</option>
              <option>TOEIC</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Job status"
            >
              <option>All</option>
              <option>Completed</option>
              <option>Processing</option>
            </select>
          </div>
          <div className="status-legend">
            <StatusPill status="Completed" />
            <StatusPill status="Processing" />
          </div>
          <div className="job-items">
            {filtered.map((job) => (
              <button
                key={job.id}
                className={
                  selected?.id === job.id ? "job-item selected" : "job-item"
                }
                onClick={() => setSelected(job)}
              >
                <span>
                  <StatusPill status={job.status} />
                  <b>{job.id}</b>
                  <small>Certificate: {job.type}</small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
            ))}
            {!filtered.length && (
              <div className="empty-list">No certificates found.</div>
            )}
          </div>
        </aside>
        <section className="job-detail">
          {selected ? (
            <>
              <header>
                <div>
                  <h2>Record: {selected.id}</h2>
                  <p>Certificate: {selected.type}</p>
                </div>
                <StatusPill status={selected.status} />
              </header>
              <div className="detail-body">
                <h3>Certificate Details - 001</h3>
                <div className="detail-card">
                  <CertificatePreview />
                  <div className="detail-fields">
                    <label>
                      Full Name
                      <input value={selected.holder} readOnly />
                    </label>
                    <label>
                      Certificate Type
                      <input value={selected.type} readOnly />
                    </label>
                    <label>
                      Certificate ID
                      <input
                        value={`${selected.type}-25-${selected.id.slice(-3)}`}
                        readOnly
                      />
                    </label>
                    <label>
                      Overall Score
                      <input value={selected.score} readOnly />
                    </label>
                    <label>
                      Test Date
                      <input value="15 May 2025" readOnly />
                    </label>
                    <label>
                      Expiry Date
                      <input value="15 May 2027" readOnly />
                    </label>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="detail-empty">
              <span className="empty-icon">
                <Icon name="file" size={30} />
              </span>
              <h2>Choose a certificate</h2>
              <p>Select a job from the list to see its extracted details.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function readableKey(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/^./, (letter) => letter.toUpperCase())
}

function CertificateListPage() {
  const [query, setQuery] = useState("")
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [selected, setSelected] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    listCertificates()
      .then((records) => {
        setCertificates(records)
        setSelected(records[0] ?? null)
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load certificates."))
      .finally(() => setLoading(false))
  }, [])

  const filtered = certificates.filter((certificate) =>
    `${certificate.certificate_name} ${JSON.stringify(certificate.result)}`.toLowerCase().includes(query.toLowerCase()),
  )
  const statusLabel = (status: Certificate["status"]): JobStatus => status === "completed" ? "Completed" : "Processing"

  return (
    <div className="page jobs-page">
      <div className="jobs-layout">
        <aside className="jobs-sidebar">
          <div className="sidebar-heading"><h1>Certificates</h1><button onClick={() => setQuery("")} aria-label="Reset search"><Icon name="refresh" size={16} /></button></div>
          <SearchField value={query} onChange={setQuery} placeholder="Search certificates..." />
          <div className="status-legend"><span>{loading ? "Loading..." : `${filtered.length} certificates`}</span></div>
          <div className="job-items">
            {filtered.map((certificate) => (
              <button key={certificate.id} className={selected?.id === certificate.id ? "job-item selected" : "job-item"} onClick={() => setSelected(certificate)}>
                <span><StatusPill status={statusLabel(certificate.status)} /><b>{certificate.certificate_name}</b><small>{String(certificate.result.certificateType ?? certificate.result.certificate_type ?? "Certificate")}</small></span>
                <Icon name="chevron" size={16} />
              </button>
            ))}
            {!loading && !filtered.length && <div className="empty-list">No certificates found.</div>}
            {error && <div className="empty-list">{error}</div>}
          </div>
        </aside>
        <section className="job-detail">
          {selected ? (
            <>
              <header><div><h2>{selected.certificate_name}</h2><p>Saved {new Date(selected.created_at).toLocaleString()}</p></div><StatusPill status={statusLabel(selected.status)} /></header>
              <div className="detail-body"><h3>Extracted certificate data</h3><div className="detail-card"><CertificatePreview /><div className="detail-fields">
                {Object.entries(selected.result).map(([key, value]) => <label key={key}>{readableKey(key)}<input value={typeof value === "string" ? value : JSON.stringify(value)} readOnly /></label>)}
              </div></div></div>
            </>
          ) : <div className="detail-empty"><span className="empty-icon"><Icon name="file" size={30} /></span><h2>Choose a certificate</h2><p>Select a certificate to see its extracted JSON fields.</p></div>}
        </section>
      </div>
    </div>
  )
}

const stepNames = [
  ["Certificate Details", "Add a name and note"],
  ["Upload Certificate", "Choose a document"],
  ["Review Certificate", "Review extracted information"],
  ["Save", "Confirm certificate"],
]

function Stepper({ step }: { step: number }) {
  return (
    <div className="stepper">
      {stepNames.map(([title, subtitle], index) => {
        const number = index + 1
        const complete = number < step || step === 4
        return (
          <div
            className={`step ${number === step ? "current" : ""} ${
              complete ? "complete" : ""
            }`}
            key={title}
          >
            <span className="step-dot">
              {complete ? (
                <Icon name="check" size={17} />
              ) : (
                String(number).padStart(2, "0")
              )}
            </span>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </div>
        )
      })}
    </div>
  )
}

function JobProcessingPage() {
  const [step, setStep] = useState(1)
  const [jobInfo, setJobInfo] = useState({
    type: "",
    name: "",
    note: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [data, setData] = useState<Record<string, unknown>>({})

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    },
    [imageUrl],
  )

  const pickFile = (incoming?: File) => {
    if (!incoming) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setFile(incoming)
    setImageUrl(
      incoming.type.startsWith("image/") ? URL.createObjectURL(incoming) : "",
    )
  }
  const beginExtraction = async () => {
    if (!file) return
    setExtracting(true)
    setSaveError("")
    try {
      setData(await extractCertificate(file, jobInfo.type === "IELTS"))
      setStep(3)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "OCR could not process this certificate.",
      )
    } finally {
      setExtracting(false)
    }
  }
  const next = async () => {
    if (step === 1) setStep(2)
    else if (step === 2) beginExtraction()
    else if (step === 3) {
      if (!file) return
      setSaving(true)
      setSaveError("")
      try {
        await saveCertificate(file, data, jobInfo.name)
        setStep(4)
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Unable to save the certificate.",
        )
      } finally {
        setSaving(false)
      }
    } else {
      setStep(1)
      setFile(null)
      setImageUrl("")
    }
  }
  const isNextDisabled =
    (step === 1 && (!jobInfo.type || !jobInfo.name)) ||
    (step === 2 && !file) ||
    extracting ||
    saving
  return (
    <div className="page processing-page">
      <div className="content processing-content">
        <div className="processing-heading">
          <div>
            <span>Certificate workflow</span>
            <h1>Add New Certificate</h1>
          </div>
          <span className="draft-badge">Draft auto-saved</span>
        </div>
        <Stepper step={step} />
        <section className="workflow-card">
          {step === 1 && (
            <div className="job-form">
              <label>
                Certificate type <em>*</em>
                <select
                  value={jobInfo.type}
                  onChange={(e) =>
                    setJobInfo({ ...jobInfo, type: e.target.value })
                  }
                >
                  <option value="" disabled>Select a certificate type</option>
                  <option>IELTS</option>
                  <option>TOEFL iBT</option>
                  <option>TOEIC</option>
                  <option>PTE Academic</option>
                  <option>Cambridge English</option>
                  <option>Aptis</option>
                  <option>Duolingo English Test</option>
                  <option>Other English Certificate</option>
                </select>
              </label>
              <label>
                Certificate name <em>*</em>
                <input
                  value={jobInfo.name}
                  onChange={(e) =>
                    setJobInfo({ ...jobInfo, name: e.target.value })
                  }
                />
              </label>
              <label className="full">
                Notes
                <textarea
                  placeholder="Add an optional note about this certificate..."
                  value={jobInfo.note}
                  onChange={(e) =>
                    setJobInfo({ ...jobInfo, note: e.target.value })
                  }
                />
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="upload-stage">
              {!file ? (
                <label
                  className={dragging ? "dropzone dragging" : "dropzone"}
                  onDragOver={(e: DragEvent) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e: DragEvent) => {
                    e.preventDefault()
                    setDragging(false)
                    pickFile(e.dataTransfer.files[0])
                  }}
                >
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      pickFile(e.target.files?.[0])
                    }
                  />
                  <span className="upload-icon">
                    <Icon name="upload" size={34} />
                  </span>
                  <h2>Upload an English certificate</h2>
                  <p>Drag and drop a PDF or image here, or click to browse.</p>
                  <small>PDF, PNG, JPG or WEBP · Maximum 15 MB</small>
                </label>
              ) : (
                <div className="file-ready">
                  <CertificatePreview compact imageUrl={imageUrl} />
                  <div>
                    <span className="ready-check">
                      <Icon name="check" />
                    </span>
                    <h2>{file.name}</h2>
                    <p>
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Ready for OCR
                      extraction
                    </p>
                    <button
                      className="text-button"
                      onClick={() => {
                        setFile(null)
                        setImageUrl("")
                      }}
                    >
                      Choose another file
                    </button>
                  </div>
                </div>
              )}
              {extracting && (
                <div className="extracting">
                  <span>
                    <Icon name="spark" />
                    OCR is reading your certificate...
                  </span>
                  <i>
                    <b />
                  </i>
                </div>
              )}
              {saveError && <p className="save-error">{saveError}</p>}
            </div>
          )}
          {step === 3 && (
            <div className="review-stage">
              <CertificatePreview imageUrl={imageUrl} />
              <div className="review-form">
                <div className="form-intro">
                  <span className="ai-label">
                    <Icon name="spark" size={14} /> OCR complete
                  </span>
                  <h2>Review extracted information</h2>
                  <p>Check and edit any field before confirming.</p>
                </div>
                {jobInfo.type === "IELTS" ? (
                  <IeltsReviewGrid
                    data={data}
                    onChange={(key, value) => setData({ ...data, [key]: value })}
                  />
                ) : (
                  Object.entries(data).map(([key, value]) => (
                    <label key={key}>
                      {readableKey(key)}
                      <input
                        value={typeof value === "string" ? value : JSON.stringify(value)}
                        onChange={(event) => setData({ ...data, [key]: event.target.value })}
                      />
                    </label>
                  ))
                )}
              </div>
              {saveError && <p className="save-error">{saveError}</p>}
            </div>
          )}
          {step === 4 && (
            <div className="success-stage">
              <span className="success-check">
                <Icon name="check" size={26} />
              </span>
              <span>Processing complete</span>
              <h2>Certificate verified and saved</h2>
              <p>
                The extracted information for{" "}
                <strong>
                  {String(data.fullName ?? data.holder_name ?? jobInfo.name)}
                </strong>{" "}
                has been confirmed and added to the certificate registry.
              </p>
              <div className="confirmation-meta">
                <span>
                  <small>Certificate name</small>
                  <b>{jobInfo.name}</b>
                </span>
                <span>
                  <small>Certificate</small>
                  <b>
                    {String(
                      data.certificateType ??
                        data.certificate_type ??
                        jobInfo.type,
                    )}
                  </b>
                </span>
                <span>
                  <small>Score</small>
                  <b>{String(data.overall_band ?? data.overallScore ?? data.score ?? "—")}</b>
                </span>
              </div>
            </div>
          )}
        </section>
        <div className="workflow-actions">
          <button
            className="button secondary"
            disabled={step === 1 || extracting}
            onClick={() => setStep(Math.max(1, step - 1))}
          >
            Previous
          </button>
          <span>Step {step} of 4</span>
          <button
            className="button primary"
            disabled={isNextDisabled}
            onClick={next}
          >
            {extracting
              ? "Extracting..."
              : saving
                ? "Saving..."
                : step === 4
                  ? "Add another certificate"
                  : step === 3
                    ? "Confirm & Save"
                    : "Continue"}
          </button>
        </div>
      </div>
    </div>
  )
}

type Message = { from: "ai" | "user" text: string }
function AssistantPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "ai",
      text: "Hello, I’m Nova. I can help you understand certificate data and resolve processing errors.",
    },
  ])
  const [input, setInput] = useState("")
  const send = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    const question = input.trim()
    setMessages((old) => [
      ...old,
      { from: "user", text: question },
      {
        from: "ai",
        text: question.toLowerCase().includes("error")
          ? "There are flagged certificates with low-confidence IDs. Open Certificates to review their source documents."
          : "I found certificates currently being processed. Open Certificates to review their status and extracted details.",
      },
    ])
    setInput("")
  }
  return (
    <div className="page assistant-page">
      <div className="assistant-layout">
        <aside className="assistant-sidebar">
          <span className="nova-mark">
            <Icon name="spark" size={26} />
          </span>
          <h1>AI Assistant</h1>
          <p>Ask questions about your certificates and extracted data.</p>
          <h3>Try asking</h3>
          {[
            "Summarize certificate processing errors",
            "Which certificates are still processing?",
            "Show IELTS certificates above 7.0",
          ].map((prompt) => (
            <button key={prompt} onClick={() => setInput(prompt)}>
              {prompt}
            </button>
          ))}
          <div className="assistant-tip">
            <Icon name="file" />
            <span>
              <b>Need to scan a certificate?</b>
              <button onClick={() => onNavigate("processing")}>
                Add a certificate
              </button>
            </span>
          </div>
        </aside>
        <section className="chat-panel">
          <header>
            <div>
              <span className="online-dot" />
              <div>
                <h2>Nova</h2>
                <p>Certificate intelligence assistant</p>
              </div>
            </div>
            <span className="ai-label">
              <Icon name="spark" size={13} />
              AI powered
            </span>
          </header>
          <div className="messages">
            {messages.map((message, index) => (
              <div className={`message ${message.from}`} key={index}>
                {message.from === "ai" && (
                  <span>
                    <Icon name="spark" size={16} />
                  </span>
                )}
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          <form className="chat-input" onSubmit={send}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Nova about certificates..."
            />
            <button aria-label="Send message">
              <Icon name="send" size={18} />
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

function AuthGate({
  onAuthenticated,
}: {
  onAuthenticated: (session: Session) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage("")
    const response =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          })
    setSubmitting(false)
    if (response.error) return setMessage(response.error.message)
    if (response.data.session) onAuthenticated(response.data.session)
    else setMessage("Check your email to confirm your account, then sign in.")
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="brand-mark">ϟ</span>
        <h1>Welcome to SCANOVA</h1>
        <p>Sign in to keep your certificates private.</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {message && <p className="auth-message">{message}</p>}
        <button className="button primary" disabled={submitting}>
          {submitting
            ? "Please wait..."
            : mode === "signIn"
              ? "Sign in"
              : "Create account"}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMode(mode === "signIn" ? "signUp" : "signIn")
            setMessage("")
          }}
        >
          {mode === "signIn"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  )
}

function getPageFromHash(): Page {
  const page = window.location.hash.replace("#/", "") as Page
  return navItems.some((item) => item.key === page) ? page : "home"
}

export default function App() {
  const [page, setPage] = useState<Page>(getPageFromHash)
  useEffect(() => {
    const update = () => setPage(getPageFromHash())
    window.addEventListener("hashchange", update)
    return () => window.removeEventListener("hashchange", update)
  }, [])
  useEffect(() => {
    seedDemoCertificates().catch((error) => {
      console.error("Unable to seed demo certificates", error)
    })
  }, [])
  const navigate = (next: Page) => {
    window.location.hash = `/${next}`
    setPage(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const content = useMemo(() => {
    if (page === "jobs") return <CertificateListPage />
    if (page === "processing") return <JobProcessingPage />
    if (page === "assistant") return <AssistantPage onNavigate={navigate} />
    return <HomePage onNavigate={navigate} />
  }, [page])
  return (
    <AppShell page={page} onNavigate={navigate}>
      {content}
    </AppShell>
  )
}
