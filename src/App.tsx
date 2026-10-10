import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  History,
  Package,
  Pill,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';

type Profile = {
  id: string;
  name: string;
  relationship: 'self' | 'partner' | 'parent' | 'child' | 'other';
};

type Medicine = {
  id: string;
  profileId: string;
  name: string;
  strength: string;
  instructions: string;
  time: string;
  amount: number;
  stock: number;
  threshold: number;
  archived: boolean;
};

type DoseLog = {
  id: string;
  medicineId: string;
  profileId: string;
  status: 'taken' | 'skipped';
  when: string;
};

type StockLog = {
  id: string;
  medicineId: string;
  profileId: string;
  delta: number;
  before: number;
  after: number;
  reason: string;
  when: string;
};

type MedicineForm = {
  name: string;
  strength: string;
  instructions: string;
  time: string;
  amount: number;
  stock: number;
  threshold: number;
};

const STORAGE_KEYS = {
  profiles: 'dosetrack.profiles',
  medicines: 'dosetrack.medicines',
  doseLogs: 'dosetrack.doseLogs',
  stockLogs: 'dosetrack.stockLogs',
  selectedProfile: 'dosetrack.selectedProfile',
};

const initialProfiles: Profile[] = [
  { id: 'profile-1', name: 'Alex', relationship: 'self' },
  { id: 'profile-2', name: 'Mum', relationship: 'parent' },
];

const initialMedicines: Medicine[] = [
  {
    id: 'med-1',
    profileId: 'profile-1',
    name: 'Levothyroxine',
    strength: '100 mcg',
    instructions: 'Take with water on an empty stomach',
    time: '08:00',
    amount: 1,
    stock: 14,
    threshold: 7,
    archived: false,
  },
  {
    id: 'med-2',
    profileId: 'profile-1',
    name: 'Vitamin D',
    strength: '1000 IU',
    instructions: 'Take after lunch',
    time: '13:00',
    amount: 1,
    stock: 22,
    threshold: 10,
    archived: false,
  },
  {
    id: 'med-3',
    profileId: 'profile-2',
    name: 'Omeprazole',
    strength: '20 mg',
    instructions: 'Before dinner',
    time: '18:00',
    amount: 1,
    stock: 8,
    threshold: 5,
    archived: false,
  },
];

const todayLabel = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date());

const emptyForm: MedicineForm = {
  name: '',
  strength: '',
  instructions: '',
  time: '08:00',
  amount: 1,
  stock: 0,
  threshold: 7,
};

const readSaved = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeSaved = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep app usable.
  }
};

