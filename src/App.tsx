import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, Clock3, Pill, Settings, Users, Package, History, ListFilter, Plus, ChevronDown, Stethoscope, ShieldCheck, Check, X, TimerReset } from 'lucide-react'

type NavKey = 'today' | 'medicines' | 'stock' | 'history' | 'people' | 'settings'

type Medicine = {
  id: number
  name: string
  strength: string
  instructions: string
  time: string
  amount: number
  stock: number
  threshold: number
}

type DoseState = 'due' | 'taken' | 'skipped'

const storageKey = 'dosetrack.patientName'
const dataKey = 'dosetrack.data'

const defaultMedicines: Medicine[] = [
  {
    id: 1,
    name: 'Xinc',
    strength: '500 mg',
    instructions: '1 tablet · Take with breakfast',
    time: '8:00 PM',
    amount: 1,
    stock: 14,
    threshold: 7,
  },
  {
    id: 2,
    name: 'Vitamin D',
    strength: '1000 IU',
    instructions: '1 capsule · After lunch',
    time: '1:00 PM',
    amount: 1,
    stock: 21,
    threshold: 10,
  },
  {
    id: 3,
    name: 'Omeprazole',
    strength: '20 mg',
    instructions: '1 tablet · Before dinner',
    time: '6:30 PM',
    amount: 1,
    stock: 11,
    threshold: 6,
  },
]

