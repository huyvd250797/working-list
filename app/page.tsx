"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Status = "todo" | "doing" | "done";
type Priority = "low" | "normal" | "high";
type Filter = "all" | Status | "today" | "overdue" | "high";

type Task = {
  id: string;
  title: string;
  note: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type TaskDraft = Pick<Task, "title" | "note" | "priority" | "dueDate"> & { tags: string };

const STORAGE_KEY = "working-list.tasks.v1";
const THEME_KEY = "working-list.theme";

const STATUS_LABEL: Record<Status, string> = { todo: "Cần làm", doing: "Đang làm", done: "Đã xong" };
const PRIORITY_LABEL: Record<Priority, string> = { low: "Thấp", normal: "Bình thường", high: "Cao" };
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "today", label: "Hôm nay" },
  { value: "overdue", label: "Quá hạn" },
  { value: "todo", label: "Cần làm" },
  { value: "doing", label: "Đang làm" },
  { value: "done", label: "Đã xong" },
  { value: "high", label: "Ưu tiên cao" },
];
const EMPTY_DRAFT: TaskDraft = { title: "", note: "", priority: "normal", dueDate: "", tags: "" };

function Icon({ name, size = 19 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 21h14"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.3 2.2c-1.1.8-1.8 1.3-1.8 2.8M12 18h.01"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    tag: <><path d="M20 13 13 20 4 11V4h7Z"/><circle cx="8.5" cy="8.5" r="1.2"/></>,
    x: <path d="m6 6 12 12M18 6 6 18"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    inbox: <><path d="M4 4h16v16H4Z"/><path d="M4 14h4l2 3h4l2-3h4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  if (!value) return "";
  if (value === localDate()) return "Hôm nay";
  if (value === localDate(1)) return "Ngày mai";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function parseQuickTask(raw: string): Omit<Task, "id" | "createdAt" | "updatedAt"> {
  const tags = Array.from(raw.matchAll(/#([\p{L}\p{N}_-]+)/gu)).map((match) => match[1]);
  const priorityMatch = raw.match(/!(cao|thap|thấp|tb|trungbinh|trung-binh)/i);
  const priority: Priority = priorityMatch ? (/cao/i.test(priorityMatch[1]) ? "high" : /thap|thấp/i.test(priorityMatch[1]) ? "low" : "normal") : "normal";
  const dueDate = /@homnay|@hômnay/i.test(raw) ? localDate() : /@ngaymai|@ngàymai/i.test(raw) ? localDate(1) : "";
  const cleaned = raw.replace(/#[\p{L}\p{N}_-]+/gu, "").replace(/@(homnay|hômnay|ngaymai|ngàymai)/gi, "").replace(/!(cao|thap|thấp|tb|trungbinh|trung-binh)/gi, "").replace(/\s{2,}/g, " ").trim();
  return { title: cleaned || raw.trim(), note: "", status: "todo", priority, dueDate, tags: Array.from(new Set(tags)) };
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [quickText, setQuickText] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  /* localStorage is intentionally loaded after hydration to keep server HTML stable. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTasks(JSON.parse(saved));
      const savedTheme = localStorage.getItem(THEME_KEY);
      const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(savedTheme === "dark" || (!savedTheme && preferredDark) ? "dark" : "light");
    } catch { setToast("Không thể đọc dữ liệu đã lưu."); }
    finally { setHydrated(true); }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }, [tasks, hydrated]);
  useEffect(() => {
    if (!modalOpen && !helpOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [modalOpen, helpOpen]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (modalOpen || helpOpen) { if (event.key === "Escape") { setModalOpen(false); setHelpOpen(false); } return; }
      const target = event.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (!typing && event.key.toLowerCase() === "n") { event.preventDefault(); quickInputRef.current?.focus(); }
      if (!typing && event.key === "/") { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === "Escape") { setQuery(""); setMenuOpen(false); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [modalOpen, helpOpen]);

  const counts = useMemo(() => ({ all: tasks.length, todo: tasks.filter((task) => task.status === "todo").length, doing: tasks.filter((task) => task.status === "doing").length, done: tasks.filter((task) => task.status === "done").length }), [tasks]);
  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    const today = localDate();
    const priorityRank: Record<Priority, number> = { high: 0, normal: 1, low: 2 };
    const statusRank: Record<Status, number> = { doing: 0, todo: 1, done: 2 };
    return tasks.filter((task) => {
      const haystack = `${task.title} ${task.note} ${task.tags.join(" ")}`.toLocaleLowerCase("vi");
      if (normalized && !haystack.includes(normalized)) return false;
      if (filter === "all") return true;
      if (filter === "today") return task.dueDate === today && task.status !== "done";
      if (filter === "overdue") return !!task.dueDate && task.dueDate < today && task.status !== "done";
      if (filter === "high") return task.priority === "high" && task.status !== "done";
      return task.status === filter;
    }).sort((a, b) => {
      const status = statusRank[a.status] - statusRank[b.status];
      if (status) return status;
      const overdueA = !!a.dueDate && a.dueDate < today ? 0 : 1;
      const overdueB = !!b.dueDate && b.dueDate < today ? 0 : 1;
      if (overdueA !== overdueB) return overdueA - overdueB;
      const priority = priorityRank[a.priority] - priorityRank[b.priority];
      if (priority) return priority;
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [tasks, query, filter]);

  function showToast(message: string) { setToast(message); window.setTimeout(() => setToast((current) => current === message ? "" : current), 3200); }
  function addQuickTask(event: FormEvent) {
    event.preventDefault();
    if (!quickText.trim()) { quickInputRef.current?.focus(); return; }
    const now = new Date().toISOString();
    setTasks((current) => [{ ...parseQuickTask(quickText), id: createId(), createdAt: now, updatedAt: now }, ...current]);
    setQuickText(""); showToast("Đã thêm công việc mới"); quickInputRef.current?.focus();
  }
  function updateStatus(id: string, status: Status) { setTasks((current) => current.map((task) => task.id === id ? { ...task, status, updatedAt: new Date().toISOString() } : task)); }
  function cycleStatus(task: Task) { const next: Record<Status, Status> = { todo: "doing", doing: "done", done: "todo" }; updateStatus(task.id, next[task.status]); }
  function openCreate() { setEditing(null); setDraft({ ...EMPTY_DRAFT, title: quickText.trim() }); setModalOpen(true); setMenuOpen(false); }
  function openEdit(task: Task) { setEditing(task); setDraft({ title: task.title, note: task.note, priority: task.priority, dueDate: task.dueDate, tags: task.tags.join(", ") }); setModalOpen(true); }
  function saveTask(event: FormEvent) {
    event.preventDefault(); if (!draft.title.trim()) return;
    const now = new Date().toISOString();
    const values = { title: draft.title.trim(), note: draft.note.trim(), priority: draft.priority, dueDate: draft.dueDate, tags: Array.from(new Set(draft.tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))), updatedAt: now };
    if (editing) { setTasks((current) => current.map((task) => task.id === editing.id ? { ...task, ...values } : task)); showToast("Đã cập nhật công việc"); }
    else { setTasks((current) => [{ ...values, id: createId(), status: "todo", createdAt: now }, ...current]); setQuickText(""); showToast("Đã thêm công việc mới"); }
    setModalOpen(false);
  }
  function removeTask(task: Task) { setDeletedTask(task); setTasks((current) => current.filter((item) => item.id !== task.id)); showToast("Đã xóa công việc"); }
  function undoDelete() { if (!deletedTask) return; setTasks((current) => [deletedTask, ...current]); setDeletedTask(null); setToast("Đã khôi phục công việc"); }
  function exportData() {
    const blob = new Blob([JSON.stringify({ app: "Working-List", version: 1, exportedAt: new Date().toISOString(), tasks }, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `working-list-backup-${localDate()}.json`; link.click(); URL.revokeObjectURL(link.href);
    setMenuOpen(false); showToast("Đã xuất file sao lưu");
  }
  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)); const incoming = Array.isArray(parsed) ? parsed : parsed.tasks; if (!Array.isArray(incoming)) throw new Error("invalid"); setTasks(incoming); showToast(`Đã nhập ${incoming.length} công việc`); } catch { showToast("File sao lưu không hợp lệ"); } event.target.value = ""; };
    reader.readAsText(file); setMenuOpen(false);
  }
  function clearCompleted() {
    if (!counts.done) { showToast("Chưa có công việc đã hoàn thành"); return; }
    if (window.confirm(`Xóa ${counts.done} công việc đã hoàn thành?`)) { setTasks((current) => current.filter((task) => task.status !== "done")); showToast("Đã dọn danh sách hoàn thành"); }
    setMenuOpen(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-wrap"><div className="brand-mark"><span>W</span></div><div><div className="brand-name">Working-List</div><div className="brand-subtitle">Ghi nhanh · Xử lý gọn</div></div></div>
        <div className="header-actions">
          <button className="icon-button" type="button" onClick={() => setHelpOpen(true)} aria-label="Hướng dẫn sử dụng" title="Hướng dẫn"><Icon name="help" /></button>
          <button className="icon-button" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Đổi giao diện sáng tối" title="Đổi giao diện"><Icon name={theme === "dark" ? "sun" : "moon"} /></button>
          <div className="menu-wrap">
            <button className="icon-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở menu dữ liệu" aria-expanded={menuOpen}><Icon name="more" /></button>
            {menuOpen && <div className="data-menu"><button type="button" onClick={exportData}><Icon name="download" />Xuất file sao lưu</button><button type="button" onClick={() => importRef.current?.click()}><Icon name="upload" />Nhập file sao lưu</button><button type="button" className="danger-item" onClick={clearCompleted}><Icon name="trash" />Xóa việc đã xong</button></div>}
          </div>
          <input ref={importRef} type="file" accept="application/json,.json" onChange={importData} hidden />
        </div>
      </header>

      <section className="content">
        <section className="intro-row"><div><p className="eyebrow">Danh sách cá nhân</p><h1>Hôm nay cần làm gì?</h1><p className="intro-copy">Ghi việc trong vài giây, tìm lại tức thì và đổi trạng thái chỉ với một lần bấm.</p></div><div className="date-badge"><Icon name="calendar" /><span>{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }).format(new Date())}</span></div></section>

        <form className="quick-add" onSubmit={addQuickTask}>
          <div className="quick-input-wrap"><Icon name="plus" size={21} /><input ref={quickInputRef} value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder="Nhập việc cần làm…  Ví dụ: Kiểm tra dữ liệu #DataCheck @homnay !cao" aria-label="Nhập nhanh công việc" /></div>
          <button className="primary-button quick-submit" type="submit">Thêm việc</button><button className="secondary-button quick-detail" type="button" onClick={openCreate}>Chi tiết</button>
        </form>
        <p className="quick-hint"><kbd>Enter</kbd> để lưu · Hỗ trợ <code>#nhãn</code>, <code>@homnay</code>, <code>@ngaymai</code>, <code>!cao</code></p>

        <section className="stats-grid" aria-label="Tổng quan công việc">
          <button className={`stat-card stat-all ${filter === "all" ? "active" : ""}`} type="button" onClick={() => setFilter("all")}><span className="stat-label">Tất cả</span><strong>{counts.all}</strong><span className="stat-caption">công việc</span></button>
          <button className={`stat-card stat-todo ${filter === "todo" ? "active" : ""}`} type="button" onClick={() => setFilter("todo")}><span className="stat-label">Cần làm</span><strong>{counts.todo}</strong><span className="stat-caption">đang chờ</span></button>
          <button className={`stat-card stat-doing ${filter === "doing" ? "active" : ""}`} type="button" onClick={() => setFilter("doing")}><span className="stat-label">Đang làm</span><strong>{counts.doing}</strong><span className="stat-caption">đang xử lý</span></button>
          <button className={`stat-card stat-done ${filter === "done" ? "active" : ""}`} type="button" onClick={() => setFilter("done")}><span className="stat-label">Hoàn thành</span><strong>{counts.done}</strong><span className="stat-caption">đã xử lý</span></button>
        </section>

        <section className="list-panel">
          <div className="list-toolbar">
            <div className="filter-scroll" aria-label="Lọc công việc">{FILTERS.map((item) => <button key={item.value} className={`filter-chip ${filter === item.value ? "active" : ""}`} type="button" onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
            <div className="search-box"><Icon name="search" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm công việc…" aria-label="Tìm công việc" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Xóa nội dung tìm kiếm"><Icon name="x" size={16} /></button>}</div>
          </div>
          <div className="result-bar"><span><strong>{visibleTasks.length}</strong> kết quả</span>{(query || filter !== "all") && <button type="button" onClick={() => { setQuery(""); setFilter("all"); }}>Xóa bộ lọc</button>}</div>

          {!hydrated ? <div className="loading-list"><span className="spinner" /><span>Đang tải danh sách…</span></div> : visibleTasks.length === 0 ? (
            <div className="empty-state"><div className="empty-icon"><Icon name="inbox" size={30} /></div><h2>{tasks.length ? "Không tìm thấy công việc" : "Danh sách đang trống"}</h2><p>{tasks.length ? "Thử thay đổi từ khóa hoặc bộ lọc." : "Nhập công việc đầu tiên ở phía trên để bắt đầu."}</p>{!tasks.length && <button className="secondary-button" type="button" onClick={() => quickInputRef.current?.focus()}>Thêm công việc đầu tiên</button>}</div>
          ) : <div className="task-list">{visibleTasks.map((task) => {
            const overdue = !!task.dueDate && task.dueDate < localDate() && task.status !== "done";
            return <article className={`task-card priority-${task.priority} status-${task.status}`} key={task.id}>
              <button className="task-check" type="button" onClick={() => updateStatus(task.id, task.status === "done" ? "todo" : "done")} aria-label={task.status === "done" ? "Đánh dấu chưa hoàn thành" : "Đánh dấu hoàn thành"}>{task.status === "done" && <Icon name="check" size={16} />}{task.status === "doing" && <span className="doing-dot" />}</button>
              <div className="task-main" onDoubleClick={() => openEdit(task)}><div className="task-title-row"><h3>{task.title}</h3>{task.priority === "high" && <span className="priority-badge">Ưu tiên cao</span>}</div>{task.note && <p className="task-note">{task.note}</p>}<div className="task-meta">{task.dueDate && <span className={overdue ? "overdue" : ""}><Icon name="calendar" size={14} />{overdue ? `Quá hạn · ${formatDate(task.dueDate)}` : formatDate(task.dueDate)}</span>}{task.tags.map((tag) => <span className="tag" key={tag}><Icon name="tag" size={13} />{tag}</span>)}{!task.dueDate && !task.tags.length && <span>Ưu tiên {PRIORITY_LABEL[task.priority].toLocaleLowerCase("vi")}</span>}</div></div>
              <div className="task-actions"><button className={`status-button status-${task.status}`} type="button" onClick={() => cycleStatus(task)} title="Bấm để chuyển trạng thái">{STATUS_LABEL[task.status]}</button><button className="task-icon-button" type="button" onClick={() => openEdit(task)} aria-label="Chỉnh sửa công việc" title="Chỉnh sửa"><Icon name="edit" size={17} /></button><button className="task-icon-button delete" type="button" onClick={() => removeTask(task)} aria-label="Xóa công việc" title="Xóa"><Icon name="trash" size={17} /></button></div>
            </article>;
          })}</div>}
        </section>
      </section>

      <footer><span>Cập nhật: 19/08/2026</span><strong>© 2026 HuyVo</strong><span>Working-List V1.0.0</span></footer>

      {modalOpen && <div className="modal-backdrop" role="presentation"><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-header"><div><p className="eyebrow">Công việc</p><h2 id="task-modal-title">{editing ? "Chỉnh sửa công việc" : "Thêm công việc mới"}</h2></div><button className="icon-button" type="button" onClick={() => setModalOpen(false)} aria-label="Đóng"><Icon name="x" /></button></div><form onSubmit={saveTask} className="task-form">
        <label className="full-field"><span>Nội dung công việc <b>*</b></span><input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Nhập nội dung cần làm" required /></label>
        <label className="full-field"><span>Ghi chú</span><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Thông tin bổ sung, kết quả cần đạt…" rows={4} /></label>
        <label><span>Mức ưu tiên</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option></select></label>
        <label><span>Hạn xử lý</span><input type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></label>
        <label className="full-field"><span>Nhãn công việc</span><input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="Config, UAT, Support (cách nhau bằng dấu phẩy)" /></label>
        <div className="modal-actions full-field"><button className="secondary-button" type="button" onClick={() => setModalOpen(false)}>Hủy</button><button className="primary-button" type="submit">{editing ? "Lưu thay đổi" : "Thêm công việc"}</button></div>
      </form></section></div>}

      {helpOpen && <div className="modal-backdrop" role="presentation"><section className="modal-card help-card" role="dialog" aria-modal="true" aria-labelledby="help-title"><div className="modal-header"><div><p className="eyebrow">Hướng dẫn nhanh</p><h2 id="help-title">Dùng Working-List trong vài giây</h2></div><button className="icon-button" type="button" onClick={() => setHelpOpen(false)} aria-label="Đóng"><Icon name="x" /></button></div><div className="help-grid">
        <article><span>01</span><div><h3>Nhập nhanh</h3><p>Gõ nội dung ở ô đầu trang và nhấn Enter. Dùng <code>#nhãn</code>, <code>@homnay</code>, <code>@ngaymai</code>, <code>!cao</code> khi cần.</p></div></article>
        <article><span>02</span><div><h3>Đổi trạng thái</h3><p>Bấm nút trạng thái để chuyển lần lượt Cần làm → Đang làm → Đã xong. Bấm checkbox để hoàn thành ngay.</p></div></article>
        <article><span>03</span><div><h3>Tìm tức thì</h3><p>Nhấn phím <kbd>/</kbd> hoặc dùng ô tìm kiếm. Có thể tìm theo nội dung, ghi chú và nhãn.</p></div></article>
        <article><span>04</span><div><h3>Sao lưu dữ liệu</h3><p>Mở menu ba chấm để xuất file JSON. Dùng file này để khôi phục hoặc chuyển dữ liệu sang trình duyệt khác.</p></div></article>
      </div><div className="shortcut-row"><span><kbd>N</kbd> Nhập nhanh</span><span><kbd>/</kbd> Tìm kiếm</span><span><kbd>Esc</kbd> Đóng</span></div></section></div>}

      {toast && <div className="toast" role="status"><span>{toast}</span>{deletedTask && toast === "Đã xóa công việc" && <button type="button" onClick={undoDelete}>Hoàn tác</button>}<button type="button" className="toast-close" onClick={() => setToast("")} aria-label="Đóng"><Icon name="x" size={15} /></button></div>}
    </main>
  );
}