const uniqueId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatTime = (value: string) => {
  const [hourString, minuteString] = value.split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const sortByTime = (a: Medicine, b: Medicine) => a.time.localeCompare(b.time);

function App() {
  const [profiles, setProfiles] = useState<Profile[]>(() => readSaved(STORAGE_KEYS.profiles, initialProfiles));
  const [medicines, setMedicines] = useState<Medicine[]>(() => readSaved(STORAGE_KEYS.medicines, initialMedicines));
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>(() => readSaved(STORAGE_KEYS.doseLogs, []));
  const [stockLogs, setStockLogs] = useState<StockLog[]>(() => readSaved(STORAGE_KEYS.stockLogs, []));
  const [selectedProfileId, setSelectedProfileId] = useState<string>(() =>
    readSaved<string | null>(STORAGE_KEYS.selectedProfile, initialProfiles[0].id),
  );

  useEffect(() => {
    writeSaved(STORAGE_KEYS.profiles, profiles);
  }, [profiles]);

  useEffect(() => {
    writeSaved(STORAGE_KEYS.medicines, medicines);
  }, [medicines]);

  useEffect(() => {
    writeSaved(STORAGE_KEYS.doseLogs, doseLogs);
  }, [doseLogs]);

  useEffect(() => {
    writeSaved(STORAGE_KEYS.stockLogs, stockLogs);
  }, [stockLogs]);

  useEffect(() => {
    if (selectedProfileId) {
      writeSaved(STORAGE_KEYS.selectedProfile, selectedProfileId);
    }
  }, [selectedProfileId]);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0] ?? initialProfiles[0];

  const profileMedicines = useMemo(
    () => medicines.filter((medicine) => medicine.profileId === selectedProfile.id && !medicine.archived),
    [medicines, selectedProfile.id],
  );

  const archivedMedicines = useMemo(
    () => medicines.filter((medicine) => medicine.profileId === selectedProfile.id && medicine.archived),
    [medicines, selectedProfile.id],
  );

  const sortedMedicines = [...profileMedicines].sort(sortByTime);

  const todayDoseLogs = doseLogs.filter((entry) => {
    const key = new Date(entry.when).toDateString();
    return entry.profileId === selectedProfile.id && key === new Date().toDateString();
  });

  const nextMedicine = useMemo(() => {
    const dueToday = sortedMedicines.find((medicine) => {
      const logged = todayDoseLogs.some((log) => log.medicineId === medicine.id);
      return !logged;
    });
    return dueToday ?? sortedMedicines[0] ?? null;
  }, [sortedMedicines, todayDoseLogs]);

  const lowStockMedicines = useMemo(
    () =>
      sortedMedicines.filter((medicine) => medicine.stock <= medicine.threshold && medicine.stock > 0),
    [sortedMedicines],
  );

  const addProfile = (name: string, relationship: Profile['relationship']) => {
    const clean = name.trim();
    if (!clean) return;
    const profile: Profile = {
      id: uniqueId(),
      name: clean,
      relationship,
    };
    setProfiles((prev) => [...prev, profile]);
    setSelectedProfileId(profile.id);
  };

  const addMedicine = (draft: MedicineForm) => {
    const medicine: Medicine = {
      id: uniqueId(),
      profileId: selectedProfile.id,
      name: draft.name.trim(),
      strength: draft.strength.trim(),
      instructions: draft.instructions.trim(),
      time: draft.time,
      amount: Number(draft.amount) || 1,
      stock: Number(draft.stock) || 0,
      threshold: Number(draft.threshold) || 7,
      archived: false,
    };

    setMedicines((prev) => [medicine, ...prev]);
    if (medicine.stock > 0) {
      setStockLogs((prev) => [
        {
          id: uniqueId(),
          medicineId: medicine.id,
          profileId: selectedProfile.id,
          delta: medicine.stock,
          before: 0,
          after: medicine.stock,
          reason: 'Open stock recorded',
          when: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const markDose = (medicine: Medicine, status: 'taken' | 'skipped') => {
    const sameDayLog = doseLogs.find(
      (entry) =>
        entry.medicineId === medicine.id &&
        entry.profileId === selectedProfile.id &&
        new Date(entry.when).toDateString() === new Date().toDateString(),
    );

    if (sameDayLog) {
      return;
    }

    const now = new Date().toISOString();
    setDoseLogs((prev) => [
      {
        id: uniqueId(),
        medicineId: medicine.id,
        profileId: selectedProfile.id,
        status,
        when: now,
      },
      ...prev,
    ]);

    if (status === 'taken') {
      const before = medicine.stock;
      const after = Math.max(0, before - medicine.amount);
      if (after !== before) {
        setMedicines((prev) =>
          prev.map((item) => (item.id === medicine.id ? { ...item, stock: after } : item)),
        );
        setStockLogs((prev) => [
          {
            id: uniqueId(),
            medicineId: medicine.id,
            profileId: selectedProfile.id,
            delta: -(before - after),
            before,
            after,
            reason: 'Dose recorded as taken',
            when: now,
          },
          ...prev,
        ]);
      }
    }
  };

  const recordRefill = (medicine: Medicine, amount: number, reason: string) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const before = medicine.stock;
    const after = before + amount;
    setMedicines((prev) => prev.map((item) => (item.id === medicine.id ? { ...item, stock: after } : item)));
    setStockLogs((prev) => [
      {
        id: uniqueId(),
        medicineId: medicine.id,
        profileId: selectedProfile.id,
        delta: amount,
        before,
        after,
        reason: reason.trim() || 'Refill recorded',
        when: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const correctStock = (medicine: Medicine, nextValue: number, reason: string) => {
    if (!Number.isFinite(nextValue) || nextValue < 0) return;
    const before = medicine.stock;
    setMedicines((prev) => prev.map((item) => (item.id === medicine.id ? { ...item, stock: nextValue } : item)));
    setStockLogs((prev) => [
      {
        id: uniqueId(),
        medicineId: medicine.id,
        profileId: selectedProfile.id,
        delta: nextValue - before,
        before,
        after: nextValue,
        reason: reason.trim() || 'Stock count corrected',
        when: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const archiveMedicine = (medicineId: string) => {
    setMedicines((prev) => prev.map((item) => (item.id === medicineId ? { ...item, archived: !item.archived } : item)));
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/app/*"
        element={
          <AppLayout
            profiles={profiles}
            selectedProfile={selectedProfile}
            selectedProfileId={selectedProfileId}
            setSelectedProfileId={setSelectedProfileId}
            addProfile={addProfile}
            medicines={sortedMedicines}
            archivedMedicines={archivedMedicines}
            nextMedicine={nextMedicine}
            lowStockMedicines={lowStockMedicines}
            doseLogs={doseLogs.filter((entry) => entry.profileId === selectedProfile.id)}
            stockLogs={stockLogs.filter((entry) => entry.profileId === selectedProfile.id)}
            addMedicine={addMedicine}
            markDose={markDose}
            recordRefill={recordRefill}
            correctStock={correctStock}
            archiveMedicine={archiveMedicine}
          />
        }
      />
    </Routes>
  );
}

function LandingPage() {
  return (
    <div className="landing-page">
      <header className="topbar landing-header">
        <div className="brand-wrap">
          <div className="brand-mark">
            <img src="/logo.svg" alt="DoseTrack logo" />
          </div>
          <span className="brand-word">DoseTrack</span>
        </div>
        <nav className="landing-nav" aria-label="Main site navigation">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          <Link to="/app" className="primary-button small">Get started</Link>
        </nav>
      </header>

      <main>
        <section className="hero section-shell">
          <div className="hero-copy">
            <p className="eyebrow">Medication tracking, kept calm</p>
            <h1>Your medicines, in order.</h1>
            <p className="lead">
              A simpler way to keep track of daily doses, the medicines you have left, and the people you care for.
            </p>
            <div className="hero-actions">
              <Link to="/app" className="primary-button">Get started</Link>
              <a href="#how-it-works" className="secondary-button">See how it works</a>
            </div>
          </div>

          <div className="hero-preview" aria-label="DoseTrack app preview">
            <div className="preview-window">
              <div className="preview-header">
                <span className="dot dot-plum" />
                <span className="dot dot-saffron" />
                <span className="dot dot-moss" />
              </div>
              <div className="preview-body">
                <div className="preview-topline">
                  <span>{todayLabel}</span>
                  <span className="pill-label">Today</span>
                </div>
                <div className="preview-card">
                  <p className="preview-kicker">Due now</p>
                  <h3>Levothyroxine · 100 mcg</h3>
                  <p>08:00 · Take with water on an empty stomach</p>
                  <div className="preview-actions">
                    <button type="button">Taken</button>
                    <button type="button" className="ghost">Skip</button>
                  </div>
                </div>
                <div className="mini-grid">
                  <div>
                    <strong>14</strong>
                    <span>stock left</span>
                  </div>
                  <div>
                    <strong>2</strong>
                    <span>people</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="section-shell benefits">
          <div className="feature-card">
            <CalendarDays size={28} />
            <h3>Daily dose tracking</h3>
            <p>See the next action, whether a dose is due, taken, or skipped.</p>
          </div>
          <div className="feature-card">
            <Package size={28} />
            <h3>Medicine supply</h3>
            <p>Keep an eye on stock, thresholds, and refills before the cupboard runs low.</p>
          </div>
          <div className="feature-card">
            <Users size={28} />
            <h3>Family profiles</h3>
            <p>Separate records for the account holder and the people they care for.</p>
          </div>
        </section>

        <section id="how-it-works" className="section-shell three-steps">
          <div className="section-heading">
            <p className="eyebrow">How it works</p>
            <h2>Simple steps, clear actions.</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <span>1</span>
              <h3>Add your medicines</h3>
              <p>Enter the name, dose, time, and stock you already know.</p>
            </div>
            <div className="step-card">
              <span>2</span>
              <h3>Record your doses</h3>
              <p>Log each medicine as taken or skipped without guessing what should happen next.</p>
            </div>
            <div className="step-card">
              <span>3</span>
              <h3>Stay ahead of refills</h3>
              <p>Review supply and stock alerts before you run out.</p>
            </div>
          </div>
        </section>

        <section id="privacy" className="section-shell privacy-block">
          <div className="section-heading">
            <p className="eyebrow">Privacy</p>
            <h2>Personal records stay in your control.</h2>
          </div>
          <p>
            DoseTrack keeps medicine records in the browser for local use and is designed to respect account separation for each person in the app. Reminders only work while the app is open unless [...]
          </p>
        </section>

        <section className="section-shell cta-shell">
          <div>
            <p className="eyebrow">Ready to start?</p>
            <h2>Keep your medicines in view.</h2>
          </div>
          <Link to="/app" className="primary-button">Get started</Link>
        </section>
      </main>
    </div>
  );
}

type AppLayoutProps = {
  profiles: Profile[];
  selectedProfile: Profile;
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
  addProfile: (name: string, relationship: Profile['relationship']) => void;
  medicines: Medicine[];
  archivedMedicines: Medicine[];
  nextMedicine: Medicine | null;
  lowStockMedicines: Medicine[];
  doseLogs: DoseLog[];
  stockLogs: StockLog[];
  addMedicine: (draft: MedicineForm) => void;
  markDose: (medicine: Medicine, status: 'taken' | 'skipped') => void;
  recordRefill: (medicine: Medicine, amount: number, reason: string) => void;
  correctStock: (medicine: Medicine, nextValue: number, reason: string) => void;
  archiveMedicine: (medicineId: string) => void;
};

function AppLayout(props: AppLayoutProps) {
  const [tab, setTab] = useState('today');
  const [draft, setDraft] = useState<MedicineForm>(emptyForm);
  const [profileName, setProfileName] = useState('');
  const [profileRelationship, setProfileRelationship] = useState<Profile['relationship']>('self');
  const [refillValue, setRefillValue] = useState('');
  const [refillReason, setRefillReason] = useState('');
  const [stockValue, setStockValue] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showMedicineForm, setShowMedicineForm] = useState(false);

  const navigate = useNavigate();

  const renderToday = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Today</p>
            <h1>{todayLabel}</h1>
          </div>
          <span className="person-chip">{props.selectedProfile.name}</span>
        </div>

        {props.nextMedicine ? (
          <div className="due-card">
            <div className="due-line">
              <span className="dot-soft">Due now</span>
              <span>{formatTime(props.nextMedicine.time)}</span>
            </div>
            <h2>{props.nextMedicine.name} · {props.nextMedicine.strength}</h2>
            <p>{props.nextMedicine.instructions}</p>
            <div className="action-row">
              <button type="button" className="primary-button" onClick={() => props.markDose(props.nextMedicine!, 'taken')}>
                <Check size={17} /> Mark taken
              </button>
              <button type="button" className="secondary-button" onClick={() => props.markDose(props.nextMedicine!, 'skipped')}>
                <X size={17} /> Skip
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-card">
            <p>No medicine is due today for this profile.</p>
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="section-heading compact">
          <h2>Stock needing attention</h2>
        </div>
        {props.lowStockMedicines.length > 0 ? (
          props.lowStockMedicines.map((medicine) => (
            <div key={medicine.id} className="stock-row compact-row">
              <div>
                <strong>{medicine.name}</strong>
                <p>{medicine.stock} left · threshold {medicine.threshold}</p>
              </div>
              <button type="button" className="text-button" onClick={() => setTab('stock')}>
                View stock <ChevronRight size={16} />
              </button>
            </div>
          ))
        ) : (
          <p className="muted">No stock alerts right now.</p>
        )}
      </section>
    </div>
  );

  const renderMedicines = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-heading row-space">
          <h2>Medicines</h2>
          <button type="button" className="primary-button small" onClick={() => setShowMedicineForm((prev) => !prev)}>
            <Plus size={15} /> Add medicine
          </button>
        </div>

        {showMedicineForm && (
          <form
            className="editor-card"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.name.trim()) return;
              props.addMedicine(draft);
              setDraft(emptyForm);
              setShowMedicineForm(false);
            }}
          >
            <div className="field-grid">
              <label>
                Name
                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </label>
              <label>
                Strength
                <input value={draft.strength} onChange={(event) => setDraft({ ...draft, strength: event.target.value })} />
              </label>
              <label>
                Time
                <input type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} />
              </label>
              <label>
                Amount per dose
                <input type="number" min="1" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} />
              </label>
              <label>
                Opening stock
                <input type="number" min="0" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: Number(event.target.value) })} />
              </label>
              <label>
                Threshold
                <input type="number" min="0" value={draft.threshold} onChange={(event) => setDraft({ ...draft, threshold: Number(event.target.value) })} />
              </label>
            </div>
            <label>
              Instructions
              <textarea value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} />
            </label>
            <div className="row-actions">
              <button type="submit" className="primary-button small"><Save size={15} /> Save</button>
              <button type="button" className="secondary-button small" onClick={() => setShowMedicineForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="stack-list">
          {props.medicines.map((medicine) => (
            <div key={medicine.id} className="list-item large">
              <div>
                <div className="list-name">{medicine.name}</div>
                <div className="list-meta">{medicine.strength} · {formatTime(medicine.time)} · {medicine.instructions}</div>
              </div>
              <div className="list-actions">
                <button type="button" className="secondary-button small" onClick={() => props.archiveMedicine(medicine.id)}>
                  {medicine.archived ? 'Restore' : 'Archive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {props.archivedMedicines.length > 0 && (
        <section className="panel-card">
          <h3>Archived</h3>
          {props.archivedMedicines.map((medicine) => (
            <div key={medicine.id} className="list-item">
              <span>{medicine.name}</span>
              <button type="button" className="text-button" onClick={() => props.archiveMedicine(medicine.id)}>Restore</button>
            </div>
          ))}
        </section>
      )}
    </div>
  );

  const renderStock = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-heading row-space">
          <h2>Stock & refills</h2>
        </div>
        <div className="stack-list">
          {props.medicines.map((medicine) => (
            <div key={medicine.id} className="list-item stock-item">
              <div>
                <div className="list-name">{medicine.name}</div>
                <div className="list-meta">{medicine.stock} left · {medicine.threshold} threshold</div>
              </div>

              <div className="inline-controls">
                <input
                  type="number"
                  aria-label={`Refill ${medicine.name}`}
                  value={refillValue}
                  onChange={(event) => setRefillValue(event.target.value)}
                  placeholder="Qty"
                />
                <input
                  type="text"
                  aria-label={`Refill reason ${medicine.name}`}
                  value={refillReason}
                  onChange={(event) => setRefillReason(event.target.value)}
                  placeholder="Reason"
                />
                <button type="button" className="primary-button small" onClick={() => {
                  props.recordRefill(medicine, Number(refillValue) || 0, refillReason);
                  setRefillValue('');
                  setRefillReason('');
                }}>
                  Refill
                </button>
              </div>

              <div className="inline-controls compact-controls">
                <input
                  type="number"
                  aria-label={`Correct stock ${medicine.name}`}
                  value={stockValue}
                  onChange={(event) => setStockValue(event.target.value)}
                  placeholder="Actual count"
                />
                <input
                  type="text"
                  aria-label={`Correct stock reason ${medicine.name}`}
                  value={stockReason}
                  onChange={(event) => setStockReason(event.target.value)}
                  placeholder="Reason"
                />
                <button type="button" className="secondary-button small" onClick={() => {
                  props.correctStock(medicine, Number(stockValue) || 0, stockReason);
                  setStockValue('');
                  setStockReason('');
                }}>
                  Correct
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderHistory = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-heading">
          <h2>History</h2>
        </div>

        <div className="timeline">
          {[...props.doseLogs, ...props.stockLogs]
            .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
            .slice(0, 20)
            .map((entry) => (
              <div key={entry.id} className="timeline-item">
                <div className="timeline-badge" />
                <div>
                  {'status' in entry ? (
                    <>
                      <strong>{entry.status === 'taken' ? 'Taken' : 'Skipped'}</strong>
                      <p>{props.medicines.find((medicine) => medicine.id === entry.medicineId)?.name ?? 'Medicine'} · {formatDate(entry.when)}</p>
                    </>
                  ) : (
                    <>
                      <strong>{entry.delta >= 0 ? 'Refill / update' : 'Stock change'}</strong>
                      <p>{entry.reason} · {entry.after} total</p>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );

  const renderPeople = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-heading row-space">
          <h2>People</h2>
          <button type="button" className="primary-button small" onClick={() => setShowProfileForm((prev) => !prev)}>
            <Plus size={15} /> Add person
          </button>
        </div>

        {showProfileForm && (
          <div className="editor-card">
            <label>
              Name
              <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
            </label>
            <label>
              Relationship
              <select value={profileRelationship} onChange={(event) => setProfileRelationship(event.target.value as Profile['relationship'])}>
                <option value="self">Self</option>
                <option value="partner">Partner</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="other">Other</option>
              </select>
            </label>
            <div className="row-actions">
              <button type="button" className="primary-button small" onClick={() => {
                props.addProfile(profileName, profileRelationship);
                setProfileName('');
                setProfileRelationship('self');
                setShowProfileForm(false);
              }}>
                Save
              </button>
              <button type="button" className="secondary-button small" onClick={() => setShowProfileForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="stack-list">
          {props.profiles.map((profile) => (
            <button type="button" key={profile.id} className={`profile-row ${props.selectedProfileId === profile.id ? 'active' : ''}`} onClick={() => props.setSelectedProfileId(profile.id)}>
              <div>
                <div className="list-name">{profile.name}</div>
                <div className="list-meta">{profile.relationship}</div>
              </div>
              {props.selectedProfileId === profile.id && <Check size={16} />}
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const renderSettings = () => (
    <div className="panel-stack">
      <section className="panel-card">
        <div className="section-heading">
          <h2>Settings</h2>
        </div>
        <div className="settings-list">
          <div className="settings-row">
            <span>Local-only mode</span>
            <strong>Enabled</strong>
          </div>
          <div className="settings-row">
            <span>Reminder status</span>
            <strong>App open only</strong>
          </div>
          <div className="settings-row">
            <span>Privacy</span>
            <strong>Profile-based local records</strong>
          </div>
        </div>
        <button type="button" className="secondary-button" onClick={() => navigate('/')}>
          Back to landing page
        </button>
      </section>
    </div>
  );

  const views: Record<string, JSX.Element> = {
    today: renderToday(),
    medicines: renderMedicines(),
    stock: renderStock(),
    history: renderHistory(),
    people: renderPeople(),
    settings: renderSettings(),
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark small">
            <img src="/logo.svg" alt="DoseTrack logo" />
          </div>
          <span className="brand-word">DoseTrack</span>
        </div>

        <div className="profile-switcher">
          <span>Profile</span>
          <select value={props.selectedProfileId} onChange={(event) => props.setSelectedProfileId(event.target.value)}>
            {props.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.name}</option>
            ))}
          </select>
        </div>

        <nav className="app-nav" aria-label="App navigation">
          {[
            { key: 'today', label: 'Today', icon: CalendarDays },
            { key: 'medicines', label: 'Medicines', icon: Pill },
            { key: 'stock', label: 'Stock & refills', icon: Package },
            { key: 'history', label: 'History', icon: History },
            { key: 'people', label: 'People', icon: Users },
            { key: 'settings', label: 'Settings', icon: Settings },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" className={`nav-button ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="workspace-header">
          <div className="title-block">
            <p className="eyebrow">{props.selectedProfile.name}</p>
            <h1>DoseTrack</h1>
          </div>
          <div className="header-actions">
            <button type="button" className="secondary-button small" onClick={() => setTab('today')}>
              <Bell size={15} /> Reminders
            </button>
            <Link to="/" className="secondary-button small">Landing page</Link>
          </div>
        </header>
        {views[tab]}
      </main>
    </div>
  );
}

export default App;
