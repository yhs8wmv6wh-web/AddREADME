const STORAGE_KEY = "readingProgressBooks";

const form = document.getElementById("add-book-form");
const bookList = document.getElementById("book-list");
const emptyHint = document.getElementById("empty-hint");

function loadBooks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveBooks(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function clampCurrentPage(currentPage, totalPages) {
  return Math.min(Math.max(currentPage, 0), totalPages);
}

function percentFor(book) {
  return Math.round((book.currentPage / book.totalPages) * 100);
}

function render() {
  const books = loadBooks();
  emptyHint.style.display = books.length === 0 ? "block" : "none";
  bookList.innerHTML = "";

  books.forEach((book) => {
    const percent = percentFor(book);

    const card = document.createElement("div");
    card.className = "book-card";

    const title = document.createElement("h2");
    title.textContent = book.title;

    const pie = document.createElement("div");
    pie.className = "pie-chart";
    pie.style.background = `conic-gradient(var(--accent) 0% ${percent}%, var(--track) ${percent}% 100%)`;

    const pieInner = document.createElement("div");
    pieInner.className = "pie-chart-inner";
    pieInner.textContent = `${percent}%`;
    pie.appendChild(pieInner);

    const meta = document.createElement("div");
    meta.className = "book-meta";
    meta.textContent = `Seite ${book.currentPage} von ${book.totalPages}`;

    const editor = document.createElement("div");
    editor.className = "page-editor";

    const label = document.createElement("label");
    label.textContent = "Aktuelle Seite:";
    label.htmlFor = `current-${book.id}`;

    const input = document.createElement("input");
    input.type = "number";
    input.id = `current-${book.id}`;
    input.min = "0";
    input.max = String(book.totalPages);
    input.value = String(book.currentPage);
    input.addEventListener("change", () => {
      const updatedBooks = loadBooks();
      const target = updatedBooks.find((b) => b.id === book.id);
      if (!target) return;
      target.currentPage = clampCurrentPage(Number(input.value) || 0, target.totalPages);
      saveBooks(updatedBooks);
      render();
    });

    editor.appendChild(label);
    editor.appendChild(input);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Buch löschen";
    deleteBtn.addEventListener("click", () => {
      const remainingBooks = loadBooks().filter((b) => b.id !== book.id);
      saveBooks(remainingBooks);
      render();
    });

    card.appendChild(title);
    card.appendChild(pie);
    card.appendChild(meta);
    card.appendChild(editor);
    card.appendChild(deleteBtn);
    bookList.appendChild(card);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const totalPages = Number(document.getElementById("totalPages").value);
  let currentPage = Number(document.getElementById("currentPage").value);

  if (!title || !totalPages || totalPages <= 0) {
    return;
  }

  currentPage = clampCurrentPage(currentPage || 0, totalPages);

  const books = loadBooks();
  books.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    title,
    totalPages,
    currentPage,
  });
  saveBooks(books);
  form.reset();
  document.getElementById("currentPage").value = "0";
  render();
});

render();