function App() {
  const [patientName, setPatientName] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    return stored || ''
  })
  const [nav, setNav] = useState<NavKey>('today')
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const stored = localStorage.getItem(dataKey)
    if (!stored) return defaultMedicines
    try {
      return JSON.parse(stored) as Medicine[]
    } catch {
      return defaultMedicines
    }
  })
  const [doseState, setDoseState] = useState<DoseState>('due')

  useEffect(() => {
    localStorage.setItem(dataKey, JSON.stringify(medicines))
  }, [medicines])

  const currentDate = useMemo(() => {
    const date = new Date()
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }, [])

  const dueMedicine = medicines[0]

  const handleContinue = () => {
    const trimmed = patientName.trim()
    if (!trimmed) return
    localStorage.setItem(storageKey, trimmed)
    setPatientName(trimmed)
  }

  const handleMarkTaken = () => {
    setDoseState('taken')
    setMedicines((prev) =>
      prev.map((medicine, index) =>
        index === 0 ? { ...medicine, stock: Math.max(0, medicine.stock - medicine.amount) } : medicine,
      ),
    )
  }

  const handleSkip = () => {
    setDoseState('skipped')
  }

  const handleSnooze = () => {
    setDoseState('due')
  }

  const addMedicine = () => {
    const newEntry: Medicine = {
      id: Date.now(),
      name: 'New medicine',
      strength: '250 mg',
      instructions: '1 tablet · With water',
      time: '9:00 AM',
      amount: 1,
      stock: 18,
      threshold: 9,
    }
    setMedicines((prev) => [newEntry, ...prev])
  }

  const navItems: { key: NavKey; label: string; icon: any }[] = [
    { key: 'today', label: 'Today', icon: CalendarDays },
    { key: 'medicines', label: 'Medicines', icon: Pill },
    { key: 'stock', label: 'Stock', icon: Package },
    { key: 'history', label: 'History', icon: History },
    { key: 'people', label: 'People', icon: Users },
    { key: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <>
      {!patientName && (
        <div className="welcome-shell">
          <div className="welcome-card">
            <div className="brand-row">
              <div className="brand-mark">
                <img src="/logo.svg" alt="DoseTrack logo" />
              </div>
              <div className="brand-word">DoseTrack</div>
            </div>
            <h1>Welcome</h1>
            <label htmlFor="patient-name" className="input-label">Who are we tracking for?</label>
            <input
              id="patient-name"
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient or caregiver name"
              autoFocus
            />
            <button className="primary-btn" onClick={handleContinue} disabled={!patientName.trim()}>
              Continue
            </button>
          </div>
        </div>
      )}

      {patientName && (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand-header">
              <div className="brand-mark small">
                <img src="/logo.svg" alt="DoseTrack logo" />
              </div>
              <div className="brand-word">DoseTrack</div>
            </div>

            <div className="profile-select">
              <span>{patientName}</span>
              <ChevronDown size={18} />
            </div>

            <nav className="nav-list" aria-label="Main navigation">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`nav-item ${nav === key ? 'active' : ''}`}
                  onClick={() => setNav(key)}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="main-panel">
            <header className="topbar">
              <div className="date-label">{currentDate.toUpperCase()}</div>
              <div className="action-button-wrap">
                <button className="secondary-btn" onClick={addMedicine}>
                  <Plus size={18} />
                  Add medicine
                </button>
              </div>
            </header>

            <section className="page-header">
              <h1>Today</h1>
              <p>Medicines for {patientName}</p>
            </section>

            {nav === 'today' && (
              <>
                <section className="due-card">
                  <div className="due-label">DUE NOW</div>
                  <div className="due-time">{dueMedicine.time}</div>
                  <div className="medicine-name">{dueMedicine.name} · {dueMedicine.strength}</div>
                  <div className="medicine-meta">{dueMedicine.instructions}</div>

                  <div className="actions-row">
                    <button className="take-btn" onClick={handleMarkTaken}>
                      {doseState === 'taken' ? <Check size={16} /> : null}
                      Mark taken
                    </button>
                    <button className="skip-btn" onClick={handleSkip}>Skip dose</button>
                    <button className="snooze-btn" onClick={handleSnooze}>Snooze 15 min</button>
                  </div>
                </section>

                <section className="stock-panel">
                  <h2>Stock needing attention</h2>
                  <div className="stock-alert">
                    <div className="stock-stripe" />
                    <div className="stock-body">
                      <div className="stock-line">
                        <strong>{dueMedicine.name}</strong>
                        <span> · {dueMedicine.stock} tablets recorded · About {dueMedicine.threshold} days</span>
                      </div>
                      <button className="link-btn">
                        <Bell size={16} />
                        Plan refill
                      </button>
                    </div>
                  </div>

                  <div className="stock-actions">
                    <button className="primary-btn small">Record refill</button>
                    <button className="secondary-btn small">View stock</button>
                    <button className="secondary-btn small">Remind me tomorrow</button>
                  </div>
                </section>
              </>
            )}

            {nav === 'medicines' && (
              <section className="list-card">
                <h2>Medicines</h2>
                <div className="medicine-list">
                  {medicines.map((medicine) => (
                    <div key={medicine.id} className="medicine-row">
                      <div>
                        <div className="row-name">{medicine.name}</div>
                        <div className="row-meta">{medicine.strength} · {medicine.instructions}</div>
                      </div>
                      <div className="row-pill">{medicine.time}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {nav === 'stock' && (
              <section className="list-card">
                <h2>Stock</h2>
                <div className="stock-list">
                  {medicines.map((medicine) => (
                    <div key={medicine.id} className="stock-row">
                      <span>{medicine.name}</span>
                      <strong>{medicine.stock} left</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {nav === 'history' && (
              <section className="list-card">
                <h2>History</h2>
                <div className="history-row">
                  <span>Today</span>
                  <span>{doseState === 'taken' ? 'Dose marked taken' : doseState === 'skipped' ? 'Dose skipped' : 'Due'}</span>
                </div>
              </section>
            )}

            {nav === 'people' && (
              <section className="list-card">
                <h2>People</h2>
                <div className="profile-card">{patientName}</div>
              </section>
            )}

            {nav === 'settings' && (
              <section className="list-card">
                <h2>Settings</h2>
                <div className="settings-row">
                  <span>Notification status</span>
                  <strong>Available</strong>
                </div>
                <div className="settings-row">
                  <span>Privacy</span>
                  <strong>Local device</strong>
                </div>
              </section>
            )}
          </main>
        </div>
      )}
    </>
  )
}

export default App
